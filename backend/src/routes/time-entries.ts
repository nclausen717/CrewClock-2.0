import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull } from 'drizzle-orm';
import { timeEntries, employees, jobSites } from '../db/schema.js';
import { requireAuthWithRole } from '../utils/auth.js';

export function registerTimeEntriesRoutes(app: App) {
  /**
   * GET /api/employees/for-clock-in
   * Returns all regular employees plus the authenticated crew leader themselves
   */
  app.fastify.get(
    '/api/employees/for-clock-in',
    {
      schema: {
        description: 'Get all regular employees and authenticated crew leader for clock-in',
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
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching employees for clock-in');

      try {
        // Only crew leaders can access this endpoint
        if (session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id, role: session.user.role }, 'Non-crew-leader attempted to access clock-in employee list');
          return reply.status(403).send({ error: 'Only crew leaders can clock in employees' });
        }

        // Get all non-crew-leader employees from the same company
        const regularEmployees = await app.db
          .select({
            id: employees.id,
            name: employees.name,
          })
          .from(employees)
          .where(
            and(
              eq(employees.isCrewLeader, false),
              eq(employees.companyId, session.user.companyId)
            )
          );

        // Get the authenticated crew leader if they exist as an employee in the same company
        const crewLeader = await app.db
          .select({
            id: employees.id,
            name: employees.name,
          })
          .from(employees)
          .where(
            and(
              eq(employees.id, session.user.id),
              eq(employees.companyId, session.user.companyId)
            )
          );

        // Combine both lists (crew leader will only be included if they are an employee)
        const employeeList = [...regularEmployees];
        if (crewLeader.length > 0) {
          employeeList.push(crewLeader[0]);
        }

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
            workDescription: { type: 'string' },
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
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { employeeIds, jobSiteId, workDescription } = request.body as {
        employeeIds: string[];
        jobSiteId: string;
        workDescription?: string;
      };

      app.logger.info(
        { userId: session.user.id, employeeCount: employeeIds.length, jobSiteId },
        'Clocking in employees'
      );

      try {
        // Validate that user is a crew leader from the same company
        const userEmployee = await app.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, session.user.id),
              eq(employees.companyId, session.user.companyId)
            )
          );

        const isCrewLeader = userEmployee.length > 0 && userEmployee[0].isCrewLeader;

        // If not a crew leader employee, check if user is an admin or has crew lead role
        if (!isCrewLeader && session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id }, 'Non-crew-leader user attempted clock-in');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Validate job site exists and belongs to the same company
        const sites = await app.db
          .select()
          .from(jobSites)
          .where(
            and(
              eq(jobSites.id, jobSiteId),
              eq(jobSites.companyId, session.user.companyId)
            )
          );

        if (sites.length === 0) {
          app.logger.warn({ jobSiteId }, 'Job site not found or access denied');
          return reply.status(400).send({ error: 'Job site not found' });
        }

        // Create clock-in entries
        const entries = [];
        const now = new Date();

        for (const employeeId of employeeIds) {
          // Validate employee exists and belongs to the same company
          const emps = await app.db
            .select()
            .from(employees)
            .where(
              and(
                eq(employees.id, employeeId),
                eq(employees.companyId, session.user.companyId)
              )
            );

          if (emps.length === 0) {
            app.logger.warn({ employeeId }, 'Employee not found or access denied');
            return reply.status(400).send({ error: `Employee ${employeeId} not found` });
          }

          const [entry] = await app.db
            .insert(timeEntries)
            .values({
              employeeId,
              jobSiteId,
              clockInTime: now,
              clockedInBy: session.user.id,
              companyId: session.user.companyId,
              workDescription: workDescription || null,
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
            workDescription: { type: 'string' },
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
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { employeeIds, workDescription } = request.body as {
        employeeIds: string[];
        workDescription?: string;
      };

      app.logger.info({ userId: session.user.id, employeeCount: employeeIds.length }, 'Clocking out employees');

      try {
        // Validate that user is a crew leader from the same company
        const userEmployee = await app.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, session.user.id),
              eq(employees.companyId, session.user.companyId)
            )
          );

        const isCrewLeader = userEmployee.length > 0 && userEmployee[0].isCrewLeader;

        // If not a crew leader employee, check if user is a crew_lead role
        if (!isCrewLeader && session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id }, 'Non-crew-leader user attempted clock-out');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        const entries = [];
        const now = new Date();

        for (const employeeId of employeeIds) {
          // Find active time entry for this employee clocked in by current user in the same company
          const activeEntries = await app.db
            .select()
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.employeeId, employeeId),
                isNull(timeEntries.clockOutTime),
                eq(timeEntries.clockedInBy, session.user.id),
                eq(timeEntries.companyId, session.user.companyId)
              )
            );

          if (activeEntries.length > 0) {
            const [updatedEntry] = await app.db
              .update(timeEntries)
              .set({
                clockOutTime: now,
                workDescription: workDescription || activeEntries[0].workDescription,
              })
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
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching active time entries');

      try {
        // Get all active entries clocked in by this user in the same company
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
              isNull(timeEntries.clockOutTime),
              eq(timeEntries.companyId, session.user.companyId)
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

  /**
   * POST /api/time-entries/clock-in-self
   * Clock in the authenticated crew leader
   */
  app.fastify.post(
    '/api/time-entries/clock-in-self',
    {
      schema: {
        description: 'Clock in the authenticated crew leader',
        tags: ['time-tracking'],
        body: {
          type: 'object',
          required: ['jobSiteId'],
          properties: {
            jobSiteId: { type: 'string' },
            workDescription: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              timeEntry: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  jobSiteId: { type: 'string' },
                  clockInTime: { type: 'string' },
                  clockOutTime: { type: ['string', 'null'] },
                  workDescription: { type: ['string', 'null'] },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { jobSiteId, workDescription } = request.body as {
        jobSiteId: string;
        workDescription?: string;
      };

      app.logger.info({ userId: session.user.id, jobSiteId }, 'Crew leader clocking in');

      try {
        // Only crew leads can clock in themselves
        if (session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id, role: session.user.role }, 'Non-crew-leader attempted self clock-in');
          return reply.status(403).send({ error: 'Only crew leaders can clock in' });
        }

        // Validate job site exists and belongs to the same company
        const sites = await app.db
          .select()
          .from(jobSites)
          .where(
            and(
              eq(jobSites.id, jobSiteId),
              eq(jobSites.companyId, session.user.companyId)
            )
          );

        if (sites.length === 0) {
          app.logger.warn({ jobSiteId }, 'Job site not found or access denied');
          return reply.status(400).send({ error: 'Job site not found' });
        }

        // Create clock-in entry with companyId
        const now = new Date();

        const [entry] = await app.db
          .insert(timeEntries)
          .values({
            employeeId: session.user.id,
            jobSiteId,
            clockInTime: now,
            clockedInBy: session.user.id,
            companyId: session.user.companyId,
            workDescription: workDescription || null,
          })
          .returning();

        app.logger.info({ userId: session.user.id, entryId: entry.id }, 'Crew leader clocked in successfully');

        return {
          success: true,
          timeEntry: {
            id: entry.id,
            userId: entry.employeeId,
            jobSiteId: entry.jobSiteId,
            clockInTime: entry.clockInTime,
            clockOutTime: entry.clockOutTime,
            workDescription: entry.workDescription,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, jobSiteId }, 'Failed to clock in crew leader');
        throw error;
      }
    }
  );

  /**
   * POST /api/time-entries/clock-out-self
   * Clock out the authenticated crew leader
   */
  app.fastify.post(
    '/api/time-entries/clock-out-self',
    {
      schema: {
        description: 'Clock out the authenticated crew leader',
        tags: ['time-tracking'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              timeEntry: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  jobSiteId: { type: 'string' },
                  clockInTime: { type: 'string' },
                  clockOutTime: { type: 'string' },
                  workDescription: { type: ['string', 'null'] },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Crew leader clocking out');

      try {
        // Only crew leads can clock out themselves
        if (session.user.role !== 'crew_lead') {
          app.logger.warn({ userId: session.user.id, role: session.user.role }, 'Non-crew-leader attempted self clock-out');
          return reply.status(403).send({ error: 'Only crew leaders can clock out' });
        }

        // Find active time entry for this crew leader in the same company
        const activeEntries = await app.db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.employeeId, session.user.id),
              isNull(timeEntries.clockOutTime),
              eq(timeEntries.companyId, session.user.companyId)
            )
          );

        if (activeEntries.length === 0) {
          app.logger.warn({ userId: session.user.id }, 'No active clock-in found for crew leader');
          return reply.status(400).send({ error: 'No active clock-in found' });
        }

        // Update the time entry with clock-out time
        const now = new Date();

        const [updatedEntry] = await app.db
          .update(timeEntries)
          .set({
            clockOutTime: now,
          })
          .where(eq(timeEntries.id, activeEntries[0].id))
          .returning();

        app.logger.info({ userId: session.user.id, entryId: updatedEntry.id }, 'Crew leader clocked out successfully');

        return {
          success: true,
          timeEntry: {
            id: updatedEntry.id,
            userId: updatedEntry.employeeId,
            jobSiteId: updatedEntry.jobSiteId,
            clockInTime: updatedEntry.clockInTime,
            clockOutTime: updatedEntry.clockOutTime,
            workDescription: updatedEntry.workDescription,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to clock out crew leader');
        throw error;
      }
    }
  );
}
