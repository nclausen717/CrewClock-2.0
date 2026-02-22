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
// Allowed origins are configured via ALLOWED_ORIGINS environment variable (comma-separated).
// Defaults to localhost dev origins if not set.
// Requests with no Origin header (e.g. server-to-server, curl) are allowed by design.
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081', 'http://localhost:19006'];
await app.fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests without an Origin header (server-to-server, native apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-Company-Token', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Register route modules
registerCompanyAuthRoutes(app);
await registerAuthRoutes(app);
registerEmployeeRoutes(app);
registerJobSitesRoutes(app);
registerTimeEntriesRoutes(app);
registerReportsRoutes(app);
registerCrewRoutes(app);

await app.run();
app.logger.info('Application running');
