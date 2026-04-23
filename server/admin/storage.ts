import { and, desc, eq, sql, isNull, inArray, gte } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  profiles,
  tasks,
  reports,
  adminUsers,
  adminRoles,
  adminUserRoles,
  auditLogs,
  businesses,
  type AdminUser,
  type AdminRole,
  type AuditLog,
  type Business,
  type User,
  type Task,
  type Report,
} from "@shared/schema";

export type AdminUserWithRoles = AdminUser & { roles: AdminRole[] };

export const adminStore = {
  // ───── Admin auth ─────
  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const rows = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);
    return rows[0];
  },

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const rows = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    return rows[0];
  },

  async getAdminWithRoles(id: string): Promise<AdminUserWithRoles | undefined> {
    const admin = await this.getAdminById(id);
    if (!admin) return undefined;
    const roles = await this.listRolesForAdmin(id);
    return { ...admin, roles };
  },

  async createAdmin(fields: {
    username: string;
    passwordHash: string;
    displayName?: string;
  }): Promise<AdminUser> {
    const rows = await db
      .insert(adminUsers)
      .values({
        username: fields.username,
        password: fields.passwordHash,
        displayName: fields.displayName ?? "",
      })
      .returning();
    return rows[0];
  },

  async updateAdmin(
    id: string,
    fields: Partial<{ password: string; displayName: string; status: string }>,
  ): Promise<AdminUser | undefined> {
    const updates: Record<string, unknown> = {};
    if (fields.password !== undefined) updates.password = fields.password;
    if (fields.displayName !== undefined)
      updates.displayName = fields.displayName;
    if (fields.status !== undefined) updates.status = fields.status;
    if (Object.keys(updates).length === 0) {
      return this.getAdminById(id);
    }
    const rows = await db
      .update(adminUsers)
      .set(updates)
      .where(eq(adminUsers.id, id))
      .returning();
    return rows[0];
  },

  async deleteAdmin(id: string): Promise<boolean> {
    const rows = await db
      .delete(adminUsers)
      .where(eq(adminUsers.id, id))
      .returning({ id: adminUsers.id });
    return rows.length > 0;
  },

  async listAdmins(): Promise<AdminUserWithRoles[]> {
    const admins = await db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
    if (admins.length === 0) return [];
    const links = await db
      .select()
      .from(adminUserRoles)
      .where(inArray(adminUserRoles.adminId, admins.map((a) => a.id)));
    const allRoleIds = Array.from(new Set(links.map((l) => l.roleId)));
    const roles = allRoleIds.length
      ? await db.select().from(adminRoles).where(inArray(adminRoles.id, allRoleIds))
      : [];
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const grouped = new Map<string, AdminRole[]>();
    for (const link of links) {
      const r = roleMap.get(link.roleId);
      if (!r) continue;
      const arr = grouped.get(link.adminId) ?? [];
      arr.push(r);
      grouped.set(link.adminId, arr);
    }
    return admins.map((a) => ({ ...a, roles: grouped.get(a.id) ?? [] }));
  },

  async listRolesForAdmin(adminId: string): Promise<AdminRole[]> {
    return db
      .select({
        id: adminRoles.id,
        name: adminRoles.name,
        description: adminRoles.description,
        permissions: adminRoles.permissions,
        isSystem: adminRoles.isSystem,
        createdAt: adminRoles.createdAt,
      })
      .from(adminUserRoles)
      .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
      .where(eq(adminUserRoles.adminId, adminId));
  },

  async setAdminRoles(adminId: string, roleIds: string[]): Promise<void> {
    await db
      .delete(adminUserRoles)
      .where(eq(adminUserRoles.adminId, adminId));
    if (roleIds.length === 0) return;
    await db.insert(adminUserRoles).values(
      roleIds.map((roleId) => ({ adminId, roleId })),
    );
  },

  // ───── Roles ─────
  async listRoles(): Promise<AdminRole[]> {
    return db.select().from(adminRoles).orderBy(desc(adminRoles.createdAt));
  },

  async getRole(id: string): Promise<AdminRole | undefined> {
    const rows = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.id, id))
      .limit(1);
    return rows[0];
  },

  async getRoleByName(name: string): Promise<AdminRole | undefined> {
    const rows = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.name, name))
      .limit(1);
    return rows[0];
  },

  async createRole(fields: {
    name: string;
    description?: string;
    permissions: string[];
    isSystem?: boolean;
  }): Promise<AdminRole> {
    const rows = await db
      .insert(adminRoles)
      .values({
        name: fields.name,
        description: fields.description ?? "",
        permissions: fields.permissions,
        isSystem: fields.isSystem ? "true" : "false",
      })
      .returning();
    return rows[0];
  },

  async updateRole(
    id: string,
    fields: Partial<{ name: string; description: string; permissions: string[] }>,
  ): Promise<AdminRole | undefined> {
    const updates: Record<string, unknown> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.description !== undefined)
      updates.description = fields.description;
    if (fields.permissions !== undefined)
      updates.permissions = fields.permissions;
    if (Object.keys(updates).length === 0) return this.getRole(id);
    const rows = await db
      .update(adminRoles)
      .set(updates)
      .where(eq(adminRoles.id, id))
      .returning();
    return rows[0];
  },

  async deleteRole(id: string): Promise<boolean> {
    const role = await this.getRole(id);
    if (!role) return false;
    if (role.isSystem === "true") {
      throw new Error("Cannot delete a system role");
    }
    const rows = await db
      .delete(adminRoles)
      .where(eq(adminRoles.id, id))
      .returning({ id: adminRoles.id });
    return rows.length > 0;
  },

  // ───── Users (managed view across all tenants) ─────
  async listAllUsers(opts?: { search?: string; status?: string; businessId?: string }) {
    const conds: any[] = [];
    if (opts?.status) conds.push(eq(users.status, opts.status));
    if (opts?.businessId) conds.push(eq(users.businessId, opts.businessId));
    if (opts?.search) {
      conds.push(sql`${users.email} ILIKE ${"%" + opts.search + "%"}`);
    }
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        businessId: users.businessId,
        status: users.status,
        createdAt: users.createdAt,
        employeeName: profiles.employeeName,
        employeeId: profiles.employeeId,
        telephoneNumber: profiles.telephoneNumber,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(conds.length ? and(...conds) : sql`true`)
      .orderBy(desc(users.createdAt));
    return rows;
  },

  async getUserDetail(id: string) {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        businessId: users.businessId,
        status: users.status,
        createdAt: users.createdAt,
        employeeName: profiles.employeeName,
        employeeId: profiles.employeeId,
        telephoneNumber: profiles.telephoneNumber,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, id))
      .limit(1);
    return rows[0];
  },

  async updateUserAdmin(
    id: string,
    fields: Partial<{ status: string; businessId: string }>,
  ): Promise<User | undefined> {
    const updates: Record<string, unknown> = {};
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.businessId !== undefined) updates.businessId = fields.businessId;
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0];
    }
    const rows = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return rows[0];
  },

  async resetUserPassword(id: string, passwordHash: string): Promise<boolean> {
    const rows = await db
      .update(users)
      .set({ password: passwordHash })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return rows.length > 0;
  },

  // ───── Tasks (managed across all users) ─────
  async listAllTasks(opts?: { status?: string; businessId?: string; search?: string }) {
    const conds: any[] = [isNull(tasks.deletedAt)];
    if (opts?.status) conds.push(eq(tasks.status, opts.status));
    if (opts?.businessId) conds.push(eq(users.businessId, opts.businessId));
    if (opts?.search) {
      conds.push(
        sql`(${tasks.title} ILIKE ${"%" + opts.search + "%"} OR ${tasks.taskId} ILIKE ${"%" + opts.search + "%"} OR ${tasks.address} ILIKE ${"%" + opts.search + "%"})`,
      );
    }
    return db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        title: tasks.title,
        taskId: tasks.taskId,
        address: tasks.address,
        stateProvince: tasks.stateProvince,
        postalCode: tasks.postalCode,
        client: tasks.client,
        contactNumber: tasks.contactNumber,
        inspectionDate: tasks.inspectionDate,
        status: tasks.status,
        createdAt: tasks.createdAt,
        userEmail: users.email,
        businessId: users.businessId,
      })
      .from(tasks)
      .innerJoin(users, eq(users.id, tasks.userId))
      .where(and(...conds))
      .orderBy(desc(tasks.createdAt));
  },

  async getTaskAdmin(id: string) {
    const rows = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        title: tasks.title,
        taskId: tasks.taskId,
        address: tasks.address,
        stateProvince: tasks.stateProvince,
        postalCode: tasks.postalCode,
        client: tasks.client,
        contactNumber: tasks.contactNumber,
        inspectionDate: tasks.inspectionDate,
        status: tasks.status,
        createdAt: tasks.createdAt,
        userEmail: users.email,
        businessId: users.businessId,
      })
      .from(tasks)
      .innerJoin(users, eq(users.id, tasks.userId))
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);
    return rows[0];
  },

  async updateTaskAdmin(
    id: string,
    fields: Partial<{ status: string; userId: string }>,
  ): Promise<Task | undefined> {
    const updates: Record<string, unknown> = {};
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.userId !== undefined) updates.userId = fields.userId;
    if (Object.keys(updates).length === 0) return undefined;
    const rows = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .returning();
    return rows[0];
  },

  async deleteTaskAdmin(id: string): Promise<boolean> {
    const rows = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .returning({ id: tasks.id });
    return rows.length > 0;
  },

  // ───── Reports (managed across all users) ─────
  async listAllReports(opts?: {
    businessId?: string;
    search?: string;
    fromDate?: Date;
  }) {
    const conds: any[] = [];
    if (opts?.businessId) conds.push(eq(users.businessId, opts.businessId));
    if (opts?.search) {
      conds.push(
        sql`(${reports.taskNumber} ILIKE ${"%" + opts.search + "%"} OR ${tasks.title} ILIKE ${"%" + opts.search + "%"})`,
      );
    }
    if (opts?.fromDate) conds.push(gte(reports.createdAt, opts.fromDate));
    return db
      .select({
        id: reports.id,
        userId: reports.userId,
        taskId: reports.taskId,
        taskNumber: reports.taskNumber,
        deviceCount: reports.deviceCount,
        createdAt: reports.createdAt,
        deviceJson: reports.deviceJson,
        taskTitle: tasks.title,
        taskAddress: tasks.address,
        userEmail: users.email,
        businessId: users.businessId,
      })
      .from(reports)
      .innerJoin(tasks, eq(tasks.id, reports.taskId))
      .innerJoin(users, eq(users.id, reports.userId))
      .where(conds.length ? and(...conds) : sql`true`)
      .orderBy(desc(reports.createdAt));
  },

  async getReportDetailAdmin(id: string): Promise<Report | undefined> {
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    return rows[0];
  },

  // ───── Businesses ─────
  async listBusinesses(): Promise<Business[]> {
    return db.select().from(businesses).orderBy(desc(businesses.createdAt));
  },

  async getBusinessByCode(code: string): Promise<Business | undefined> {
    const rows = await db
      .select()
      .from(businesses)
      .where(eq(businesses.code, code))
      .limit(1);
    return rows[0];
  },

  async createBusiness(fields: { code: string; name?: string; status?: string }) {
    const rows = await db
      .insert(businesses)
      .values({
        code: fields.code,
        name: fields.name ?? "",
        status: fields.status ?? "active",
      })
      .returning();
    return rows[0];
  },

  async updateBusiness(
    id: string,
    fields: Partial<{ code: string; name: string; status: string }>,
  ) {
    const updates: Record<string, unknown> = {};
    for (const k of ["code", "name", "status"] as const) {
      if (fields[k] !== undefined) updates[k] = fields[k];
    }
    if (Object.keys(updates).length === 0) return undefined;
    const rows = await db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, id))
      .returning();
    return rows[0];
  },

  async deleteBusiness(id: string): Promise<boolean> {
    const rows = await db
      .delete(businesses)
      .where(eq(businesses.id, id))
      .returning({ id: businesses.id });
    return rows.length > 0;
  },

  // ───── Audit logs ─────
  async writeAudit(entry: {
    adminId?: string | null;
    adminUsername?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    detail?: unknown;
    ip?: string;
    status?: number;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      adminId: entry.adminId ?? null,
      adminUsername: entry.adminUsername ?? "",
      action: entry.action,
      resource: entry.resource ?? "",
      resourceId: entry.resourceId ?? "",
      detail: entry.detail ?? null,
      ip: entry.ip ?? "",
      status: entry.status ?? 200,
    });
  },

  async listAudit(opts?: { limit?: number; offset?: number; adminId?: string }): Promise<AuditLog[]> {
    const conds: any[] = [];
    if (opts?.adminId) conds.push(eq(auditLogs.adminId, opts.adminId));
    return db
      .select()
      .from(auditLogs)
      .where(conds.length ? and(...conds) : sql`true`)
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(opts?.limit ?? 100, 500))
      .offset(opts?.offset ?? 0);
  },

  // ───── Dashboard stats ─────
  async dashboardStats(
    granularity: "day" | "week" | "month" = "week",
  ) {
    const [userCount] = await db
      .select({ c: sql<string>`count(*)::text` })
      .from(users);
    const [taskCount] = await db
      .select({ c: sql<string>`count(*)::text` })
      .from(tasks)
      .where(isNull(tasks.deletedAt));
    const [pendingCount] = await db
      .select({ c: sql<string>`count(*)::text` })
      .from(tasks)
      .where(and(isNull(tasks.deletedAt), eq(tasks.status, "pending")));
    const [reportCount] = await db
      .select({ c: sql<string>`count(*)::text` })
      .from(reports);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [todayReports] = await db
      .select({ c: sql<string>`count(*)::text` })
      .from(reports)
      .where(gte(reports.createdAt, since));
    const [businessCount] = await db
      .select({ c: sql<string>`count(*)::text` })
      .from(businesses);

    // Build the time-series trend buckets based on granularity.
    //   day   → last 14 days, bucket key 'YYYY-MM-DD'
    //   week  → last 12 ISO weeks (Mon-start), bucket key = Mon of that week 'YYYY-MM-DD'
    //   month → last 12 months, bucket key = first day of month 'YYYY-MM-01'
    const now = new Date();
    let fromDate: Date;
    let buckets: string[] = [];
    let bucketSql;

    if (granularity === "day") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 13);
      fromDate.setHours(0, 0, 0, 0);
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets.push(d.toISOString().slice(0, 10));
      }
      bucketSql = sql<string>`to_char(${reports.createdAt}, 'YYYY-MM-DD')`;
    } else if (granularity === "week") {
      // ISO week starts Monday
      const startOfWeek = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        const day = x.getDay(); // 0=Sun..6=Sat
        const diff = (day + 6) % 7; // days since Monday
        x.setDate(x.getDate() - diff);
        return x;
      };
      const thisWeek = startOfWeek(now);
      fromDate = new Date(thisWeek);
      fromDate.setDate(thisWeek.getDate() - 7 * 11);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(thisWeek);
        d.setDate(thisWeek.getDate() - 7 * i);
        buckets.push(d.toISOString().slice(0, 10));
      }
      bucketSql = sql<string>`to_char(date_trunc('week', ${reports.createdAt}), 'YYYY-MM-DD')`;
    } else {
      // month
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = new Date(thisMonth);
      fromDate.setMonth(thisMonth.getMonth() - 11);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(thisMonth);
        d.setMonth(thisMonth.getMonth() - i);
        buckets.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        );
      }
      bucketSql = sql<string>`to_char(date_trunc('month', ${reports.createdAt}), 'YYYY-MM-DD')`;
    }

    const rows = await db
      .select({
        bucket: bucketSql,
        count: sql<string>`count(*)::text`,
      })
      .from(reports)
      .where(gte(reports.createdAt, fromDate))
      .groupBy(bucketSql)
      .orderBy(bucketSql);

    const map = new Map(rows.map((r) => [r.bucket, Number(r.count)]));
    const trend = buckets.map((b) => ({ day: b, count: map.get(b) ?? 0 }));

    return {
      users: Number(userCount.c),
      tasks: Number(taskCount.c),
      pendingTasks: Number(pendingCount.c),
      reports: Number(reportCount.c),
      reportsToday: Number(todayReports.c),
      businesses: Number(businessCount.c),
      granularity,
      trend,
    };
  },
};
