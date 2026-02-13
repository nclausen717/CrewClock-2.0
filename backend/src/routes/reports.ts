import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';
import { timeEntries, employees, jobSites } from '../db/schema.js';

/**
 * Calculate hours between two dates
 */
function calculateHours(clockIn: Date, clockOut: Date | null): number {
  if (!clockOut) return 0;
  const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Get Monday of the week for a given date
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get Saturday of the week (6 days after Monday)
 */
function getSaturday(monday: Date): Date {
  const sat = new Date(monday);
  sat.setDate(sat.getDate() + 5); // 5 days after Monday = Saturday
  return sat;
}

/**
 * Parse date string YYYY-MM-DD to Date
 */
function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Escape CSV field values
 */
function escapeCSV(field: string | number | boolean): string {
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function registerReportsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/reports/daily?date=YYYY-MM-DD
   * Returns daily report for specified date
   */
  app.fastify.get(
    '/api/reports/daily',
    {
      schema: {
        description: 'Get daily report',
        tags: ['reports'],
        querystring: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              totalHours: { type: 'number' },
              employees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    employeeId: { type: 'string' },
                    employeeName: { type: 'string' },
                    hoursWorked: { type: 'number' },
                    jobSites: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          jobSiteId: { type: 'string' },
                          jobSiteName: { type: 'string' },
                          hours: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
              jobSites: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    jobSiteId: { type: 'string' },
                    jobSiteName: { type: 'string' },
                    totalHours: { type: 'number' },
                    employees: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          employeeId: { type: 'string' },
                          employeeName: { type: 'string' },
                          hours: { type: 'number' },
                        },
                      },
                    },
                  },
                },
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

      const { date } = request.query as { date: string };

      app.logger.info({ userId: session.user.id, date }, 'Generating daily report');

      try {
        const reportDate = parseDate(date);
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get all time entries for this date
        const entries = await app.db
          .select({
            id: timeEntries.id,
            employeeId: timeEntries.employeeId,
            employeeName: employees.name,
            jobSiteId: timeEntries.jobSiteId,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
            clockOutTime: timeEntries.clockOutTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              gte(timeEntries.clockInTime, reportDate),
              lte(timeEntries.clockInTime, nextDay),
              isNotNull(timeEntries.clockOutTime)
            )
          );

        // Calculate hours and organize data
        const employeeMap = new Map<string, { name: string; hours: number; jobSites: Map<string, { name: string; hours: number }> }>();
        const jobSiteMap = new Map<string, { name: string; hours: number; employees: Map<string, { name: string; hours: number }> }>();
        let totalHours = 0;

        for (const entry of entries) {
          const hours = calculateHours(entry.clockInTime, entry.clockOutTime);

          // Update employee data
          if (!employeeMap.has(entry.employeeId)) {
            employeeMap.set(entry.employeeId, { name: entry.employeeName, hours: 0, jobSites: new Map() });
          }
          const empData = employeeMap.get(entry.employeeId)!;
          empData.hours += hours;

          if (!empData.jobSites.has(entry.jobSiteId)) {
            empData.jobSites.set(entry.jobSiteId, { name: entry.jobSiteName, hours: 0 });
          }
          empData.jobSites.get(entry.jobSiteId)!.hours += hours;

          // Update job site data
          if (!jobSiteMap.has(entry.jobSiteId)) {
            jobSiteMap.set(entry.jobSiteId, { name: entry.jobSiteName, hours: 0, employees: new Map() });
          }
          const siteData = jobSiteMap.get(entry.jobSiteId)!;
          siteData.hours += hours;

          if (!siteData.employees.has(entry.employeeId)) {
            siteData.employees.set(entry.employeeId, { name: entry.employeeName, hours: 0 });
          }
          siteData.employees.get(entry.employeeId)!.hours += hours;

          totalHours += hours;
        }

        // Format response
        const employeesResponse = Array.from(employeeMap.entries()).map(([id, data]) => ({
          employeeId: id,
          employeeName: data.name,
          hoursWorked: Math.round(data.hours * 100) / 100,
          jobSites: Array.from(data.jobSites.entries()).map(([siteId, siteData]) => ({
            jobSiteId: siteId,
            jobSiteName: siteData.name,
            hours: Math.round(siteData.hours * 100) / 100,
          })),
        }));

        const jobSitesResponse = Array.from(jobSiteMap.entries()).map(([id, data]) => ({
          jobSiteId: id,
          jobSiteName: data.name,
          totalHours: Math.round(data.hours * 100) / 100,
          employees: Array.from(data.employees.entries()).map(([empId, empData]) => ({
            employeeId: empId,
            employeeName: empData.name,
            hours: Math.round(empData.hours * 100) / 100,
          })),
        }));

        app.logger.info({ userId: session.user.id, date, totalHours }, 'Daily report generated');

        return {
          date,
          totalHours: Math.round(totalHours * 100) / 100,
          employees: employeesResponse,
          jobSites: jobSitesResponse,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, date }, 'Failed to generate daily report');
        throw error;
      }
    }
  );

  /**
   * GET /api/reports/weekly?startDate=YYYY-MM-DD
   * Returns weekly report (Monday-Saturday)
   */
  app.fastify.get(
    '/api/reports/weekly',
    {
      schema: {
        description: 'Get weekly report',
        tags: ['reports'],
        querystring: {
          type: 'object',
          required: ['startDate'],
          properties: {
            startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              weekStart: { type: 'string' },
              weekEnd: { type: 'string' },
              totalHours: { type: 'number' },
              employees: { type: 'array' },
              jobSites: { type: 'array' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { startDate } = request.query as { startDate: string };

      app.logger.info({ userId: session.user.id, startDate }, 'Generating weekly report');

      try {
        const weekStart = getMonday(parseDate(startDate));
        const weekEnd = getSaturday(weekStart);
        const nextDay = new Date(weekEnd);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get all time entries for this week
        const entries = await app.db
          .select({
            id: timeEntries.id,
            employeeId: timeEntries.employeeId,
            employeeName: employees.name,
            jobSiteId: timeEntries.jobSiteId,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
            clockOutTime: timeEntries.clockOutTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              gte(timeEntries.clockInTime, weekStart),
              lte(timeEntries.clockInTime, nextDay),
              isNotNull(timeEntries.clockOutTime)
            )
          );

        // Calculate hours and organize data
        const employeeMap = new Map<string, { name: string; hours: number; jobSites: Map<string, { name: string; hours: number }> }>();
        const jobSiteMap = new Map<string, { name: string; hours: number; employees: Map<string, { name: string; hours: number }> }>();
        let totalHours = 0;

        for (const entry of entries) {
          const hours = calculateHours(entry.clockInTime, entry.clockOutTime);

          // Update employee data
          if (!employeeMap.has(entry.employeeId)) {
            employeeMap.set(entry.employeeId, { name: entry.employeeName, hours: 0, jobSites: new Map() });
          }
          const empData = employeeMap.get(entry.employeeId)!;
          empData.hours += hours;

          if (!empData.jobSites.has(entry.jobSiteId)) {
            empData.jobSites.set(entry.jobSiteId, { name: entry.jobSiteName, hours: 0 });
          }
          empData.jobSites.get(entry.jobSiteId)!.hours += hours;

          // Update job site data
          if (!jobSiteMap.has(entry.jobSiteId)) {
            jobSiteMap.set(entry.jobSiteId, { name: entry.jobSiteName, hours: 0, employees: new Map() });
          }
          const siteData = jobSiteMap.get(entry.jobSiteId)!;
          siteData.hours += hours;

          if (!siteData.employees.has(entry.employeeId)) {
            siteData.employees.set(entry.employeeId, { name: entry.employeeName, hours: 0 });
          }
          siteData.employees.get(entry.employeeId)!.hours += hours;

          totalHours += hours;
        }

        // Format response with overtime calculation
        const employeesResponse = Array.from(employeeMap.entries()).map(([id, data]) => {
          const totalHours = Math.round(data.hours * 100) / 100;
          const regularHours = Math.min(totalHours, 40);
          const overtimeHours = Math.max(totalHours - 40, 0);

          return {
            employeeId: id,
            employeeName: data.name,
            regularHours: Math.round(regularHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            totalHours,
            hasOvertime: totalHours > 40,
            jobSites: Array.from(data.jobSites.entries()).map(([siteId, siteData]) => ({
              jobSiteId: siteId,
              jobSiteName: siteData.name,
              hours: Math.round(siteData.hours * 100) / 100,
            })),
          };
        });

        const jobSitesResponse = Array.from(jobSiteMap.entries()).map(([id, data]) => ({
          jobSiteId: id,
          jobSiteName: data.name,
          totalHours: Math.round(data.hours * 100) / 100,
          employees: Array.from(data.employees.entries()).map(([empId, empData]) => ({
            employeeId: empId,
            employeeName: empData.name,
            hours: Math.round(empData.hours * 100) / 100,
          })),
        }));

        app.logger.info({ userId: session.user.id, weekStart: formatDate(weekStart), totalHours }, 'Weekly report generated');

        return {
          weekStart: formatDate(weekStart),
          weekEnd: formatDate(weekEnd),
          totalHours: Math.round(totalHours * 100) / 100,
          employees: employeesResponse,
          jobSites: jobSitesResponse,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, startDate }, 'Failed to generate weekly report');
        throw error;
      }
    }
  );

  /**
   * GET /api/reports/monthly?year=YYYY&month=MM
   * Returns monthly report broken down by pay periods (Monday-Saturday)
   */
  app.fastify.get(
    '/api/reports/monthly',
    {
      schema: {
        description: 'Get monthly report',
        tags: ['reports'],
        querystring: {
          type: 'object',
          required: ['year', 'month'],
          properties: {
            year: { type: 'integer', minimum: 2000, maximum: 2100 },
            month: { type: 'integer', minimum: 1, maximum: 12 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              month: { type: 'string' },
              year: { type: 'integer' },
              totalHours: { type: 'number' },
              payPeriods: { type: 'array' },
              employees: { type: 'array' },
              jobSites: { type: 'array' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { year, month } = request.query as { year: string; month: string };

      app.logger.info({ userId: session.user.id, year, month }, 'Generating monthly report');

      try {
        const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthEnd = new Date(parseInt(year), parseInt(month), 0);

        // Get all time entries for this month
        const entries = await app.db
          .select({
            id: timeEntries.id,
            employeeId: timeEntries.employeeId,
            employeeName: employees.name,
            jobSiteId: timeEntries.jobSiteId,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
            clockOutTime: timeEntries.clockOutTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              gte(timeEntries.clockInTime, monthStart),
              lte(timeEntries.clockInTime, monthEnd),
              isNotNull(timeEntries.clockOutTime)
            )
          );

        // Group entries by pay period (Monday-Saturday)
        const payPeriodMap = new Map<string, typeof entries>();
        const employeeMap = new Map<string, { name: string; hours: number; jobSites: Map<string, { name: string; hours: number }> }>();
        const jobSiteMap = new Map<string, { name: string; hours: number }>();
        let totalHours = 0;

        for (const entry of entries) {
          const entryDate = new Date(entry.clockInTime);
          const periodMonday = getMonday(entryDate);
          const periodKey = formatDate(periodMonday);

          if (!payPeriodMap.has(periodKey)) {
            payPeriodMap.set(periodKey, []);
          }
          payPeriodMap.get(periodKey)!.push(entry);

          // Track employee and job site totals
          const hours = calculateHours(entry.clockInTime, entry.clockOutTime);

          if (!employeeMap.has(entry.employeeId)) {
            employeeMap.set(entry.employeeId, { name: entry.employeeName, hours: 0, jobSites: new Map() });
          }
          const empData = employeeMap.get(entry.employeeId)!;
          empData.hours += hours;

          if (!empData.jobSites.has(entry.jobSiteId)) {
            empData.jobSites.set(entry.jobSiteId, { name: entry.jobSiteName, hours: 0 });
          }
          empData.jobSites.get(entry.jobSiteId)!.hours += hours;

          if (!jobSiteMap.has(entry.jobSiteId)) {
            jobSiteMap.set(entry.jobSiteId, { name: entry.jobSiteName, hours: 0 });
          }
          jobSiteMap.get(entry.jobSiteId)!.hours += hours;

          totalHours += hours;
        }

        // Build pay periods response
        const payPeriodsResponse = Array.from(payPeriodMap.entries())
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([periodStart, periodEntries]) => {
            const periodMonday = parseDate(periodStart);
            const periodSaturday = getSaturday(periodMonday);

            // Calculate employee hours for this period
            const periodEmployeeMap = new Map<string, { name: string; hours: number }>();

            for (const entry of periodEntries) {
              const hours = calculateHours(entry.clockInTime, entry.clockOutTime);

              if (!periodEmployeeMap.has(entry.employeeId)) {
                periodEmployeeMap.set(entry.employeeId, { name: entry.employeeName, hours: 0 });
              }
              periodEmployeeMap.get(entry.employeeId)!.hours += hours;
            }

            const periodEmployees = Array.from(periodEmployeeMap.entries()).map(([id, data]) => {
              const totalHours = Math.round(data.hours * 100) / 100;
              const regularHours = Math.min(totalHours, 40);
              const overtimeHours = Math.max(totalHours - 40, 0);

              return {
                employeeId: id,
                employeeName: data.name,
                regularHours: Math.round(regularHours * 100) / 100,
                overtimeHours: Math.round(overtimeHours * 100) / 100,
                totalHours,
                hasOvertime: totalHours > 40,
              };
            });

            return {
              periodStart: periodStart,
              periodEnd: formatDate(periodSaturday),
              employees: periodEmployees,
            };
          });

        // Build employees response
        const employeesResponse = Array.from(employeeMap.entries()).map(([id, data]) => {
          const totalHours = Math.round(data.hours * 100) / 100;
          const regularHours = Math.min(totalHours, 40);
          const overtimeHours = Math.max(totalHours - 40, 0);

          return {
            employeeId: id,
            employeeName: data.name,
            regularHours: Math.round(regularHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            totalHours,
            hasOvertime: totalHours > 40,
            jobSites: Array.from(data.jobSites.entries()).map(([siteId, siteData]) => ({
              jobSiteId: siteId,
              jobSiteName: siteData.name,
              hours: Math.round(siteData.hours * 100) / 100,
            })),
          };
        });

        // Build job sites response
        const jobSitesResponse = Array.from(jobSiteMap.entries()).map(([id, data]) => ({
          jobSiteId: id,
          jobSiteName: data.name,
          totalHours: Math.round(data.hours * 100) / 100,
        }));

        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ];

        app.logger.info(
          { userId: session.user.id, year, month, totalHours },
          'Monthly report generated'
        );

        return {
          month: monthNames[parseInt(month) - 1],
          year: parseInt(year),
          totalHours: Math.round(totalHours * 100) / 100,
          payPeriods: payPeriodsResponse,
          employees: employeesResponse,
          jobSites: jobSitesResponse,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, year, month }, 'Failed to generate monthly report');
        throw error;
      }
    }
  );

  /**
   * GET /api/reports/daily/csv?date=YYYY-MM-DD
   * Returns CSV file for daily report
   */
  app.fastify.get(
    '/api/reports/daily/csv',
    {
      schema: {
        description: 'Get daily report as CSV',
        tags: ['reports'],
        querystring: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { date } = request.query as { date: string };

      app.logger.info({ userId: session.user.id, date }, 'Generating daily CSV report');

      try {
        const reportDate = parseDate(date);
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get all time entries for this date
        const entries = await app.db
          .select({
            employeeName: employees.name,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
            clockOutTime: timeEntries.clockOutTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              gte(timeEntries.clockInTime, reportDate),
              lte(timeEntries.clockInTime, nextDay),
              isNotNull(timeEntries.clockOutTime)
            )
          );

        // Build CSV
        const csvLines = ['Employee Name,Job Site,Hours Worked,Date'];

        for (const entry of entries) {
          const hours = calculateHours(entry.clockInTime, entry.clockOutTime);
          csvLines.push(
            `${escapeCSV(entry.employeeName)},${escapeCSV(entry.jobSiteName)},${Math.round(hours * 100) / 100},${date}`
          );
        }

        const csv = csvLines.join('\n');

        app.logger.info({ userId: session.user.id, date, rows: entries.length }, 'Daily CSV report generated');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="daily-report-${date}.csv"`);
        return csv;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, date }, 'Failed to generate daily CSV report');
        throw error;
      }
    }
  );

  /**
   * GET /api/reports/weekly/csv?startDate=YYYY-MM-DD
   * Returns CSV file for weekly report
   */
  app.fastify.get(
    '/api/reports/weekly/csv',
    {
      schema: {
        description: 'Get weekly report as CSV',
        tags: ['reports'],
        querystring: {
          type: 'object',
          required: ['startDate'],
          properties: {
            startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { startDate } = request.query as { startDate: string };

      app.logger.info({ userId: session.user.id, startDate }, 'Generating weekly CSV report');

      try {
        const weekStart = getMonday(parseDate(startDate));
        const weekEnd = getSaturday(weekStart);
        const nextDay = new Date(weekEnd);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get all time entries for this week
        const entries = await app.db
          .select({
            employeeId: timeEntries.employeeId,
            employeeName: employees.name,
            jobSiteId: timeEntries.jobSiteId,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
            clockOutTime: timeEntries.clockOutTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              gte(timeEntries.clockInTime, weekStart),
              lte(timeEntries.clockInTime, nextDay),
              isNotNull(timeEntries.clockOutTime)
            )
          );

        // Calculate employee weekly totals
        const employeeMap = new Map<string, { name: string; hours: number; jobSites: string[] }>();

        for (const entry of entries) {
          const hours = calculateHours(entry.clockInTime, entry.clockOutTime);

          if (!employeeMap.has(entry.employeeId)) {
            employeeMap.set(entry.employeeId, { name: entry.employeeName, hours: 0, jobSites: [] });
          }
          const empData = employeeMap.get(entry.employeeId)!;
          empData.hours += hours;

          if (!empData.jobSites.includes(entry.jobSiteName)) {
            empData.jobSites.push(entry.jobSiteName);
          }
        }

        // Build CSV
        const csvLines = ['Employee Name,Regular Hours,Overtime Hours,Total Hours,Overtime Flag,Job Sites'];

        for (const [, empData] of employeeMap) {
          const totalHours = Math.round(empData.hours * 100) / 100;
          const regularHours = Math.min(totalHours, 40);
          const overtimeHours = Math.max(totalHours - 40, 0);
          const overtimeFlag = totalHours > 40 ? 'Yes' : 'No';
          const jobSites = empData.jobSites.join('; ');

          csvLines.push(
            `${escapeCSV(empData.name)},${Math.round(regularHours * 100) / 100},${Math.round(overtimeHours * 100) / 100},${totalHours},${overtimeFlag},${escapeCSV(jobSites)}`
          );
        }

        const csv = csvLines.join('\n');

        app.logger.info(
          { userId: session.user.id, weekStart: formatDate(weekStart), rows: employeeMap.size },
          'Weekly CSV report generated'
        );

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="weekly-report-${formatDate(weekStart)}.csv"`);
        return csv;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, startDate }, 'Failed to generate weekly CSV report');
        throw error;
      }
    }
  );

  /**
   * GET /api/reports/monthly/csv?year=YYYY&month=MM
   * Returns CSV file for monthly report
   */
  app.fastify.get(
    '/api/reports/monthly/csv',
    {
      schema: {
        description: 'Get monthly report as CSV',
        tags: ['reports'],
        querystring: {
          type: 'object',
          required: ['year', 'month'],
          properties: {
            year: { type: 'integer', minimum: 2000, maximum: 2100 },
            month: { type: 'integer', minimum: 1, maximum: 12 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { year, month } = request.query as { year: string; month: string };

      app.logger.info({ userId: session.user.id, year, month }, 'Generating monthly CSV report');

      try {
        const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthEnd = new Date(parseInt(year), parseInt(month), 0);

        // Get all time entries for this month
        const entries = await app.db
          .select({
            employeeId: timeEntries.employeeId,
            employeeName: employees.name,
            jobSiteId: timeEntries.jobSiteId,
            jobSiteName: jobSites.name,
            clockInTime: timeEntries.clockInTime,
            clockOutTime: timeEntries.clockOutTime,
          })
          .from(timeEntries)
          .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
          .innerJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
          .where(
            and(
              gte(timeEntries.clockInTime, monthStart),
              lte(timeEntries.clockInTime, monthEnd),
              isNotNull(timeEntries.clockOutTime)
            )
          );

        // Group by employee and pay period
        const employeePayPeriodMap = new Map<string, Map<string, { name: string; hours: number; jobSites: string[] }>>();

        for (const entry of entries) {
          const hours = calculateHours(entry.clockInTime, entry.clockOutTime);
          const entryDate = new Date(entry.clockInTime);
          const periodMonday = getMonday(entryDate);
          const periodKey = formatDate(periodMonday);

          if (!employeePayPeriodMap.has(entry.employeeId)) {
            employeePayPeriodMap.set(entry.employeeId, new Map());
          }

          const periodMap = employeePayPeriodMap.get(entry.employeeId)!;

          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, { name: entry.employeeName, hours: 0, jobSites: [] });
          }

          const periodData = periodMap.get(periodKey)!;
          periodData.hours += hours;

          if (!periodData.jobSites.includes(entry.jobSiteName)) {
            periodData.jobSites.push(entry.jobSiteName);
          }
        }

        // Build CSV
        const csvLines = ['Employee Name,Pay Period,Regular Hours,Overtime Hours,Total Hours,Overtime Flag,Job Sites'];

        // Sort by employee and period
        const sortedEmployees = Array.from(employeePayPeriodMap.entries()).sort(([, periodMapA], [, periodMapB]) => {
          const firstKeyA = Array.from(periodMapA.keys())[0];
          const firstKeyB = Array.from(periodMapB.keys())[0];
          return firstKeyA?.localeCompare(firstKeyB ?? '') ?? 0;
        });

        for (const [, periodMap] of sortedEmployees) {
          const sortedPeriods = Array.from(periodMap.entries()).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

          for (const [periodStart, periodData] of sortedPeriods) {
            const periodMonday = parseDate(periodStart);
            const periodSaturday = getSaturday(periodMonday);
            const periodRange = `${periodStart} to ${formatDate(periodSaturday)}`;

            const totalHours = Math.round(periodData.hours * 100) / 100;
            const regularHours = Math.min(totalHours, 40);
            const overtimeHours = Math.max(totalHours - 40, 0);
            const overtimeFlag = totalHours > 40 ? 'Yes' : 'No';
            const jobSites = periodData.jobSites.join('; ');

            csvLines.push(
              `${escapeCSV(periodData.name)},${escapeCSV(periodRange)},${Math.round(regularHours * 100) / 100},${Math.round(overtimeHours * 100) / 100},${totalHours},${overtimeFlag},${escapeCSV(jobSites)}`
            );
          }
        }

        const csv = csvLines.join('\n');

        app.logger.info(
          { userId: session.user.id, year, month, rows: csvLines.length - 1 },
          'Monthly CSV report generated'
        );

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="monthly-report-${year}-${month}.csv"`);
        return csv;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, year, month }, 'Failed to generate monthly CSV report');
        throw error;
      }
    }
  );
}
