import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, lt } from 'drizzle-orm';
import { user, session } from '../db/auth-schema.js';

/**
 * Enhanced authentication that includes the user's role and companyId
 * Fetches the user from the database to ensure role and companyId are available.
 * Also verifies that the session has not expired.
 */
export async function requireAuthWithRole(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requireAuth = app.requireAuth();
  const authSession = await requireAuth(request, reply);

  if (!authSession) return null;

  // Check session expiry using the bearer token
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const sessions = await app.db
      .select()
      .from(session)
      .where(eq(session.token, token));

    if (sessions.length > 0 && sessions[0].expiresAt < new Date()) {
      // Delete expired session
      await app.db.delete(session).where(eq(session.token, token));
      app.logger.warn({ userId: authSession.user.id }, 'Session expired, logging out');
      return reply.status(401).send({ error: 'Session expired. Please log in again.' });
    }

    // Periodically clean up expired sessions (1 in 100 requests)
    if (Math.random() < 0.01) {
      app.db.delete(session)
        .where(lt(session.expiresAt, new Date()))
        .catch(err => app.logger.error({ err }, 'Failed to cleanup expired sessions'));
    }
  }

  // Fetch the user to ensure we have the role and companyId
  const users = await app.db.select().from(user).where(eq(user.id, authSession.user.id));

  if (users.length === 0) {
    app.logger.warn({ userId: authSession.user.id }, 'User not found in database');
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const userData = users[0];

  // Verify that user has a companyId (should always be true due to schema, but check for data integrity)
  if (!userData.companyId) {
    app.logger.error({ userId: authSession.user.id }, 'User has no companyId — possible data integrity issue');
    return reply.status(403).send({ error: 'Account not associated with a company' });
  }

  // Return enhanced session with role and companyId
  return {
    ...authSession,
    user: {
      ...authSession.user,
      role: userData.role,
      companyId: userData.companyId,
    },
  };
}
