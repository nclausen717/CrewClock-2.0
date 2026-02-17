import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { company, companySession } from '../db/schema.js';

export function registerCompanyAuthRoutes(app: App) {
  /**
   * POST /api/companies/register
   * Company registration endpoint
   */
  app.fastify.post(
    '/api/companies/register',
    {
      schema: {
        description: 'Company registration',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            name: { type: 'string' },
            city: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              company: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  city: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, name, city, phone } = request.body as {
        email: string;
        password: string;
        name: string;
        city?: string;
        phone?: string;
      };

      app.logger.info({ email, name }, 'Company registration attempt');

      try {
        // Check if company already exists
        const existingCompanies = await app.db
          .select()
          .from(company)
          .where(eq(company.email, email));

        if (existingCompanies.length > 0) {
          app.logger.warn({ email }, 'Company registration failed: email already exists');
          return reply.status(409).send({ error: 'A company with this email already exists' });
        }

        // Hash password using Better Auth's crypto
        const { hashPassword } = await import('better-auth/crypto');
        const hashedPassword = await hashPassword(password);

        // Create company
        const [newCompany] = await app.db
          .insert(company)
          .values({
            email,
            password: hashedPassword,
            name,
            city: city || null,
            phone: phone || null,
          })
          .returning();

        app.logger.info({ companyId: newCompany.id, email }, 'Company registered successfully');

        return reply.status(201).send({
          company: {
            id: newCompany.id,
            email: newCompany.email,
            name: newCompany.name,
            city: newCompany.city,
            phone: newCompany.phone,
          },
        });
      } catch (error: any) {
        app.logger.error({ err: error, email }, 'Company registration error');

        // Handle duplicate key errors from the database
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          return reply.status(409).send({ error: 'A company with this email already exists' });
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/auth/company/login
   * Company login endpoint - verifies credentials and creates session
   */
  app.fastify.post(
    '/api/auth/company/login',
    {
      schema: {
        description: 'Company login',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              company: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  city: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as { email: string; password: string };

      app.logger.info({ email }, 'Company login attempt');

      try {
        // Find company by email
        const companies = await app.db.select().from(company).where(eq(company.email, email));

        if (companies.length === 0) {
          app.logger.warn({ email }, 'Company login failed: company not found');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const foundCompany = companies[0];

        // Verify password using Better Auth's crypto
        const { verifyPassword } = await import('better-auth/crypto');
        const passwordMatch = await verifyPassword({
          password,
          hash: foundCompany.password,
        });

        if (!passwordMatch) {
          app.logger.warn({ email }, 'Company login failed: incorrect password');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Create session token
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Insert company session
        await app.db.insert(companySession).values({
          companyId: foundCompany.id,
          token: sessionToken,
          expiresAt,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        app.logger.info({ companyId: foundCompany.id, email }, 'Company login successful');

        return {
          token: sessionToken,
          company: {
            id: foundCompany.id,
            email: foundCompany.email,
            name: foundCompany.name,
            city: foundCompany.city,
            phone: foundCompany.phone,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, email }, 'Company login error');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/company/logout
   * Company logout - ends the company session
   */
  app.fastify.post(
    '/api/auth/company/logout',
    {
      schema: {
        description: 'Company logout',
        tags: ['auth'],
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Company logout attempt');

      try {
        // Get the company session token from the request
        const authHeader = request.headers['x-company-token'];
        if (!authHeader) {
          app.logger.warn({}, 'Company logout failed: no token provided');
          return reply.status(401).send({ error: 'Invalid token' });
        }

        const token = authHeader as string;

        // Delete the company session from database
        const deletedSessions = await app.db
          .delete(companySession)
          .where(eq(companySession.token, token))
          .returning();

        if (deletedSessions.length === 0) {
          app.logger.warn({}, 'Company logout failed: session not found');
          return reply.status(401).send({ error: 'Session not found' });
        }

        app.logger.info({ companyId: deletedSessions[0].companyId }, 'Company logout successful');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error }, 'Company logout error');
        throw error;
      }
    }
  );

  /**
   * GET /api/auth/company/me
   * Get current company session
   */
  app.fastify.get(
    '/api/auth/company/me',
    {
      schema: {
        description: 'Get current company',
        tags: ['auth'],
        response: {
          200: {
            type: 'object',
            properties: {
              company: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  city: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Get current company');

      try {
        // Get the company session token from the request
        const authHeader = request.headers['x-company-token'];
        if (!authHeader) {
          return reply.status(401).send({ error: 'Company authentication required' });
        }

        const token = authHeader as string;

        // Find company session
        const sessions = await app.db
          .select()
          .from(companySession)
          .where(eq(companySession.token, token));

        if (sessions.length === 0) {
          return reply.status(401).send({ error: 'Invalid company session' });
        }

        const session = sessions[0];

        // Check if session is expired
        if (session.expiresAt < new Date()) {
          // Delete expired session
          await app.db.delete(companySession).where(eq(companySession.token, token));
          return reply.status(401).send({ error: 'Session expired' });
        }

        // Find company
        const companies = await app.db
          .select()
          .from(company)
          .where(eq(company.id, session.companyId));

        if (companies.length === 0) {
          return reply.status(401).send({ error: 'Company not found' });
        }

        const foundCompany = companies[0];

        return {
          company: {
            id: foundCompany.id,
            email: foundCompany.email,
            name: foundCompany.name,
            city: foundCompany.city,
            phone: foundCompany.phone,
          },
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Get company error');
        throw error;
      }
    }
  );
}
