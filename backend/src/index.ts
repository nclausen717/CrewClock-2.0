import { createApplication } from "@specific-dev/framework";
import fastifyCors from "@fastify/cors";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCompanyAuthRoutes } from './routes/company-auth.js';
import { registerEmployeeRoutes } from './routes/employees.js';
import { registerJobSitesRoutes } from './routes/job-sites.js';
import { registerTimeEntriesRoutes } from './routes/time-entries.js';
import { registerReportsRoutes } from './routes/reports.js';
import { registerCrewRoutes } from './routes/crews.js';

// Combine both schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable Better Auth
app.withAuth();

// Register CORS
// All origins are allowed because this API is accessed from a Natively.dev WebView wrapper,
// which sends unpredictable or null Origin headers. The Specular hosting platform does not
// support environment variable configuration, so origin restrictions cannot be enforced there.
// Security is maintained through authentication tokens (Bearer tokens and X-Company-Token)
// required on all protected endpoints, rather than relying on CORS origin restrictions.
await app.fastify.register(fastifyCors, {
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-Company-Token', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Register route modules
await registerCompanyAuthRoutes(app);
await registerAuthRoutes(app);
registerEmployeeRoutes(app);
registerJobSitesRoutes(app);
registerTimeEntriesRoutes(app);
registerReportsRoutes(app);
registerCrewRoutes(app);

await app.run();
app.logger.info('Application running');
