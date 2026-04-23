# Objective
Build admin management platform for the (Red) Inspection Checklist app.
Reuses existing Node/Express + Drizzle + React + Vite stack. Single
Express process serves both /api/* (mobile/user) and /admin/api/* (admin).
Single Vite SPA serves /admin/* routes for the admin UI.

# Tasks

### T001: Schema additions
- shared/schema.ts: admin_users, admin_roles, admin_user_roles, audit_logs
- Insert schemas + types
- npm run db:push

### T002: Admin storage methods
- IStorage extend: admin auth + lookups, role/permission, audit log writes,
  cross-user listings (all users / all tasks / all reports / business stats)

### T003: Admin auth + middleware
- requireAdmin middleware (Bearer JWT with kind="admin")
- audit log middleware
- Seed default super admin on startup

### T004: Admin routes (all 8 features)
- /admin/api/auth/{login,me,logout,change-password}
- /admin/api/dashboard/stats
- /admin/api/users (list/get/disable/enable/reset-password)
- /admin/api/tasks (list across users / detail / reassign / status)
- /admin/api/reports (list / detail / device-json / html / export)
- /admin/api/businesses (CRUD)
- /admin/api/admins (CRUD) + /admin/api/roles (CRUD)
- /admin/api/audit (paged list)

### T005: Admin SPA shell
- /admin/* routing, layout (sidebar + topbar), auth context
- API client with admin token from localStorage
- Login page

### T006: Feature pages
- Dashboard
- Users
- Tasks
- Reports
- Businesses
- Admins / Roles
- Audit log

# Notes
- Default seed admin: username=admin, password=admin123 (must change)
- Existing users table needs `status` column for enable/disable — add as part of T001
- Business is currently a free-text `business_id` on users with whitelist in
  routes.ts (BUS-12345 etc). T001 also adds `businesses` table to make them
  managed. routes.ts will fall back to checking the table.
