import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

// Company table - top-level organization entity
export const company = pgTable('company', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  city: text('city'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Company sessions table - for company authentication
export const companySession = pgTable('company_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Crews table - groups of employees led by a crew leader
// Note: crewLeaderId is defined below employees due to foreign key ordering
export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  crewLeaderId: uuid('crew_leader_id'), // nullable - crew leader assigned to this crew
  createdBy: text('created_by').notNull(), // admin user id who created the crew
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Employees table - managed by admins
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique(), // nullable - only for crew leaders who can login
  isCrewLeader: boolean('is_crew_leader').default(false).notNull(),
  crewId: uuid('crew_id').references(() => crews.id, { onDelete: 'set null' }), // which crew this employee belongs to
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
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
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
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
