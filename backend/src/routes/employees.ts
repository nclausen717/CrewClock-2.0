import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { employees } from '../db/schema.js';
import { account } from '../db/auth-schema.js';

/**
 * Generate a secure random password
 * 8-12 characters with mix of letters and numbers
 */
function generatePassword(): string {
  const length = Math.floor(Math.random() * 5) + 8; // 8-12 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function registerEmployeeRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/employees
   * Returns all employees created by the authenticated admin
   */
  app.fastify.get(
    '/api/employees',
    {
      schema: {
        description: 'Get all employees for authenticated admin',
        tags: ['employees'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: ['string', 'null'] },
                isCrewLeader: { type: 'boolean' },
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

      app.logger.info({ userId: session.user.id }, 'Fetching employees');

      try {
        // Only admins can view employees
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to view employees');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        const allEmployees = await app.db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            isCrewLeader: employees.isCrewLeader,
            createdAt: employees.createdAt,
          })
          .from(employees)
          .where(eq(employees.createdBy, session.user.id));

        app.logger.info({ userId: session.user.id, count: allEmployees.length }, 'Employees fetched');

        return allEmployees;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch employees');
        throw error;
      }
    }
  );

  /**
   * POST /api/employees
   * Create a new employee. If isCrewLeader is true, generates login credentials
   */
  app.fastify.post(
    '/api/employees',
    {
      schema: {
        description: 'Create a new employee',
        tags: ['employees'],
        body: {
          type: 'object',
          required: ['name', 'isCrewLeader'],
          properties: {
            name: { type: 'string' },
            isCrewLeader: { type: 'boolean' },
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: ['string', 'null'] },
              isCrewLeader: { type: 'boolean' },
              generatedPassword: { type: ['string', 'null'] },
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

      const { name, isCrewLeader, email } = request.body as {
        name: string;
        isCrewLeader: boolean;
        email?: string;
      };

      app.logger.info({ userId: session.user.id, name, isCrewLeader }, 'Creating employee');

      try {
        // Only admins can create employees
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to create employee');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // If crew leader, email is required
        if (isCrewLeader && !email) {
          app.logger.warn({ userId: session.user.id }, 'Crew leader creation attempted without email');
          return reply.status(400).send({ error: 'Email required for crew leaders' });
        }

        // Check if email is already used
        if (email) {
          const existingEmployee = await app.db
            .select()
            .from(employees)
            .where(eq(employees.email, email));

          if (existingEmployee.length > 0) {
            app.logger.warn({ email }, 'Email already in use');
            return reply.status(400).send({ error: 'Email already in use' });
          }
        }

        let generatedPassword: string | null = null;

        // Create employee
        const [newEmployee] = await app.db
          .insert(employees)
          .values({
            name,
            email: email || null,
            isCrewLeader,
            createdBy: session.user.id,
          })
          .returning();

        // If crew leader, create account with generated password
        if (isCrewLeader) {
          generatedPassword = generatePassword();
          const { hashPassword } = await import('better-auth/crypto');
          const hashedPassword = await hashPassword(generatedPassword);

          await app.db
            .insert(account)
            .values({
              id: crypto.randomUUID(),
              userId: newEmployee.id,
              accountId: email!,
              providerId: 'email',
              password: hashedPassword,
            });
        }

        app.logger.info(
          { userId: session.user.id, employeeId: newEmployee.id, isCrewLeader },
          'Employee created successfully'
        );

        return reply.status(201).send({
          id: newEmployee.id,
          name: newEmployee.name,
          email: newEmployee.email,
          isCrewLeader: newEmployee.isCrewLeader,
          generatedPassword,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, name }, 'Failed to create employee');
        throw error;
      }
    }
  );

  /**
   * PUT /api/employees/:id
   * Update an employee (only if created by the authenticated admin)
   */
  app.fastify.put(
    '/api/employees/:id',
    {
      schema: {
        description: 'Update an employee',
        tags: ['employees'],
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
            isCrewLeader: { type: 'boolean' },
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: ['string', 'null'] },
              isCrewLeader: { type: 'boolean' },
              generatedPassword: { type: ['string', 'null'] },
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const { name, isCrewLeader, email } = request.body as {
        name?: string;
        isCrewLeader?: boolean;
        email?: string;
      };

      app.logger.info({ userId: session.user.id, employeeId: id }, 'Updating employee');

      try {
        // Only admins can update employees
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to update employee');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get existing employee
        const existingEmployees = await app.db
          .select()
          .from(employees)
          .where(eq(employees.id, id));

        if (existingEmployees.length === 0) {
          app.logger.warn({ employeeId: id }, 'Employee not found');
          return reply.status(404).send({ error: 'Employee not found' });
        }

        const existingEmployee = existingEmployees[0];

        // Check if the current admin created this employee
        if (existingEmployee.createdBy !== session.user.id) {
          app.logger.warn({ userId: session.user.id, employeeId: id }, 'Unauthorized employee update');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Check if email is already used (if changing email)
        if (email && email !== existingEmployee.email) {
          const emailExists = await app.db
            .select()
            .from(employees)
            .where(eq(employees.email, email));

          if (emailExists.length > 0) {
            app.logger.warn({ email }, 'Email already in use');
            return reply.status(400).send({ error: 'Email already in use' });
          }
        }

        let generatedPassword: string | null = null;

        // If changing to crew leader, generate password
        if (isCrewLeader && !existingEmployee.isCrewLeader && email) {
          generatedPassword = generatePassword();
          const { hashPassword } = await import('better-auth/crypto');
          const hashedPassword = await hashPassword(generatedPassword);

          // Check if account already exists
          const existingAccount = await app.db
            .select()
            .from(account)
            .where(eq(account.userId, id));

          if (existingAccount.length > 0) {
            // Update existing account
            await app.db
              .update(account)
              .set({ password: hashedPassword })
              .where(eq(account.userId, id));
          } else {
            // Create new account
            await app.db
              .insert(account)
              .values({
                id: crypto.randomUUID(),
                userId: id,
                accountId: email,
                providerId: 'email',
                password: hashedPassword,
              });
          }
        }

        // Update employee
        const [updatedEmployee] = await app.db
          .update(employees)
          .set({
            name: name !== undefined ? name : existingEmployee.name,
            email: email !== undefined ? email : existingEmployee.email,
            isCrewLeader: isCrewLeader !== undefined ? isCrewLeader : existingEmployee.isCrewLeader,
          })
          .where(eq(employees.id, id))
          .returning();

        app.logger.info({ userId: session.user.id, employeeId: id }, 'Employee updated successfully');

        return {
          id: updatedEmployee.id,
          name: updatedEmployee.name,
          email: updatedEmployee.email,
          isCrewLeader: updatedEmployee.isCrewLeader,
          generatedPassword,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, employeeId: id }, 'Failed to update employee');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/employees/:id
   * Delete an employee (only if created by the authenticated admin)
   */
  app.fastify.delete(
    '/api/employees/:id',
    {
      schema: {
        description: 'Delete an employee',
        tags: ['employees'],
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

      app.logger.info({ userId: session.user.id, employeeId: id }, 'Deleting employee');

      try {
        // Only admins can delete employees
        if (session.user.role !== 'admin') {
          app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted to delete employee');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Get existing employee
        const existingEmployees = await app.db
          .select()
          .from(employees)
          .where(eq(employees.id, id));

        if (existingEmployees.length === 0) {
          app.logger.warn({ employeeId: id }, 'Employee not found');
          return reply.status(404).send({ error: 'Employee not found' });
        }

        const existingEmployee = existingEmployees[0];

        // Check if the current admin created this employee
        if (existingEmployee.createdBy !== session.user.id) {
          app.logger.warn({ userId: session.user.id, employeeId: id }, 'Unauthorized employee deletion');
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Delete employee (cascade will handle related records)
        await app.db.delete(employees).where(eq(employees.id, id));

        app.logger.info({ userId: session.user.id, employeeId: id }, 'Employee deleted successfully');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, employeeId: id }, 'Failed to delete employee');
        throw error;
      }
    }
  );
}
