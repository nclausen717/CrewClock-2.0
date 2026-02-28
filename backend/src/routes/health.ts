import type { App } from '../index.js';

export function registerHealthRoutes(app: App) {
  /**
   * GET /api/health
   * Public health check endpoint to verify the server is running
   */
  app.fastify.get(
    '/api/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            required: ['status', 'timestamp'],
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    }
  );
}
