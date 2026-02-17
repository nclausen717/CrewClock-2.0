import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, lt } from 'drizzle-orm';
import { company, companySession } from '../db/schema.js';

/**
 * Middleware to require company authentication
 * Returns the company if authenticated, sends 401 response if not
 */
export async function requireCompanyAuth(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Get the company session token from the request
    const authHeader = request.headers['x-company-token'];
    if (!authHeader) {
      app.logger.warn({}, 'Company authentication failed: no token provided');
      return reply.status(401).send({ error: 'Company authentication required' });
    }

    const token = authHeader as string;

    // Find company session
    const sessions = await app.db
      .select()
      .from(companySession)
      .where(eq(companySession.token, token));

    if (sessions.length === 0) {
      app.logger.warn({}, 'Company authentication failed: invalid session');
      return reply.status(401).send({ error: 'Invalid company session' });
    }

    const session = sessions[0];

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await app.db.delete(companySession).where(eq(companySession.token, token));
      app.logger.warn({ companyId: session.companyId }, 'Company authentication failed: session expired');
      return reply.status(401).send({ error: 'Company session expired' });
    }

    // Find company
    const companies = await app.db
      .select()
      .from(company)
      .where(eq(company.id, session.companyId));

    if (companies.length === 0) {
      app.logger.warn({ companyId: session.companyId }, 'Company authentication failed: company not found');
      return reply.status(401).send({ error: 'Company not found' });
    }

    const foundCompany = companies[0];

    // Periodically clean up expired sessions (1 in 100 requests)
    // This prevents expired sessions from accumulating in the database
    if (Math.random() < 0.01) {
      // Run cleanup in background, don't await
      app.db.delete(companySession)
        .where(lt(companySession.expiresAt, new Date()))
        .catch(err => app.logger.error({ err }, 'Failed to cleanup expired company sessions'));
    }

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
    app.logger.error({ err: error }, 'Company authentication error');
    return reply.status(500).send({ error: 'Authentication error' });
  }
}
