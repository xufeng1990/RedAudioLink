import { adminStore } from "./storage";
import { hashPassword } from "./auth";
import { ALL_PERMISSIONS } from "@shared/schema";

const DEFAULT_ADMIN_USERNAME =
  process.env.ADMIN_DEFAULT_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD =
  process.env.ADMIN_DEFAULT_PASSWORD || "admin123";

const DEFAULT_BUSINESSES = ["BUS-12345", "BUS-00001", "BUS-99999", "DEMO001"];

export async function ensureAdminSeed(): Promise<void> {
  // Seed roles
  let superRole = await adminStore.getRoleByName("super");
  if (!superRole) {
    superRole = await adminStore.createRole({
      name: "super",
      description: "Super administrator (all permissions)",
      permissions: ["*"],
      isSystem: true,
    });
  }
  if (!(await adminStore.getRoleByName("operator"))) {
    await adminStore.createRole({
      name: "operator",
      description: "Operator (read all, manage tasks/reports)",
      permissions: [
        "dashboard.read",
        "users.read",
        "tasks.read",
        "tasks.write",
        "reports.read",
        "reports.write",
        "businesses.read",
      ],
      isSystem: true,
    });
  }
  if (!(await adminStore.getRoleByName("auditor"))) {
    await adminStore.createRole({
      name: "auditor",
      description: "Read-only auditor",
      permissions: ALL_PERMISSIONS.filter((p) => p.endsWith(".read")),
      isSystem: true,
    });
  }

  // Seed default super admin if none exists
  const existing = await adminStore.getAdminByUsername(DEFAULT_ADMIN_USERNAME);
  if (!existing) {
    const hashed = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    const admin = await adminStore.createAdmin({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: hashed,
      displayName: "Super Admin",
    });
    await adminStore.setAdminRoles(admin.id, [superRole.id]);
    console.log(
      `[admin-seed] Default admin created: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`,
    );
  }

  // Seed business whitelist into the businesses table on first run
  for (const code of DEFAULT_BUSINESSES) {
    if (!(await adminStore.getBusinessByCode(code))) {
      await adminStore.createBusiness({ code, name: code });
    }
  }
}
