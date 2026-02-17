import { pgTable, text, timestamp, boolean, uuid, unique } from 'drizzle-orm/pg-core';
import { company } from './auth-schema.js';

// Crews table - groups of employees led by a crew leader
// Note: crewLeaderId is defined below employees due to foreign key ordering
export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  crewLeaderId: uuid('crew_leader_id'), // nullable - crew leader assigned to this crew
  createdBy: text('created_by').notNull(), // admin user id who created the crew
  companyId: text('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  // Unique constraint: crew names must be unique within a company
  uniqueNamePerCompany: unique().on(table.name, table.companyId),
}));

// Employees table - managed by admins
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').unique(), // nullable - only for crew leaders who can login
  isCrewLeader: boolean('is_crew_leader').default(false).notNull(),
  crewId: uuid('crew_id').references(() => crews.id, { onDelete: 'set null' }), // which crew this employee belongs to
  createdBy: text('created_by'), // admin user id who created this employee, null if self-registered crew leader
  companyId: text('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
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
  companyId: text('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
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
  companyId: text('company_id')
    .notNull()
    .references(() => company.id, { onDelete: 'cascade' }),
  workDescription: text('work_description'), // optional description of work done
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
