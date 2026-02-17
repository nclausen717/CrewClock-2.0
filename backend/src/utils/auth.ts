import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user } from '../db/auth-schema.js';

/**
 * Enhanced authentication that includes the user's role and companyId
 * Fetches the user from the database to ensure role and companyId are available
 */
export async function requireAuthWithRole(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requireAuth = app.requireAuth();
  const session = await requireAuth(request, reply);

  if (!session) return null;

  // Fetch the user to ensure we have the role and companyId
  const users = await app.db.select().from(user).where(eq(user.id, session.user.id));

  if (users.length === 0) {
    app.logger.warn({ userId: session.user.id }, 'User not found in database');
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const userData = users[0];

  // Return enhanced session with role and companyId
  return {
    ...session,
    user: {
      ...session.user,
      role: userData.role,
      companyId: userData.companyId,
    },
  };
}
