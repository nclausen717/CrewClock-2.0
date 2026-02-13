import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

// Employees table - managed by admins
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique(), // nullable - only for crew leaders who can login
  isCrewLeader: boolean('is_crew_leader').default(false).notNull(),
  createdBy: text('created_by'), // admin user id who created this employee, null if self-registered crew leader
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Job sites table - managed by admins
export const jobSites = pgTable('job_sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  createdBy: text('created_by').notNull(), // admin user id
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Time entries table - records of clock in/out
export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  jobSiteId: uuid('job_site_id')
    .notNull()
    .references(() => jobSites.id, { onDelete: 'cascade' }),
  clockInTime: timestamp('clock_in_time', { withTimezone: true }).notNull(),
  clockOutTime: timestamp('clock_out_time', { withTimezone: true }),
  clockedInBy: text('clocked_in_by').notNull(), // crew leader user id who clocked them in
  workDescription: text('work_description'), // optional description of work done
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
