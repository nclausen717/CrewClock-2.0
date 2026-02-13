import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull } from 'drizzle-orm';
import { timeEntries, employees, jobSites } from '../db/schema.js';

export function registerTimeEntriesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/employees/for-clock-in
   * Returns all employees (not crew leaders) for the crew leader to select
   */
  app.fastify.get(
    '/api/employees/for-clock-in',
    {
      schema: {
        description: 'Get all regular employees for clock-in',
        tags: ['time-tracking'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching employees for clock-in');

      try {
        // Get all non-crew-leader employees
        const employeeList = await app.db
          .select({
            id: employees.id,
            name: employees.name,
          })
          .from(employees)
          .where(eq(employees.isCrewLeader, false));

        app.logger.info({ userId: session.user.id, count: employeeList.length }, 'Employees for clock-in fetched');

        return employeeList;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch employees for clock-in');
        throw error;
      }
    }
  );

  /**
   * POST /api/time-entries/clock-in
   * Clocks in multiple employees at a job site
   */
  app.fastify.post(
    '/api/time-entries/clock-in',
    {
      schema: {
        description: 'Clock in multiple employees',
        tags: ['time-tracking'],
        body: {
          type: 'object',
          required: ['employeeIds', 'jobSiteId'],
          properties: {
            employeeIds: { type: 'array', items: { type: 'string' } },
            jobSiteId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    employeeId: { type: 'string' },
                    jobSiteId: { type: 'string' },
                    clockInTime: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { employeeIds, jobSiteId } = request.body as {
        employeeIds: string[];
        jobSiteId: string;
      };

      app.logger.info(
        { userId: session.user.id, employeeCount: employeeIds.length, jobSiteId },
        'Clocking in employees'
      );

      try {
        // Validate that user is a crew leader
        const userEmployee = await app.db
          .select()
          .from(employees)
          .where(eq(employees.id, session.user.id));

        const isCrewLeader = userEmployee.length > 0 && userEmployee[0].isCrewLeader;

        // If not a crew leader employee, check if user is an admin or has crew lead role
        if (!isCrewLeader && session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id }, 'Non-crew-leader user attempted clock-in');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Validate job site exists
        const sites = await app.db.select().from(jobSites).where(eq(jobSites.id, jobSiteId));

        if (sites.length === 0) {
          app.logger.warn({ jobSiteId }, 'Job site not found');
          return reply.status(400).send({ error: 'Job site not found' });
        }

        // Create clock-in entries
        const entries = [];
        const now = new Date();

        for (const employeeId of employeeIds) {
          // Validate employee exists
          const emps = await app.db.select().from(employees).where(eq(employees.id, employeeId));

          if (emps.length === 0) {
            app.logger.warn({ employeeId }, 'Employee not found');
            return reply.status(400).send({ error: `Employee ${employeeId} not found` });
          }

          const [entry] = await app.db
            .insert(timeEntries)
            .values({
              employeeId,
              jobSiteId,
              clockInTime: now,
              clockedInBy: session.user.id,
            })
            .returning();

          entries.push({
            id: entry.id,
            employeeId: entry.employeeId,
            jobSiteId: entry.jobSiteId,
            clockInTime: entry.clockInTime,
          });
        }

        app.logger.info(
          { userId: session.user.id, entryCount: entries.length },
          'Employees clocked in successfully'
        );

        return {
          success: true,
          entries,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, employeeIds, jobSiteId },
          'Failed to clock in employees'
        );
        throw error;
      }
    }
  );

  /**
   * POST /api/time-entries/clock-out
   * Clocks out multiple employees
   */
  app.fastify.post(
    '/api/time-entries/clock-out',
    {
      schema: {
        description: 'Clock out multiple employees',
        tags: ['time-tracking'],
        body: {
          type: 'object',
          required: ['employeeIds'],
          properties: {
            employeeIds: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    employeeId: { type: 'string' },
                    clockOutTime: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { employeeIds } = request.body as { employeeIds: string[] };

      app.logger.info({ userId: session.user.id, employeeCount: employeeIds.length }, 'Clocking out employees');

      try {
        // Validate that user is a crew leader
        const userEmployee = await app.db
          .select()
          .from(employees)
          .where(eq(employees.id, session.user.id));

        const isCrewLeader = userEmployee.length > 0 && userEmployee[0].isCrewLeader;

        // If not a crew leader employee, check if user is a crew_lead role
        if (!isCrewLeader && session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id }, 'Non-crew-leader user attempted clock-out');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        const entries = [];
        const now = new Date();

        for (const employeeId of employeeIds) {
          // Find active time entry for this employee clocked in by current user
          const activeEntries = await app.db
            .select()
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.employeeId, employeeId),
                isNull(timeEntries.clockOutTime),
                eq(timeEntries.clockedInBy, session.user.id)
              )
            );

          if (activeEntries.length > 0) {
            const [updatedEntry] = await app.db
              .update(timeEntries)
              .set({ clockOutTime: now })
              .where(eq(timeEntries.id, activeEntries[0].id))
              .returning();

            entries.push({
              id: updatedEntry.id,
              employeeId: updatedEntry.employeeId,
              clockOutTime: updatedEntry.clockOutTime,
            });
          }
        }

        app.logger.info(
          { userId: session.user.id, entryCount: entries.length },
          'Employees clocked out successfully'
        );

        return {
          success: true,
          entries,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, employeeIds }, 'Failed to clock out employees');
        throw error;
      }
    }
  );

  /**
   * GET /api/time-entries/active
   * Returns all currently clocked-in employees for the authenticated crew leader
   */
  app.fastify.get(
    '/api/time-entries/active',
    {
      schema: {
        description: 'Get active time entries for crew leader',
        tags: ['time-tracking'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                employeeId: { type: 'string' },
                employeeName: { type: 'string' },
                jobSiteId: { type: 'string' },
                jobSiteName: { type: 'string' },
                clockInTime: { type: 'string' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching active time entries');

      try {
        // Get all active entries clocked in by this user
        const activeEntries = await app.db
          .select({
            id: timeEntries.id,
            employeeId: timeEntries.employeeId,
            employeeName: employees.name,
            jobSiteId: timeEntries.jobSiteId,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              eq(timeEntries.clockedInBy, session.user.id),
              isNull(timeEntries.clockOutTime)
            )
          );

        app.logger.info({ userId: session.user.id, count: activeEntries.length }, 'Active entries fetched');

        return activeEntries;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch active entries');
        throw error;
      }
    }
  );
}
