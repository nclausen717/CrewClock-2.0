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
// TODO: In production, replace `origin: true` with a specific allowed origins list
// to restrict which domains can access the API. For now, allowing all origins
// for development and testing purposes.
await app.fastify.register(fastifyCors, {
  origin: true, // Allow all origins - should be restricted in production
  credentials: true,
});

// Register route modules
registerCompanyAuthRoutes(app);
registerAuthRoutes(app);
registerEmployeeRoutes(app);
registerJobSitesRoutes(app);
registerTimeEntriesRoutes(app);
registerReportsRoutes(app);
registerCrewRoutes(app);

await app.run();
app.logger.info('Application running');
