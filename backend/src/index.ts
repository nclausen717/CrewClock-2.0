import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
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

// Register route modules
registerAuthRoutes(app);
registerEmployeeRoutes(app);
registerJobSitesRoutes(app);
registerTimeEntriesRoutes(app);
registerReportsRoutes(app);
registerCrewRoutes(app);

await app.run();
app.logger.info('Application running');
