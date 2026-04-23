import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  profiles,
  tasks,
  reports,
  type User,
  type InsertUser,
  type Profile,
  type Task,
  type Report,
  type InsertTaskInput,
  type UpdateTaskInput,
} from "@shared/schema";

export type CreateReportFields = {
  taskNumber?: string;
  deviceCount?: number;
  html: string;
  deviceJson?: unknown;
};

export type ReportSummary = Omit<Report, "html" | "deviceJson"> & {
  deviceJson: unknown | null;
};

export type UpdateUserFields = Partial<Pick<User, "email" | "businessId">>;
export type UpsertProfileFields = Partial<
  Pick<Profile, "employeeName" | "employeeId" | "telephoneNumber">
>;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, fields: UpdateUserFields): Promise<User>;
  getUserCount(): Promise<number>;
  allocateEmployeeIdForUser(
    userId: string,
    businessId: string,
  ): Promise<string>;
  getProfile(userId: string): Promise<Profile | undefined>;
  upsertProfile(userId: string, fields: UpsertProfileFields): Promise<Profile>;
  listTasks(userId: string): Promise<Task[]>;
  getTask(userId: string, id: string): Promise<Task | undefined>;
  createTask(userId: string, input: InsertTaskInput): Promise<Task>;
  updateTask(
    userId: string,
    id: string,
    input: UpdateTaskInput,
  ): Promise<Task | undefined>;
  deleteTask(userId: string, id: string): Promise<boolean>;
  createReport(
    userId: string,
    taskId: string,
    fields: CreateReportFields,
  ): Promise<Report>;
  listReports(userId: string, taskId: string): Promise<ReportSummary[]>;
  getReport(userId: string, reportId: string): Promise<Report | undefined>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await db
      .insert(users)
      .values({
        email: insertUser.email.toLowerCase(),
        password: insertUser.password,
        businessId: insertUser.businessId,
      })
      .returning();
    return rows[0];
  }

  async updateUser(id: string, fields: UpdateUserFields): Promise<User> {
    const updates: Record<string, unknown> = {};
    if (fields.email !== undefined) updates.email = fields.email.toLowerCase();
    if (fields.businessId !== undefined) updates.businessId = fields.businessId;
    if (Object.keys(updates).length === 0) {
      const existing = await this.getUser(id);
      if (!existing) throw new Error("User not found");
      return existing;
    }
    const rows = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (!rows[0]) throw new Error("User not found");
    return rows[0];
  }

  async getUserCount(): Promise<number> {
    const rows = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(users);
    return Number(rows[0]?.count ?? 0);
  }

  async allocateEmployeeIdForUser(
    userId: string,
    businessId: string,
  ): Promise<string> {
    const biz = businessId.toUpperCase();
    return await db.transaction(async (tx) => {
      // Per-business advisory lock so concurrent registrations within the
      // same business serialize: the lock is held for the entire transaction,
      // covering both the MAX read and the profile write.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${biz}, 0))`,
      );
      const rows = await tx.execute(sql`
        SELECT COALESCE(
          MAX(CAST(${profiles.employeeId} AS INTEGER)),
          0
        ) AS max_id
        FROM ${profiles}
        INNER JOIN ${users} ON ${profiles.userId} = ${users.id}
        WHERE UPPER(${users.businessId}) = ${biz}
          AND ${profiles.employeeId} ~ '^[0-9]+$'
      `);
      const maxId = Number((rows as any).rows?.[0]?.max_id ?? 0);
      const employeeId = String(maxId + 1).padStart(4, "0");
      await tx
        .insert(profiles)
        .values({
          userId,
          employeeName: "",
          employeeId,
          telephoneNumber: "",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: { employeeId, updatedAt: new Date() },
        });
      return employeeId;
    });
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return rows[0];
  }

  async upsertProfile(
    userId: string,
    fields: UpsertProfileFields,
  ): Promise<Profile> {
    const values = {
      userId,
      employeeName: fields.employeeName ?? "",
      employeeId: fields.employeeId ?? "",
      telephoneNumber: fields.telephoneNumber ?? "",
      updatedAt: new Date(),
    };
    const setOnConflict: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.employeeName !== undefined)
      setOnConflict.employeeName = fields.employeeName;
    if (fields.employeeId !== undefined)
      setOnConflict.employeeId = fields.employeeId;
    if (fields.telephoneNumber !== undefined)
      setOnConflict.telephoneNumber = fields.telephoneNumber;
    const rows = await db
      .insert(profiles)
      .values(values)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: setOnConflict,
      })
      .returning();
    return rows[0];
  }

  async listTasks(userId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(userId: string, id: string): Promise<Task | undefined> {
    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, id),
          isNull(tasks.deletedAt),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async createTask(
    userId: string,
    input: InsertTaskInput,
  ): Promise<Task> {
    const rows = await db
      .insert(tasks)
      .values({
        userId,
        title: input.title,
        taskId: input.taskId,
        address: input.address,
        stateProvince: input.stateProvince,
        postalCode: input.postalCode,
        client: input.client ?? "",
        contactNumber: input.contactNumber ?? "",
        inspectionDate: input.inspectionDate ?? "",
      })
      .returning();
    return rows[0];
  }

  async updateTask(
    userId: string,
    id: string,
    input: UpdateTaskInput,
  ): Promise<Task | undefined> {
    const updates: Record<string, unknown> = {};
    for (const key of [
      "title",
      "taskId",
      "address",
      "stateProvince",
      "postalCode",
      "client",
      "contactNumber",
      "inspectionDate",
      "status",
    ] as const) {
      const v = (input as Record<string, unknown>)[key];
      if (v !== undefined) updates[key] = v;
    }
    if (Object.keys(updates).length === 0) {
      return this.getTask(userId, id);
    }
    const rows = await db
      .update(tasks)
      .set(updates)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, id),
          isNull(tasks.deletedAt),
        ),
      )
      .returning();
    return rows[0];
  }

  async deleteTask(userId: string, id: string): Promise<boolean> {
    // Soft delete: stamp deleted_at instead of removing the row so the
    // record can be recovered later if needed.
    const rows = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.id, id),
          isNull(tasks.deletedAt),
        ),
      )
      .returning({ id: tasks.id });
    return rows.length > 0;
  }

  async createReport(
    userId: string,
    taskId: string,
    fields: CreateReportFields,
  ): Promise<Report> {
    const rows = await db
      .insert(reports)
      .values({
        userId,
        taskId,
        taskNumber: fields.taskNumber ?? "",
        deviceCount: String(fields.deviceCount ?? 0),
        html: fields.html,
        deviceJson: fields.deviceJson ?? null,
      })
      .returning();
    return rows[0];
  }

  async listReports(
    userId: string,
    taskId: string,
  ): Promise<ReportSummary[]> {
    return db
      .select({
        id: reports.id,
        userId: reports.userId,
        taskId: reports.taskId,
        taskNumber: reports.taskNumber,
        deviceCount: reports.deviceCount,
        deviceJson: reports.deviceJson,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(and(eq(reports.userId, userId), eq(reports.taskId, taskId)))
      .orderBy(desc(reports.createdAt));
  }

  async getReport(
    userId: string,
    reportId: string,
  ): Promise<Report | undefined> {
    const rows = await db
      .select()
      .from(reports)
      .where(and(eq(reports.userId, userId), eq(reports.id, reportId)))
      .limit(1);
    return rows[0];
  }
}

export const storage: IStorage = new DbStorage();

