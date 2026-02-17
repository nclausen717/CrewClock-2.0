import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull, or, count, gte, lte } from 'drizzle-orm';
import { crews, employees, timeEntries, jobSites } from '../db/schema.js';
import { requireAuthWithRole } from '../utils/auth.js';

export function registerCrewRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/crews
   * Returns all crews with crew leader info
   */
  app.fastify.get(
    '/api/crews',
    {
      schema: {
        description: 'Get all crews',
        tags: ['crews'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                crewLeaderId: { type: ['string', 'null'] },
                crewLeaderName: { type: ['string', 'null'] },
                memberCount: { type: 'integer' },
                createdAt: { type: 'string' },
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

      app.logger.info({ userId: session.user.id }, 'Fetching crews');

      try {
        // Only admins can view crews
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to view crews');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get all crews for the authenticated company
        const allCrews = await app.db
          .select({
            id: crews.id,
            name: crews.name,
            crewLeaderId: crews.crewLeaderId,
            createdAt: crews.createdAt,
          })
          .from(crews)
          .where(eq(crews.companyId, session.user.companyId));

        // Fetch crew leader names and member counts
        const crewsWithDetails = await Promise.all(
          allCrews.map(async (crew) => {
            let crewLeaderName = null;

            if (crew.crewLeaderId) {
              const leader = await app.db
                .select({ name: employees.name })
                .from(employees)
                .where(
                  and(
                    eq(employees.id, crew.crewLeaderId),
                    eq(employees.companyId, session.user.companyId)
                  )
                );

              if (leader.length > 0) {
                crewLeaderName = leader[0].name;
              }
            }

            // Count members
            const memberCountResult = await app.db
              .select({ count: count() })
              .from(employees)
              .where(
                and(
                  eq(employees.crewId, crew.id),
                  eq(employees.companyId, session.user.companyId)
                )
              );

            const memberCount = memberCountResult[0]?.count || 0;

            return {
              id: crew.id,
              name: crew.name,
              crewLeaderId: crew.crewLeaderId,
              crewLeaderName,
              memberCount,
              createdAt: crew.createdAt,
            };
          })
        );

        app.logger.info({ userId: session.user.id, count: crewsWithDetails.length }, 'Crews fetched');

        return crewsWithDetails;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch crews');
        throw error;
      }
    }
  );

  /**
   * POST /api/crews
   * Create a new crew
   */
  app.fastify.post(
    '/api/crews',
    {
      schema: {
        description: 'Create a new crew',
        tags: ['crews'],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            crewLeaderId: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              crewLeaderId: { type: ['string', 'null'] },
              crewLeaderName: { type: ['string', 'null'] },
              memberCount: { type: 'integer' },
              createdAt: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { name, crewLeaderId } = request.body as {
        name: string;
        crewLeaderId?: string;
      };

      app.logger.info({ userId: session.user.id, name }, 'Creating crew');

      try {
        // Only admins can create crews
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to create crew');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // If crewLeaderId is provided, validate it exists and is a crew leader in the same company
        if (crewLeaderId) {
          const leader = await app.db
            .select()
            .from(employees)
            .where(
              and(
                eq(employees.id, crewLeaderId),
                eq(employees.companyId, session.user.companyId)
              )
            );

          if (leader.length === 0) {
            app.logger.warn({ crewLeaderId }, 'Crew leader not found');
            return reply.status(400).send({ error: 'Crew leader not found' });
          }

          if (!leader[0].isCrewLeader) {
            app.logger.warn({ crewLeaderId }, 'Employee is not a crew leader');
            return reply.status(400).send({ error: 'Employee is not a crew leader' });
          }
        }

        // Create crew with company_id
        const [newCrew] = await app.db
          .insert(crews)
          .values({
            name,
            crewLeaderId: crewLeaderId || null,
            createdBy: session.user.id,
            companyId: session.user.companyId,
          })
          .returning();

        let crewLeaderName = null;
        if (crewLeaderId) {
          const leader = await app.db
            .select({ name: employees.name })
            .from(employees)
            .where(
              and(
                eq(employees.id, crewLeaderId),
                eq(employees.companyId, session.user.companyId)
              )
            );

          if (leader.length > 0) {
            crewLeaderName = leader[0].name;
          }
        }

        app.logger.info({ userId: session.user.id, crewId: newCrew.id }, 'Crew created successfully');

        return reply.status(201).send({
          id: newCrew.id,
          name: newCrew.name,
          crewLeaderId: newCrew.crewLeaderId,
          crewLeaderName,
          memberCount: 0,
          createdAt: newCrew.createdAt,
        });
      } catch (error: any) {
        app.logger.error({ err: error, userId: session.user.id, name }, 'Failed to create crew');

        if (error.message?.includes('duplicate') || error.code === '23505') {
          return reply.status(409).send({ error: 'A crew with this name already exists' });
        }

        throw error;
      }
    }
  );

  /**
   * PUT /api/crews/:id
   * Update a crew
   */
  app.fastify.put(
    '/api/crews/:id',
    {
      schema: {
        description: 'Update a crew',
        tags: ['crews'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            crewLeaderId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              crewLeaderId: { type: ['string', 'null'] },
              crewLeaderName: { type: ['string', 'null'] },
              memberCount: { type: 'integer' },
              createdAt: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const { name, crewLeaderId } = request.body as {
        name?: string;
        crewLeaderId?: string;
      };

      app.logger.info({ userId: session.user.id, crewId: id }, 'Updating crew');

      try {
        // Only admins can update crews
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to update crew');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get existing crew and verify company ownership
        const existingCrews = await app.db
          .select()
          .from(crews)
          .where(
            and(
              eq(crews.id, id),
              eq(crews.companyId, session.user.companyId)
            )
          );

        if (existingCrews.length === 0) {
          app.logger.warn({ crewId: id }, 'Crew not found or access denied');
          return reply.status(404).send({ error: 'Crew not found' });
        }

        const existingCrew = existingCrews[0];

        // If crewLeaderId is provided, validate it and ensure it's in the same company
        if (crewLeaderId) {
          const leader = await app.db
            .select()
            .from(employees)
            .where(
              and(
                eq(employees.id, crewLeaderId),
                eq(employees.companyId, session.user.companyId)
              )
            );

          if (leader.length === 0) {
            app.logger.warn({ crewLeaderId }, 'Crew leader not found');
            return reply.status(400).send({ error: 'Crew leader not found' });
          }

          if (!leader[0].isCrewLeader) {
            app.logger.warn({ crewLeaderId }, 'Employee is not a crew leader');
            return reply.status(400).send({ error: 'Employee is not a crew leader' });
          }
        }

        // Update crew
        const [updatedCrew] = await app.db
          .update(crews)
          .set({
            name: name !== undefined ? name : existingCrew.name,
            crewLeaderId: crewLeaderId !== undefined ? crewLeaderId : existingCrew.crewLeaderId,
          })
          .where(eq(crews.id, id))
          .returning();

        let crewLeaderName = null;
        if (updatedCrew.crewLeaderId) {
          const leader = await app.db
            .select({ name: employees.name })
            .from(employees)
            .where(
              and(
                eq(employees.id, updatedCrew.crewLeaderId),
                eq(employees.companyId, session.user.companyId)
              )
            );

          if (leader.length > 0) {
            crewLeaderName = leader[0].name;
          }
        }

        // Count members in the same company
        const memberCountResult = await app.db
          .select({ count: count() })
          .from(employees)
          .where(
            and(
              eq(employees.crewId, id),
              eq(employees.companyId, session.user.companyId)
            )
          );

        const memberCount = memberCountResult[0]?.count || 0;

        app.logger.info({ userId: session.user.id, crewId: id }, 'Crew updated successfully');

        return {
          id: updatedCrew.id,
          name: updatedCrew.name,
          crewLeaderId: updatedCrew.crewLeaderId,
          crewLeaderName,
          memberCount,
          createdAt: updatedCrew.createdAt,
        };
      } catch (error: any) {
        app.logger.error({ err: error, userId: session.user.id, crewId: id }, 'Failed to update crew');

        if (error.message?.includes('duplicate') || error.code === '23505') {
          return reply.status(409).send({ error: 'A crew with this name already exists' });
        }

        throw error;
      }
    }
  );

  /**
   * DELETE /api/crews/:id
   * Delete a crew
   */
  app.fastify.delete(
    '/api/crews/:id',
    {
      schema: {
        description: 'Delete a crew',
        tags: ['crews'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ userId: session.user.id, crewId: id }, 'Deleting crew');

      try {
        // Only admins can delete crews
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to delete crew');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get existing crew and verify company ownership
        const existingCrews = await app.db
          .select()
          .from(crews)
          .where(
            and(
              eq(crews.id, id),
              eq(crews.companyId, session.user.companyId)
            )
          );

        if (existingCrews.length === 0) {
          app.logger.warn({ crewId: id }, 'Crew not found or access denied');
          return reply.status(404).send({ error: 'Crew not found' });
        }

        const existingCrew = existingCrews[0];

        // Set employees' crewId to null (cascade behavior) - only for employees in the same company
        await app.db
          .update(employees)
          .set({ crewId: null })
          .where(
            and(
              eq(employees.crewId, id),
              eq(employees.companyId, session.user.companyId)
            )
          );

        // Delete crew
        await app.db.delete(crews).where(eq(crews.id, id));

        app.logger.info({ userId: session.user.id, crewId: id }, 'Crew deleted successfully');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, crewId: id }, 'Failed to delete crew');
        throw error;
      }
    }
  );

  /**
   * GET /api/crews/:id/members
   * Get crew members
   */
  app.fastify.get(
    '/api/crews/:id/members',
    {
      schema: {
        description: 'Get crew members',
        tags: ['crews'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                isCrewLeader: { type: 'boolean' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ userId: session.user.id, crewId: id }, 'Fetching crew members');

      try {
        // Only admins can view crew members
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to view crew members');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Verify crew exists and belongs to the same company
        const crewList = await app.db
          .select()
          .from(crews)
          .where(
            and(
              eq(crews.id, id),
              eq(crews.companyId, session.user.companyId)
            )
          );

        if (crewList.length === 0) {
          app.logger.warn({ crewId: id }, 'Crew not found or access denied');
          return reply.status(404).send({ error: 'Crew not found' });
        }

        // Get members from the same company
        const members = await app.db
          .select({
            id: employees.id,
            name: employees.name,
            isCrewLeader: employees.isCrewLeader,
          })
          .from(employees)
          .where(
            and(
              eq(employees.crewId, id),
              eq(employees.companyId, session.user.companyId)
            )
          );

        app.logger.info({ userId: session.user.id, crewId: id, count: members.length }, 'Crew members fetched');

        return members;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, crewId: id }, 'Failed to fetch crew members');
        throw error;
      }
    }
  );

  /**
   * POST /api/crews/:id/members
   * Add employee to crew
   */
  app.fastify.post(
    '/api/crews/:id/members',
    {
      schema: {
        description: 'Add employee to crew',
        tags: ['crews'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['employeeId'],
          properties: {
            employeeId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              isCrewLeader: { type: 'boolean' },
              crewId: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const { employeeId } = request.body as { employeeId: string };

      app.logger.info({ userId: session.user.id, crewId: id, employeeId }, 'Adding employee to crew');

      try {
        // Only admins can manage crew members
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to add crew member');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Verify crew exists and belongs to the same company
        const crewList = await app.db
          .select()
          .from(crews)
          .where(
            and(
              eq(crews.id, id),
              eq(crews.companyId, session.user.companyId)
            )
          );

        if (crewList.length === 0) {
          app.logger.warn({ crewId: id }, 'Crew not found or access denied');
          return reply.status(404).send({ error: 'Crew not found' });
        }

        // Verify employee exists and belongs to the same company
        const empList = await app.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, employeeId),
              eq(employees.companyId, session.user.companyId)
            )
          );

        if (empList.length === 0) {
          app.logger.warn({ employeeId }, 'Employee not found or access denied');
          return reply.status(404).send({ error: 'Employee not found' });
        }

        // Update employee's crew
        const [updatedEmployee] = await app.db
          .update(employees)
          .set({ crewId: id })
          .where(eq(employees.id, employeeId))
          .returning();

        app.logger.info(
          { userId: session.user.id, crewId: id, employeeId },
          'Employee added to crew successfully'
        );

        return {
          id: updatedEmployee.id,
          name: updatedEmployee.name,
          isCrewLeader: updatedEmployee.isCrewLeader,
          crewId: updatedEmployee.crewId,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, crewId: id, employeeId },
          'Failed to add employee to crew'
        );
        throw error;
      }
    }
  );

  /**
   * DELETE /api/crews/:id/members/:employeeId
   * Remove employee from crew
   */
  app.fastify.delete(
    '/api/crews/:id/members/:employeeId',
    {
      schema: {
        description: 'Remove employee from crew',
        tags: ['crews'],
        params: {
          type: 'object',
          required: ['id', 'employeeId'],
          properties: {
            id: { type: 'string' },
            employeeId: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthWithRole(app, request, reply);
      if (!session) return;

      const { id, employeeId } = request.params as { id: string; employeeId: string };

      app.logger.info({ userId: session.user.id, crewId: id, employeeId }, 'Removing employee from crew');

      try {
        // Only admins can manage crew members
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to remove crew member');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Verify crew exists and belongs to the same company
        const crewList = await app.db
          .select()
          .from(crews)
          .where(
            and(
              eq(crews.id, id),
              eq(crews.companyId, session.user.companyId)
            )
          );

        if (crewList.length === 0) {
          app.logger.warn({ crewId: id }, 'Crew not found or access denied');
          return reply.status(404).send({ error: 'Crew not found' });
        }

        // Verify employee exists, belongs to the same company, and is in the crew
        const empList = await app.db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, employeeId),
              eq(employees.companyId, session.user.companyId)
            )
          );

        if (empList.length === 0) {
          app.logger.warn({ employeeId }, 'Employee not found or access denied');
          return reply.status(404).send({ error: 'Employee not found' });
        }

        if (empList[0].crewId !== id) {
          app.logger.warn({ employeeId, crewId: id }, 'Employee not in crew');
          return reply.status(404).send({ error: 'Employee not in crew' });
        }

        // Remove employee from crew
        await app.db
          .update(employees)
          .set({ crewId: null })
          .where(eq(employees.id, employeeId));

        app.logger.info(
          { userId: session.user.id, crewId: id, employeeId },
          'Employee removed from crew successfully'
        );

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, crewId: id, employeeId },
          'Failed to remove employee from crew'
        );
        throw error;
      }
    }
  );

  /**
   * GET /api/crews/dashboard
   * Returns live crew dashboard data
   */
  app.fastify.get(
    '/api/crews/dashboard',
    {
      schema: {
        description: 'Get crew dashboard data',
        tags: ['crews'],
        response: {
          200: {
            type: 'object',
            properties: {
              crews: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    crewId: { type: 'string' },
                    crewName: { type: 'string' },
                    crewLeaderId: { type: ['string', 'null'] },
                    crewLeaderName: { type: ['string', 'null'] },
                    members: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          employeeId: { type: 'string' },
                          employeeName: { type: 'string' },
                          isActive: { type: 'boolean' },
                          hoursToday: { type: 'number' },
                        },
                      },
                    },
                    totalHoursToday: { type: 'number' },
                  },
                },
              },
              individualEmployees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    employeeId: { type: 'string' },
                    employeeName: { type: 'string' },
                    jobSiteId: { type: 'string' },
                    jobSiteName: { type: 'string' },
                    isActive: { type: 'boolean' },
                    hoursToday: { type: 'number' },
                    clockInTime: { type: 'string' },
                  },
                },
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

      app.logger.info({ userId: session.user.id }, 'Fetching crew dashboard');

      try {
        // Only admins can view dashboard
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to view dashboard');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get all crews for the authenticated company
        const allCrews = await app.db
          .select({
            id: crews.id,
            name: crews.name,
            crewLeaderId: crews.crewLeaderId,
          })
          .from(crews)
          .where(eq(crews.companyId, session.user.companyId));

        // Get today's date range (UTC)
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setUTCHours(23, 59, 59, 999);

        // Build dashboard data
        const dashboardData = await Promise.all(
          allCrews.map(async (crew) => {
            let crewLeaderName = null;

            if (crew.crewLeaderId) {
              const leader = await app.db
                .select({ name: employees.name })
                .from(employees)
                .where(
                  and(
                    eq(employees.id, crew.crewLeaderId),
                    eq(employees.companyId, session.user.companyId)
                  )
                );

              if (leader.length > 0) {
                crewLeaderName = leader[0].name;
              }
            }

            // Get crew members from the same company
            const crewMembers = await app.db
              .select({
                id: employees.id,
                name: employees.name,
              })
              .from(employees)
              .where(
                and(
                  eq(employees.crewId, crew.id),
                  eq(employees.companyId, session.user.companyId)
                )
              );

            // Get today's time entries for each member
            const members = await Promise.all(
              crewMembers.map(async (member) => {
                // Get all entries for today for the employee in the same company
                const todayEntries = await app.db
                  .select({
                    clockInTime: timeEntries.clockInTime,
                    clockOutTime: timeEntries.clockOutTime,
                  })
                  .from(timeEntries)
                  .where(
                    and(
                      eq(timeEntries.employeeId, member.id),
                      eq(timeEntries.companyId, session.user.companyId),
                      gte(timeEntries.clockInTime, todayStart),
                      lte(timeEntries.clockInTime, todayEnd)
                    )
                  );

                // Calculate hours
                let totalHours = 0;
                let isActive = false;

                for (const entry of todayEntries) {
                  if (entry.clockOutTime) {
                    const hours =
                      (new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime()) /
                      (1000 * 60 * 60);
                    totalHours += hours;
                  } else {
                    // Currently clocked in
                    isActive = true;
                    const hours =
                      (new Date().getTime() - new Date(entry.clockInTime).getTime()) / (1000 * 60 * 60);
                    totalHours += hours;
                  }
                }

                return {
                  employeeId: member.id,
                  employeeName: member.name,
                  isActive,
                  hoursToday: Math.round(totalHours * 100) / 100,
                };
              })
            );

            // Calculate total hours
            const totalHoursToday = members.reduce((sum, m) => sum + m.hoursToday, 0);

            return {
              crewId: crew.id,
              crewName: crew.name,
              crewLeaderId: crew.crewLeaderId,
              crewLeaderName,
              members,
              totalHoursToday: Math.round(totalHoursToday * 100) / 100,
            };
          })
        );

        // Get individual employees (not assigned to any crew) from the same company
        const individualEmpsData = await app.db
          .select({
            employeeId: employees.id,
            employeeName: employees.name,
          })
          .from(employees)
          .where(
            and(
              isNull(employees.crewId),
              eq(employees.companyId, session.user.companyId)
            )
          );

        // Filter and build individual employee dashboard data
        const individualEmployees = await Promise.all(
          individualEmpsData.map(async (emp) => {
            // Get today's time entries with job site info for the same company
            const todayEntries = await app.db
              .select({
                id: timeEntries.id,
                clockInTime: timeEntries.clockInTime,
                clockOutTime: timeEntries.clockOutTime,
                jobSiteId: timeEntries.jobSiteId,
                jobSiteName: jobSites.name,
              })
              .from(timeEntries)
              .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
              .where(
                and(
                  eq(timeEntries.employeeId, emp.employeeId),
                  eq(timeEntries.companyId, session.user.companyId),
                  gte(timeEntries.clockInTime, todayStart),
                  lte(timeEntries.clockInTime, todayEnd)
                )
              );

            if (todayEntries.length === 0) {
              return null; // Skip employees with no activity today
            }

            // Calculate hours and determine if active
            let totalHours = 0;
            let isActive = false;
            let latestJobSiteId = '';
            let latestJobSiteName = '';
            let latestClockInTime = '';

            for (const entry of todayEntries) {
              if (entry.clockOutTime) {
                const hours =
                  (new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime()) /
                  (1000 * 60 * 60);
                totalHours += hours;
              } else {
                // Currently clocked in
                isActive = true;
                const hours =
                  (new Date().getTime() - new Date(entry.clockInTime).getTime()) / (1000 * 60 * 60);
                totalHours += hours;
                latestJobSiteId = entry.jobSiteId;
                latestJobSiteName = entry.jobSiteName;
                latestClockInTime = new Date(entry.clockInTime).toISOString();
              }
            }

            return {
              employeeId: emp.employeeId,
              employeeName: emp.employeeName,
              jobSiteId: latestJobSiteId,
              jobSiteName: latestJobSiteName,
              isActive,
              hoursToday: Math.round(totalHours * 100) / 100,
              clockInTime: isActive ? latestClockInTime : undefined,
            };
          })
        );

        // Filter out null entries (employees with no activity)
        const filteredIndividualEmployees = individualEmployees.filter((emp) => emp !== null);

        app.logger.info(
          { userId: session.user.id, crewCount: dashboardData.length, individualCount: filteredIndividualEmployees.length },
          'Dashboard data fetched'
        );

        return {
          crews: dashboardData,
          individualEmployees: filteredIndividualEmployees,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch dashboard');
        throw error;
      }
    }
  );
}
