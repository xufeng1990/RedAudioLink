import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  businessId: text("business_id").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  taskId: text("task_id").notNull(),
  address: text("address").notNull(),
  stateProvince: text("state_province").notNull(),
  postalCode: text("postal_code").notNull(),
  client: text("client").notNull().default(""),
  contactNumber: text("contact_number").notNull().default(""),
  inspectionDate: text("inspection_date").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  taskNumber: text("task_number").notNull().default(""),
  deviceCount: text("device_count").notNull().default("0"),
  html: text("html").notNull(),
  deviceJson: jsonb("device_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  employeeName: text("employee_name").notNull().default(""),
  employeeId: text("employee_id").notNull().default(""),
  telephoneNumber: text("telephone_number").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({ email: true, password: true, businessId: true })
  .extend({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    businessId: z.string().min(1, "Business ID is required"),
  });

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  employeeName: z.string().trim().max(120).optional(),
  employeeId: z.string().trim().max(60).optional(),
  telephoneNumber: z.string().trim().max(40).optional(),
  businessId: z.string().trim().min(1).max(60).optional(),
  emailAddress: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional(),
});

export const insertTaskSchema = z.object({
  title: z.string().trim().min(1, "Task name is required").max(200),
  taskId: z.string().trim().min(1, "Task ID is required").max(80),
  address: z.string().trim().min(1, "Address is required").max(300),
  stateProvince: z.string().trim().min(1, "State/Province is required").max(120),
  postalCode: z.string().trim().min(1, "Postal Code is required").max(40),
  client: z.string().trim().max(200).optional(),
  contactNumber: z.string().trim().max(40).optional(),
  inspectionDate: z.string().trim().max(40).optional(),
});

export const updateTaskSchema = insertTaskSchema.partial().extend({
  status: z.enum(["pending", "completed"]).optional(),
});

export type InsertTaskInput = z.infer<typeof insertTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const insertReportSchema = z.object({
  taskNumber: z.string().trim().max(120).optional(),
  deviceCount: z.coerce.number().int().min(0).max(10000).optional(),
  html: z.string().min(20, "Report HTML is required").max(20 * 1024 * 1024),
  deviceJson: z.unknown().optional(),
});
export type InsertReportInput = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, "password">;
export type Profile = typeof profiles.$inferSelect;

export type UserProfileDto = {
  employeeName: string;
  employeeId: string;
  businessId: string;
  telephoneNumber: string;
  emailAddress: string;
};

// ============================================================
// Admin / back-office
// ============================================================

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminRoles = pgTable("admin_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  permissions: jsonb("permissions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isSystem: text("is_system").notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminUserRoles = pgTable("admin_user_roles", {
  adminId: varchar("admin_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  roleId: varchar("role_id")
    .notNull()
    .references(() => adminRoles.id, { onDelete: "cascade" }),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id"),
  adminUsername: text("admin_username").notNull().default(""),
  action: text("action").notNull(),
  resource: text("resource").notNull().default(""),
  resourceId: text("resource_id").notNull().default(""),
  detail: jsonb("detail"),
  ip: text("ip").notNull().default(""),
  status: integer("status").notNull().default(200),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminRole = typeof adminRoles.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type PublicAdminUser = Omit<AdminUser, "password"> & {
  roles: AdminRole[];
};

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(120),
  password: z.string().min(1, "Password is required"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const adminChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;

export const insertAdminUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(120),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().trim().max(120).optional(),
  roleIds: z.array(z.string()).default([]),
});
export const updateAdminUserSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  roleIds: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

export const insertAdminRoleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(255).optional(),
  permissions: z.array(z.string()).default([]),
});
export const updateAdminRoleSchema = insertAdminRoleSchema.partial();

export const insertBusinessSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().max(200).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});
export const updateBusinessSchema = insertBusinessSchema.partial();

export const adminUserUpdateSchema = z.object({
  status: z.enum(["active", "disabled"]).optional(),
  businessId: z.string().trim().max(60).optional(),
});

export const adminResetUserPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// All known permission codes (used by UI dropdowns and middleware checks)
export const ALL_PERMISSIONS = [
  "dashboard.read",
  "users.read",
  "users.write",
  "tasks.read",
  "tasks.write",
  "reports.read",
  "reports.write",
  "businesses.read",
  "businesses.write",
  "admins.read",
  "admins.write",
  "audit.read",
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];
