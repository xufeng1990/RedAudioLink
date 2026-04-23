import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import { ZodError } from "zod";
import multer from "multer";
import { storage } from "./storage";
import { parseWav, ensureCliBuilt } from "./audio-parser";
import { registerAdminRoutes } from "./admin/routes";
import { ensureAdminSeed } from "./admin/seed";
import { adminStore } from "./admin/storage";
import {
  insertUserSchema,
  insertTaskSchema,
  updateTaskSchema,
  insertReportSchema,
  loginSchema,
  updateProfileSchema,
  type PublicUser,
  type Profile,
  type User,
  type UserProfileDto,
} from "@shared/schema";

const TOKEN_TTL = "30d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production",
    );
  }
  // Development-only fallback. Refusing in production above.
  return "dev-only-insecure-secret-do-not-use-in-prod-please";
}

const JWT_SECRET = getJwtSecret();

const VALID_BUSINESS_IDS = new Set([
  "BUS-12345",
  "BUS-00001",
  "BUS-99999",
  "DEMO001",
]);

function toPublic(user: {
  id: string;
  email: string;
  businessId: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    businessId: user.businessId,
    createdAt: user.createdAt,
  };
}

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const headerTok = header.startsWith("Bearer ") ? header.slice(7) : null;
  // Allow GETs to also carry the token via ?token= so browser-opened
  // links (PDF preview, downloads) can authenticate without setting headers.
  const queryTok =
    req.method === "GET" && typeof req.query.token === "string"
      ? (req.query.token as string)
      : null;
  const token = headerTok || queryTok;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; kind?: string };
    // Only accept user tokens (legacy tokens without kind, or kind === "user").
    if (payload.kind && payload.kind !== "user") {
      return res.status(401).json({ message: "Wrong token type" });
    }
    const user = await storage.getUser(payload.sub);
    if (!user) return res.status(401).json({ message: "User not found" });
    if ((user as any).status === "disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }
    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

async function isValidBusinessId(code: string): Promise<boolean> {
  const upper = code.toUpperCase();
  if (VALID_BUSINESS_IDS.has(upper)) return true;
  try {
    const biz = await adminStore.getBusinessByCode(upper);
    return !!biz && biz.status === "active";
  } catch {
    return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use(cors({ origin: true, credentials: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Admin platform: /admin/api/* routes
  registerAdminRoutes(app);
  ensureAdminSeed().catch((err) =>
    console.error("[admin-seed] failed:", err),
  );

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      if (!(await isValidBusinessId(data.businessId))) {
        return res.status(400).json({
          message: "Business ID does not exist. Please check and try again",
        });
      }
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const hashed = await bcrypt.hash(data.password, 10);
      let user;
      try {
        user = await storage.createUser({
          email: data.email,
          password: hashed,
          businessId: data.businessId.toUpperCase(),
        });
      } catch (e: any) {
        if (e?.code === "23505") {
          return res.status(409).json({ message: "Email already registered" });
        }
        throw e;
      }
      try {
        await storage.allocateEmployeeIdForUser(user.id, user.businessId);
      } catch (profileErr) {
        console.error("Failed to seed profile for new user", profileErr);
      }
      const token = signToken(user.id);
      res.status(201).json({ token, user: toPublic(user) });
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0]?.message || "Invalid input" });
      }
      next(err);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const ok = await bcrypt.compare(data.password, user.password);
      if (!ok) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if ((user as any).status === "disabled") {
        return res.status(403).json({ message: "Account disabled" });
      }
      const token = signToken(user.id);
      res.json({ token, user: toPublic(user) });
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0]?.message || "Invalid input" });
      }
      next(err);
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = (req as any).user;
    res.json({ user: toPublic(user) });
  });

  function buildProfileDto(user: User, profile?: Profile): UserProfileDto {
    return {
      employeeName: profile?.employeeName ?? "",
      employeeId: profile?.employeeId ?? "",
      businessId: user.businessId,
      telephoneNumber: profile?.telephoneNumber ?? "",
      emailAddress: user.email,
    };
  }

  app.get("/api/profile", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user as User;
      const profile = await storage.getProfile(user.id);
      res.json({ profile: buildProfileDto(user, profile) });
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res, next) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      const user = (req as any).user as User;

      const userUpdates: { email?: string; businessId?: string } = {};
      if (data.businessId !== undefined) {
        const biz = data.businessId.toUpperCase();
        if (!(await isValidBusinessId(biz))) {
          return res.status(400).json({
            message: "Business ID does not exist. Please check and try again",
          });
        }
        userUpdates.businessId = biz;
      }
      if (data.emailAddress !== undefined) {
        const newEmail = data.emailAddress.toLowerCase();
        if (newEmail !== user.email) {
          const existing = await storage.getUserByEmail(newEmail);
          if (existing && existing.id !== user.id) {
            return res
              .status(409)
              .json({ message: "Email already registered" });
          }
          userUpdates.email = newEmail;
        }
      }

      let updatedUser = user;
      if (Object.keys(userUpdates).length > 0) {
        try {
          updatedUser = await storage.updateUser(user.id, userUpdates);
        } catch (e: any) {
          if (e?.code === "23505") {
            return res
              .status(409)
              .json({ message: "Email already registered" });
          }
          throw e;
        }
      }

      // employeeId is auto-generated at registration and is NOT user-editable.
      const profileUpdates: {
        employeeName?: string;
        telephoneNumber?: string;
      } = {};
      if (data.employeeName !== undefined)
        profileUpdates.employeeName = data.employeeName;
      if (data.telephoneNumber !== undefined)
        profileUpdates.telephoneNumber = data.telephoneNumber;

      let profile = await storage.getProfile(updatedUser.id);
      if (Object.keys(profileUpdates).length > 0 || !profile) {
        profile = await storage.upsertProfile(updatedUser.id, profileUpdates);
      }

      res.json({ profile: buildProfileDto(updatedUser, profile) });
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0]?.message || "Invalid input" });
      }
      next(err);
    }
  });

  app.get("/api/tasks", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user as User;
      const items = await storage.listTasks(user.id);
      res.json({ tasks: items });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res, next) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const user = (req as any).user as User;
      const created = await storage.createTask(user.id, data);
      res.status(201).json({ task: created });
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0]?.message || "Invalid input" });
      }
      next(err);
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const data = updateTaskSchema.parse(req.body);
      const user = (req as any).user as User;
      const updated = await storage.updateTask(user.id, req.params.id, data);
      if (!updated) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ task: updated });
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ message: err.errors[0]?.message || "Invalid input" });
      }
      next(err);
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user as User;
      const ok = await storage.deleteTask(user.id, req.params.id);
      if (!ok) return res.status(404).json({ message: "Task not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Reports: persist a generated inspection-report HTML for a task and
  // expose it for retrieval / printing. The HTML can be large because it
  // embeds base64 photos, so we apply a per-route raw body limit.
  const reportJson = express.json({ limit: "20mb" });

  app.post(
    "/api/tasks/:taskId/reports",
    requireAuth,
    reportJson,
    async (req, res, next) => {
      try {
        const data = insertReportSchema.parse(req.body);
        const user = (req as any).user as User;
        const task = await storage.getTask(user.id, req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });
        const report = await storage.createReport(user.id, task.id, {
          taskNumber: data.taskNumber,
          deviceCount: data.deviceCount,
          html: data.html,
          deviceJson: data.deviceJson,
        });
        res.status(201).json({
          report: {
            id: report.id,
            taskId: report.taskId,
            taskNumber: report.taskNumber,
            deviceCount: Number(report.deviceCount) || 0,
            deviceJson: report.deviceJson ?? null,
            createdAt: report.createdAt,
          },
        });
      } catch (err) {
        if (err instanceof ZodError) {
          return res
            .status(400)
            .json({ message: err.errors[0]?.message || "Invalid input" });
        }
        next(err);
      }
    },
  );

  app.get("/api/tasks/:taskId/reports", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user as User;
      const task = await storage.getTask(user.id, req.params.taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      const items = await storage.listReports(user.id, task.id);
      res.json({
        reports: items.map((r) => ({
          id: r.id,
          taskId: r.taskId,
          taskNumber: r.taskNumber,
          deviceCount: Number(r.deviceCount) || 0,
          deviceJson: r.deviceJson ?? null,
          createdAt: r.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/reports/:id", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user as User;
      const report = await storage.getReport(user.id, req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(report.html);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/reports/:id/device-json", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user as User;
      const report = await storage.getReport(user.id, req.params.id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      res.json({
        id: report.id,
        taskId: report.taskId,
        taskNumber: report.taskNumber,
        deviceCount: Number(report.deviceCount) || 0,
        deviceJson: report.deviceJson ?? null,
        createdAt: report.createdAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // Audio parser: accept a recorded WAV upload (≤ 10MB), run it through
  // the proto_parse_cli binary, and return the decoded device JSON.
  const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  // Kick off a background build so the first request doesn't pay the cost.
  ensureCliBuilt().catch((err) => {
    console.error("[audio-parser] initial build failed:", err.message);
  });

  app.post(
    "/api/audio/parse",
    requireAuth,
    audioUpload.single("file"),
    async (req, res) => {
      const file = (req as any).file as { buffer: Buffer; size: number } | undefined;
      if (!file || !file.buffer?.length) {
        return res.status(400).json({ ok: false, error: "missing file" });
      }
      try {
        const out = await parseWav(file.buffer);
        if (!out.ok) {
          return res.status(422).json({ ok: false, error: out.error });
        }
        // Normalize the canonical Red Protocol JSON to the mobile client's
        // lowercase field names (kept for type-compat with existing screens).
        const d: any = out.data;
        const normalized = {
          model_no: d.model_no,
          sn: d.SN,
          date: d.date,
          duration: d.duration,
          sensor_status: d.sensor_status,
          battery_level: d.battery_level,
          battery: d.battery,
          dust_level: d.dust_level,
          ...(d.main_power_status !== undefined && { main_power_status: d.main_power_status }),
          ...(d.main_power_events && { main_power_events: d.main_power_events }),
          ...(d.Wrong_Wiring_events && { wrong_wiring_events: d.Wrong_Wiring_events }),
          ...(d.Wire_Interconnect_events && { wire_interconnect_events: d.Wire_Interconnect_events }),
          ...(d.Interconnect_events && { interconnect_events: d.Interconnect_events }),
          ...(d.low_battery_events && { low_battery_events: d.low_battery_events }),
          ...(d.test_button_pressed && { test_button_pressed: d.test_button_pressed }),
          ...(d.times_alarm_deactivated && { times_alarm_deactivated: d.times_alarm_deactivated }),
          ...(d.smoke_alarm && { smoke_alarm: d.smoke_alarm }),
        };
        return res.json({ ok: true, data: normalized, raw: out.data });
      } catch (err: any) {
        console.error("[audio-parser] parse error:", err);
        return res.status(500).json({ ok: false, error: err?.message || "parse failed" });
      }
    },
  );

  return httpServer;
}
