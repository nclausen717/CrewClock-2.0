import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { jobSites } from '../db/schema.js';

export function registerJobSitesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/job-sites
   * Returns all active job sites created by the authenticated admin
   */
  app.fastify.get(
    '/api/job-sites',
    {
      schema: {
        description: 'Get all active job sites for authenticated admin',
        tags: ['job-sites'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                location: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
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

      app.logger.info({ userId: session.user.id }, 'Fetching job sites');

      try {
        // Only admins can view job sites
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to view job sites');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        const sites = await app.db
          .select({
            id: jobSites.id,
            name: jobSites.name,
            location: jobSites.location,
            isActive: jobSites.isActive,
            createdAt: jobSites.createdAt,
          })
          .from(jobSites)
          .where(eq(jobSites.createdBy, session.user.id));

        app.logger.info({ userId: session.user.id, count: sites.length }, 'Job sites fetched');

        return sites;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch job sites');
        throw error;
      }
    }
  );

  /**
   * POST /api/job-sites
   * Create a new job site
   */
  app.fastify.post(
    '/api/job-sites',
    {
      schema: {
        description: 'Create a new job site',
        tags: ['job-sites'],
        body: {
          type: 'object',
          required: ['name', 'location'],
          properties: {
            name: { type: 'string' },
            location: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              location: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { name, location } = request.body as { name: string; location: string };

      app.logger.info({ userId: session.user.id, name, location }, 'Creating job site');

      try {
        // Only admins can create job sites
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to create job site');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        const [newSite] = await app.db
          .insert(jobSites)
          .values({
            name,
            location,
            createdBy: session.user.id,
          })
          .returning();

        app.logger.info({ userId: session.user.id, jobSiteId: newSite.id }, 'Job site created successfully');

        return reply.status(201).send({
          id: newSite.id,
          name: newSite.name,
          location: newSite.location,
          isActive: newSite.isActive,
          createdAt: newSite.createdAt,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, name, location }, 'Failed to create job site');
        throw error;
      }
    }
  );

  /**
   * PUT /api/job-sites/:id
   * Update a job site (only if created by the authenticated admin)
   */
  app.fastify.put(
    '/api/job-sites/:id',
    {
      schema: {
        description: 'Update a job site',
        tags: ['job-sites'],
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
            location: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              location: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const { name, location, isActive } = request.body as {
        name?: string;
        location?: string;
        isActive?: boolean;
      };

      app.logger.info({ userId: session.user.id, jobSiteId: id }, 'Updating job site');

      try {
        // Only admins can update job sites
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to update job site');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get existing job site
        const existingSites = await app.db.select().from(jobSites).where(eq(jobSites.id, id));

        if (existingSites.length === 0) {
          app.logger.warn({ jobSiteId: id }, 'Job site not found');
          return reply.status(404).send({ error: 'Job site not found' });
        }

        const existingSite = existingSites[0];

        // Check if the current admin created this job site
        if (existingSite.createdBy !== session.user.id) {
          app.logger.warn({ userId: session.user.id, jobSiteId: id }, 'Unauthorized job site update');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Update job site
        const [updatedSite] = await app.db
          .update(jobSites)
          .set({
            name: name !== undefined ? name : existingSite.name,
            location: location !== undefined ? location : existingSite.location,
            isActive: isActive !== undefined ? isActive : existingSite.isActive,
          })
          .where(eq(jobSites.id, id))
          .returning();

        app.logger.info({ userId: session.user.id, jobSiteId: id }, 'Job site updated successfully');

        return {
          id: updatedSite.id,
          name: updatedSite.name,
          location: updatedSite.location,
          isActive: updatedSite.isActive,
          createdAt: updatedSite.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, jobSiteId: id }, 'Failed to update job site');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/job-sites/:id
   * Delete a job site (only if created by the authenticated admin)
   */
  app.fastify.delete(
    '/api/job-sites/:id',
    {
      schema: {
        description: 'Delete a job site',
        tags: ['job-sites'],
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ userId: session.user.id, jobSiteId: id }, 'Deleting job site');

      try {
        // Only admins can delete job sites
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to delete job site');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get existing job site
        const existingSites = await app.db.select().from(jobSites).where(eq(jobSites.id, id));

        if (existingSites.length === 0) {
          app.logger.warn({ jobSiteId: id }, 'Job site not found');
          return reply.status(404).send({ error: 'Job site not found' });
        }

        const existingSite = existingSites[0];

        // Check if the current admin created this job site
        if (existingSite.createdBy !== session.user.id) {
          app.logger.warn({ userId: session.user.id, jobSiteId: id }, 'Unauthorized job site deletion');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Delete job site (cascade will handle related records)
        await app.db.delete(jobSites).where(eq(jobSites.id, id));

        app.logger.info({ userId: session.user.id, jobSiteId: id }, 'Job site deleted successfully');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, jobSiteId: id }, 'Failed to delete job site');
        throw error;
      }
    }
  );
}
