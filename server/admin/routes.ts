import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { adminStore } from "./storage";
import {
  audit,
  hashPassword,
  requireAdmin,
  requirePerm,
  signAdminToken,
  verifyPassword,
  type AdminRequest,
} from "./auth";
import {
  ALL_PERMISSIONS,
  adminChangePasswordSchema,
  adminLoginSchema,
  adminResetUserPasswordSchema,
  adminUserUpdateSchema,
  insertAdminRoleSchema,
  insertAdminUserSchema,
  insertBusinessSchema,
  updateAdminRoleSchema,
  updateAdminUserSchema,
  updateBusinessSchema,
  updateTaskSchema,
} from "@shared/schema";

function publicAdmin(detail: { id: string; username: string; displayName: string; status: string; createdAt: Date; roles: { id: string; name: string; description: string; permissions: string[]; isSystem: string; createdAt: Date }[] }) {
  return {
    id: detail.id,
    username: detail.username,
    displayName: detail.displayName,
    status: detail.status,
    createdAt: detail.createdAt,
    roles: detail.roles,
  };
}

function handleZod(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ message: err.errors[0]?.message || "Invalid input" });
    return true;
  }
  return false;
}

export function registerAdminRoutes(app: Express): void {
  const r = express.Router();
  r.use(express.json({ limit: "2mb" }));

  // ─────────── Auth ───────────
  r.post("/auth/login", audit("admin.login", "auth"), async (req, res, next) => {
    try {
      const data = adminLoginSchema.parse(req.body);
      const admin = await adminStore.getAdminByUsername(data.username);
      if (!admin || admin.status !== "active") {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const ok = await verifyPassword(data.password, admin.password);
      if (!ok) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const detail = await adminStore.getAdminWithRoles(admin.id);
      const token = signAdminToken(admin.id);
      res.json({ token, admin: detail ? publicAdmin(detail) : null });
    } catch (err) {
      if (handleZod(err, res)) return;
      next(err);
    }
  });

  r.get("/auth/me", requireAdmin, (req, res) => {
    const detail = (req as AdminRequest).admin as any;
    const roles = (req as AdminRequest).adminRoles;
    const perms = Array.from((req as AdminRequest).adminPerms);
    res.json({
      admin: publicAdmin({ ...detail, roles }),
      permissions: perms,
    });
  });

  r.post(
    "/auth/change-password",
    requireAdmin,
    audit("admin.change-password", "auth"),
    async (req, res, next) => {
      try {
        const data = adminChangePasswordSchema.parse(req.body);
        const admin = (req as AdminRequest).admin;
        const ok = await verifyPassword(data.oldPassword, admin.password);
        if (!ok) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }
        const hashed = await hashPassword(data.newPassword);
        await adminStore.updateAdmin(admin.id, { password: hashed });
        res.json({ ok: true });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  // ─────────── Dashboard ───────────
  r.get(
    "/dashboard/stats",
    requireAdmin,
    requirePerm("dashboard.read"),
    async (req, res, next) => {
      try {
        const raw = String(req.query.granularity || "week");
        const granularity: "day" | "week" | "month" =
          raw === "day" || raw === "month" ? raw : "week";
        const stats = await adminStore.dashboardStats(granularity);
        res.json(stats);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────── Users (managed users / technicians) ───────────
  r.get(
    "/users",
    requireAdmin,
    requirePerm("users.read"),
    async (req, res, next) => {
      try {
        const search = (req.query.search as string) || undefined;
        const status = (req.query.status as string) || undefined;
        const businessId = (req.query.businessId as string) || undefined;
        const items = await adminStore.listAllUsers({ search, status, businessId });
        res.json({ users: items });
      } catch (err) {
        next(err);
      }
    },
  );

  r.get(
    "/users/:id",
    requireAdmin,
    requirePerm("users.read"),
    async (req, res, next) => {
      try {
        const u = await adminStore.getUserDetail(req.params.id);
        if (!u) return res.status(404).json({ message: "User not found" });
        res.json({ user: u });
      } catch (err) {
        next(err);
      }
    },
  );

  r.patch(
    "/users/:id",
    requireAdmin,
    requirePerm("users.write"),
    audit("user.update", "user"),
    async (req, res, next) => {
      try {
        const data = adminUserUpdateSchema.parse(req.body);
        const updated = await adminStore.updateUserAdmin(req.params.id, data);
        if (!updated) return res.status(404).json({ message: "User not found" });
        res.json({ ok: true });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.post(
    "/users/:id/reset-password",
    requireAdmin,
    requirePerm("users.write"),
    audit("user.reset-password", "user"),
    async (req, res, next) => {
      try {
        const data = adminResetUserPasswordSchema.parse(req.body);
        const hashed = await hashPassword(data.newPassword);
        const ok = await adminStore.resetUserPassword(req.params.id, hashed);
        if (!ok) return res.status(404).json({ message: "User not found" });
        res.json({ ok: true });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  // ─────────── Tasks ───────────
  r.get(
    "/tasks",
    requireAdmin,
    requirePerm("tasks.read"),
    async (req, res, next) => {
      try {
        const items = await adminStore.listAllTasks({
          status: (req.query.status as string) || undefined,
          businessId: (req.query.businessId as string) || undefined,
          search: (req.query.search as string) || undefined,
        });
        res.json({ tasks: items });
      } catch (err) {
        next(err);
      }
    },
  );

  r.get(
    "/tasks/:id",
    requireAdmin,
    requirePerm("tasks.read"),
    async (req, res, next) => {
      try {
        const t = await adminStore.getTaskAdmin(req.params.id);
        if (!t) return res.status(404).json({ message: "Task not found" });
        res.json({ task: t });
      } catch (err) {
        next(err);
      }
    },
  );

  r.patch(
    "/tasks/:id",
    requireAdmin,
    requirePerm("tasks.write"),
    audit("task.update", "task"),
    async (req, res, next) => {
      try {
        const data = updateTaskSchema.parse(req.body);
        const updated = await adminStore.updateTaskAdmin(req.params.id, {
          status: data.status,
        });
        if (!updated) return res.status(404).json({ message: "Task not found" });
        res.json({ task: updated });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.delete(
    "/tasks/:id",
    requireAdmin,
    requirePerm("tasks.write"),
    audit("task.delete", "task"),
    async (req, res, next) => {
      try {
        const ok = await adminStore.deleteTaskAdmin(req.params.id);
        if (!ok) return res.status(404).json({ message: "Task not found" });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────── Reports ───────────
  r.get(
    "/reports",
    requireAdmin,
    requirePerm("reports.read"),
    async (req, res, next) => {
      try {
        const fromDateRaw = req.query.fromDate as string | undefined;
        const fromDate = fromDateRaw ? new Date(fromDateRaw) : undefined;
        const items = await adminStore.listAllReports({
          businessId: (req.query.businessId as string) || undefined,
          search: (req.query.search as string) || undefined,
          fromDate: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
        });
        res.json({
          reports: items.map((r) => ({
            ...r,
            deviceCount: Number(r.deviceCount) || 0,
          })),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  r.get(
    "/reports/:id",
    requireAdmin,
    requirePerm("reports.read"),
    async (req, res, next) => {
      try {
        const r2 = await adminStore.getReportDetailAdmin(req.params.id);
        if (!r2) return res.status(404).json({ message: "Report not found" });
        res.json({
          report: {
            id: r2.id,
            userId: r2.userId,
            taskId: r2.taskId,
            taskNumber: r2.taskNumber,
            deviceCount: Number(r2.deviceCount) || 0,
            deviceJson: r2.deviceJson ?? null,
            createdAt: r2.createdAt,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  r.get(
    "/reports/:id/html",
    requireAdmin,
    requirePerm("reports.read"),
    async (req, res, next) => {
      try {
        const r2 = await adminStore.getReportDetailAdmin(req.params.id);
        if (!r2) return res.status(404).json({ message: "Report not found" });
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.send(r2.html);
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────── Businesses ───────────
  r.get(
    "/businesses",
    requireAdmin,
    requirePerm("businesses.read"),
    async (_req, res, next) => {
      try {
        const items = await adminStore.listBusinesses();
        res.json({ businesses: items });
      } catch (err) {
        next(err);
      }
    },
  );

  r.post(
    "/businesses",
    requireAdmin,
    requirePerm("businesses.write"),
    audit("business.create", "business"),
    async (req, res, next) => {
      try {
        const data = insertBusinessSchema.parse(req.body);
        const code = data.code.toUpperCase();
        if (await adminStore.getBusinessByCode(code)) {
          return res.status(409).json({ message: "Business code already exists" });
        }
        const created = await adminStore.createBusiness({
          code,
          name: data.name,
          status: data.status,
        });
        res.status(201).json({ business: created });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.patch(
    "/businesses/:id",
    requireAdmin,
    requirePerm("businesses.write"),
    audit("business.update", "business"),
    async (req, res, next) => {
      try {
        const data = updateBusinessSchema.parse(req.body);
        const fields: any = { ...data };
        if (fields.code) fields.code = String(fields.code).toUpperCase();
        const updated = await adminStore.updateBusiness(req.params.id, fields);
        if (!updated)
          return res.status(404).json({ message: "Business not found" });
        res.json({ business: updated });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.delete(
    "/businesses/:id",
    requireAdmin,
    requirePerm("businesses.write"),
    audit("business.delete", "business"),
    async (req, res, next) => {
      try {
        const ok = await adminStore.deleteBusiness(req.params.id);
        if (!ok) return res.status(404).json({ message: "Business not found" });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────── Admins ───────────
  r.get(
    "/admins",
    requireAdmin,
    requirePerm("admins.read"),
    async (_req, res, next) => {
      try {
        const items = await adminStore.listAdmins();
        res.json({
          admins: items.map((a) => publicAdmin(a)),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  r.post(
    "/admins",
    requireAdmin,
    requirePerm("admins.write"),
    audit("admin.create", "admin"),
    async (req, res, next) => {
      try {
        const data = insertAdminUserSchema.parse(req.body);
        if (await adminStore.getAdminByUsername(data.username)) {
          return res.status(409).json({ message: "Username already exists" });
        }
        const hashed = await hashPassword(data.password);
        const created = await adminStore.createAdmin({
          username: data.username,
          passwordHash: hashed,
          displayName: data.displayName,
        });
        if (data.roleIds.length) {
          await adminStore.setAdminRoles(created.id, data.roleIds);
        }
        const detail = await adminStore.getAdminWithRoles(created.id);
        res.status(201).json({ admin: detail ? publicAdmin(detail) : null });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.patch(
    "/admins/:id",
    requireAdmin,
    requirePerm("admins.write"),
    audit("admin.update", "admin"),
    async (req, res, next) => {
      try {
        const data = updateAdminUserSchema.parse(req.body);
        const fields: Record<string, string> = {};
        if (data.displayName !== undefined) fields.displayName = data.displayName;
        if (data.status !== undefined) fields.status = data.status;
        if (data.password !== undefined) {
          fields.password = await hashPassword(data.password);
        }
        await adminStore.updateAdmin(req.params.id, fields);
        if (data.roleIds) {
          await adminStore.setAdminRoles(req.params.id, data.roleIds);
        }
        const detail = await adminStore.getAdminWithRoles(req.params.id);
        if (!detail) return res.status(404).json({ message: "Admin not found" });
        res.json({ admin: publicAdmin(detail) });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.delete(
    "/admins/:id",
    requireAdmin,
    requirePerm("admins.write"),
    audit("admin.delete", "admin"),
    async (req, res, next) => {
      try {
        const me = (req as AdminRequest).admin;
        if (me.id === req.params.id) {
          return res
            .status(400)
            .json({ message: "Cannot delete your own account" });
        }
        const ok = await adminStore.deleteAdmin(req.params.id);
        if (!ok) return res.status(404).json({ message: "Admin not found" });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // ─────────── Roles ───────────
  r.get(
    "/roles",
    requireAdmin,
    requirePerm("admins.read"),
    async (_req, res, next) => {
      try {
        const items = await adminStore.listRoles();
        res.json({ roles: items, allPermissions: ALL_PERMISSIONS });
      } catch (err) {
        next(err);
      }
    },
  );

  r.post(
    "/roles",
    requireAdmin,
    requirePerm("admins.write"),
    audit("role.create", "role"),
    async (req, res, next) => {
      try {
        const data = insertAdminRoleSchema.parse(req.body);
        if (await adminStore.getRoleByName(data.name)) {
          return res.status(409).json({ message: "Role name already exists" });
        }
        const created = await adminStore.createRole({
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        });
        res.status(201).json({ role: created });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.patch(
    "/roles/:id",
    requireAdmin,
    requirePerm("admins.write"),
    audit("role.update", "role"),
    async (req, res, next) => {
      try {
        const data = updateAdminRoleSchema.parse(req.body);
        const updated = await adminStore.updateRole(req.params.id, data);
        if (!updated) return res.status(404).json({ message: "Role not found" });
        res.json({ role: updated });
      } catch (err) {
        if (handleZod(err, res)) return;
        next(err);
      }
    },
  );

  r.delete(
    "/roles/:id",
    requireAdmin,
    requirePerm("admins.write"),
    audit("role.delete", "role"),
    async (req, res, next) => {
      try {
        const ok = await adminStore.deleteRole(req.params.id);
        if (!ok) return res.status(404).json({ message: "Role not found" });
        res.json({ ok: true });
      } catch (err: any) {
        if (err?.message?.includes("system role")) {
          return res.status(400).json({ message: err.message });
        }
        next(err);
      }
    },
  );

  // ─────────── Audit log ───────────
  r.get(
    "/audit",
    requireAdmin,
    requirePerm("audit.read"),
    async (req, res, next) => {
      try {
        const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
        const offset = parseInt((req.query.offset as string) || "0") || 0;
        const items = await adminStore.listAudit({ limit, offset });
        res.json({ logs: items });
      } catch (err) {
        next(err);
      }
    },
  );

  app.use("/admin/api", r);
}
