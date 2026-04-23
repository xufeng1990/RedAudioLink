import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { adminStore } from "./storage";
import { ALL_PERMISSIONS, type AdminUser, type AdminRole } from "@shared/schema";

const TOKEN_TTL = "12h";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return "dev-only-insecure-secret-do-not-use-in-prod-please";
}
const JWT_SECRET = getJwtSecret();

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, kind: "admin" }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

export type AdminRequest = Request & {
  admin: AdminUser;
  adminRoles: AdminRole[];
  adminPerms: Set<string>;
};

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; kind?: string };
    if (payload.kind !== "admin") {
      return res.status(401).json({ message: "Not an admin token" });
    }
    const detail = await adminStore.getAdminWithRoles(payload.sub);
    if (!detail || detail.status !== "active") {
      return res.status(401).json({ message: "Admin not found or disabled" });
    }
    const perms = new Set<string>();
    for (const role of detail.roles) {
      for (const p of role.permissions ?? []) perms.add(p);
    }
    // Super admin shortcut: role named "super" or has * perm
    if (detail.roles.some((r) => r.name === "super") || perms.has("*")) {
      for (const p of ALL_PERMISSIONS) perms.add(p);
      perms.add("*");
    }
    (req as AdminRequest).admin = detail;
    (req as AdminRequest).adminRoles = detail.roles;
    (req as AdminRequest).adminPerms = perms;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
}

export function requirePerm(perm: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms = (req as AdminRequest).adminPerms;
    if (!perms || (!perms.has("*") && !perms.has(perm))) {
      return res
        .status(403)
        .json({ message: `Forbidden: missing permission ${perm}` });
    }
    next();
  };
}

export function audit(action: string, resource = "") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    let resourceId = "";
    res.on("finish", () => {
      const admin = (req as AdminRequest).admin;
      adminStore
        .writeAudit({
          adminId: admin?.id,
          adminUsername: admin?.username,
          action,
          resource,
          resourceId: req.params?.id || resourceId,
          detail: {
            method: req.method,
            path: req.originalUrl,
            body: sanitize(req.body),
            durationMs: Date.now() - start,
          },
          ip:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            req.ip ||
            "",
          status: res.statusCode,
        })
        .catch((err) => console.error("[audit] write failed:", err));
    });
    next();
  };
}

function sanitize(body: unknown) {
  if (!body || typeof body !== "object") return body ?? null;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const k of Object.keys(clone)) {
    if (/(password|secret|token)/i.test(k)) clone[k] = "***";
  }
  return clone;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
