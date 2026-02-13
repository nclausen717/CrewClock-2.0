import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user, account, session } from '../db/auth-schema.js';
import { employees } from '../db/schema.js';

export function registerAuthRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/auth/crew-lead/login
   * Crew lead login endpoint - verifies credentials and ensures user has crew_lead role
   */
  app.fastify.post(
    '/api/auth/crew-lead/login',
    {
      schema: {
        description: 'Crew lead login',
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
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
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

      app.logger.info({ email }, 'Crew lead login attempt');

      try {
        // Find user by email
        const users = await app.db.select().from(user).where(eq(user.email, email));

        if (users.length === 0) {
          app.logger.warn({ email }, 'Crew lead login failed: user not found');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const foundUser = users[0];

        // Verify role is crew_lead
        if (foundUser.role !== 'crew_lead') {
          app.logger.warn({ email, role: foundUser.role }, 'Crew lead login failed: user is not crew_lead');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Find account with password hash
        const accounts = await app.db
          .select()
          .from(account)
          .where(eq(account.userId, foundUser.id));

        if (accounts.length === 0 || !accounts[0].password) {
          app.logger.warn({ email }, 'Crew lead login failed: no password found');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Verify password using Better Auth's crypto
        const { verifyPassword } = await import('better-auth/crypto');
        const passwordMatch = await verifyPassword({
          password,
          hash: accounts[0].password!,
        });

        if (!passwordMatch) {
          app.logger.warn({ email }, 'Crew lead login failed: incorrect password');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Create session token
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Insert session
        await app.db.insert(session).values({
          id: crypto.randomUUID(),
          token: sessionToken,
          userId: foundUser.id,
          expiresAt,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        app.logger.info({ userId: foundUser.id, email }, 'Crew lead login successful');

        return {
          token: sessionToken,
          user: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, email }, 'Crew lead login error');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/admin/login
   * Admin login endpoint - verifies credentials and ensures user has admin role
   */
  app.fastify.post(
    '/api/auth/admin/login',
    {
      schema: {
        description: 'Admin login',
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
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
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

      app.logger.info({ email }, 'Admin login attempt');

      try {
        // Find user by email
        const users = await app.db.select().from(user).where(eq(user.email, email));

        if (users.length === 0) {
          app.logger.warn({ email }, 'Admin login failed: user not found');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const foundUser = users[0];

        // Verify role is admin
        if (foundUser.role !== 'admin') {
          app.logger.warn({ email, role: foundUser.role }, 'Admin login failed: user is not admin');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Find account with password hash
        const accounts = await app.db
          .select()
          .from(account)
          .where(eq(account.userId, foundUser.id));

        if (accounts.length === 0 || !accounts[0].password) {
          app.logger.warn({ email }, 'Admin login failed: no password found');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Verify password using Better Auth's crypto
        const { verifyPassword } = await import('better-auth/crypto');
        const passwordMatch = await verifyPassword({
          password,
          hash: accounts[0].password!,
        });

        if (!passwordMatch) {
          app.logger.warn({ email }, 'Admin login failed: incorrect password');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Create session token
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Insert session
        await app.db.insert(session).values({
          id: crypto.randomUUID(),
          token: sessionToken,
          userId: foundUser.id,
          expiresAt,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        app.logger.info({ userId: foundUser.id, email }, 'Admin login successful');

        return {
          token: sessionToken,
          user: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, email }, 'Admin login error');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/crew-lead/register
   * Crew lead registration endpoint
   */
  app.fastify.post(
    '/api/auth/crew-lead/register',
    {
      schema: {
        description: 'Crew lead registration',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            name: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, name } = request.body as { email: string; password: string; name: string };

      app.logger.info({ email, name }, 'Crew lead registration attempt');

      try {
        // Check if user already exists
        const existingUsers = await app.db.select().from(user).where(eq(user.email, email));

        if (existingUsers.length > 0) {
          app.logger.warn({ email }, 'Crew lead registration failed: email already exists');
          return reply.status(409).send({ error: 'An account with this email already exists' });
        }

        // Check if employee already exists
        const existingEmployees = await app.db
          .select()
          .from(employees)
          .where(eq(employees.email, email));

        if (existingEmployees.length > 0) {
          app.logger.warn({ email }, 'Crew lead registration failed: employee with email already exists');
          return reply.status(409).send({ error: 'An employee with this email already exists' });
        }

        // Hash password
        const { hashPassword } = await import('better-auth/crypto');
        const hashedPassword = await hashPassword(password);

        // Generate IDs
        const userId = crypto.randomUUID();

        // Create user
        await app.db.insert(user).values({
          id: userId,
          email,
          name,
          role: 'crew_lead',
        });

        // Create account with password
        await app.db.insert(account).values({
          id: crypto.randomUUID(),
          userId,
          accountId: email,
          providerId: 'email',
          password: hashedPassword,
        });

        // Create employee record for self-registered crew leader
        // Set createdBy to null to indicate self-registration
        // This makes them visible to all admins
        await app.db.insert(employees).values({
          id: userId,
          name,
          email,
          isCrewLeader: true,
          createdBy: null,
        });

        app.logger.info({ userId, email }, 'Crew lead registered successfully');

        return reply.status(201).send({
          user: {
            id: userId,
            email,
            name,
            role: 'crew_lead',
          },
        });
      } catch (error: any) {
        app.logger.error({ err: error, email }, 'Crew lead registration error');

        // Handle duplicate key errors from the database
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          return reply.status(409).send({ error: 'An account with this email already exists' });
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/auth/admin/register
   * Admin registration endpoint
   */
  app.fastify.post(
    '/api/auth/admin/register',
    {
      schema: {
        description: 'Admin registration',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            name: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, name } = request.body as { email: string; password: string; name: string };

      app.logger.info({ email, name }, 'Admin registration attempt');

      try {
        // Check if user already exists
        const existingUsers = await app.db.select().from(user).where(eq(user.email, email));

        if (existingUsers.length > 0) {
          app.logger.warn({ email }, 'Admin registration failed: email already exists');
          return reply.status(400).send({ error: 'Email already registered' });
        }

        // Hash password
        const { hashPassword } = await import('better-auth/crypto');
        const hashedPassword = await hashPassword(password);

        // Generate IDs
        const userId = crypto.randomUUID();

        // Create user
        await app.db.insert(user).values({
          id: userId,
          email,
          name,
          role: 'admin',
        });

        // Create account with password
        await app.db.insert(account).values({
          id: crypto.randomUUID(),
          userId,
          accountId: email,
          providerId: 'email',
          password: hashedPassword,
        });

        app.logger.info({ userId, email }, 'Admin registered successfully');

        return reply.status(201).send({
          user: {
            id: userId,
            email,
            name,
            role: 'admin',
          },
        });
      } catch (error) {
        app.logger.error({ err: error, email }, 'Admin registration error');
        throw error;
      }
    }
  );

  /**
   * GET /api/auth/me
   * Get current user session - protected route
   */
  app.fastify.get(
    '/api/auth/me',
    {
      schema: {
        description: 'Get current user',
        tags: ['auth'],
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Get current user');

      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Current user retrieved');

      return {
        user: session.user,
      };
    }
  );

  /**
   * POST /api/auth/logout
   * Logout - ends the user session
   */
  app.fastify.post(
    '/api/auth/logout',
    {
      schema: {
        description: 'Logout',
        tags: ['auth'],
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      app.logger.info({ userId: auth.user.id }, 'Logout attempt');

      try {
        // Get the session token from the request
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          app.logger.warn({ userId: auth.user.id }, 'Logout failed: no bearer token');
          return reply.status(401).send({ error: 'Invalid token' });
        }

        const token = authHeader.slice(7); // Remove 'Bearer ' prefix

        // Delete the session from database
        const deletedSessions = await app.db
          .delete(session)
          .where(eq(session.token, token))
          .returning();

        if (deletedSessions.length === 0) {
          app.logger.warn({ userId: auth.user.id }, 'Logout failed: session not found');
          return reply.status(401).send({ error: 'Session not found' });
        }

        app.logger.info({ userId: auth.user.id }, 'Logout successful');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: auth.user.id }, 'Logout error');
        throw error;
      }
    }
  );
}
