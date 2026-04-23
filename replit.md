# (Red) Inspection Checklist

A React Native (Expo) mobile app for smoke alarm / fire alarm inspection checklists, designed for the Australian market.

## Architecture

- **Mobile App**: `mobile/` — Expo React Native app (iOS + Android + Web)
- **Backend**: `server/` — Express.js API with Drizzle ORM + PostgreSQL

## Mobile App Structure

```
mobile/
├── App.tsx                    # Root component with state-based navigation
├── app.json                   # Expo config (name, bundle IDs, plugins)
├── src/
│   ├── screens/               # All app screens
│   │   ├── LoginScreen.tsx        # User authentication
│   │   ├── HomeScreen.tsx         # Property list
│   │   ├── PropertyDetailScreen.tsx # Devices at a property
│   │   ├── DeviceInspectionScreen.tsx # Report step (main checklist)
│   │   ├── InspectionActionScreen.tsx # Action step
│   │   ├── InspectionImageScreen.tsx  # Image/photo step
│   │   └── InspectionCompleteScreen.tsx # Completion summary
│   ├── theme/
│   │   └── colors.ts          # App color palette (red primary)
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   └── data/
│       └── mockData.ts        # Sample inspection data
```

## Inspection Flow

Login → Property List → Property Detail → Device Inspection (3 steps):
1. **Report**: Device info, sensor status, battery, alarm triggers, location
2. **Action**: Select actions taken during inspection
3. **Image**: Take/attach photos

## Key Features

- Smoke/fire alarm device inspection checklist
- Device details: Model, SN, replacement date, days remaining
- Sensor status (OK / FAULT / LOW_BATTERY)
- Battery voltage monitoring
- Alarm trigger history (Optical Sensor, Interconnection, etc.)
- Room location picker (type + number)
- Action recording with predefined options + custom notes
- Photo attachment via camera or library
- Inspection completion report

## Running

```bash
# Web preview (runs in browser)
cd mobile && npx expo start --web --port 5000

# Mobile (requires Expo Go app on phone)
cd mobile && npx expo start

# iOS simulator
cd mobile && npx expo start --ios

# Android emulator
cd mobile && npx expo start --android
```

## Publishing to App Stores

Uses EAS (Expo Application Services):
```bash
npm install -g eas-cli
cd mobile && eas login
eas build --platform all
eas submit --platform all
```

## Tech Stack

- **Framework**: React Native + Expo SDK 54
- **Language**: TypeScript
- **Navigation**: State-based (useState)
- **Camera/Photos**: expo-image-picker
- **Design**: Based on Figma design (澳洲APP-UI)
- **Colors**: Red primary (#C0392B)
- **Backend**: Express.js + Drizzle ORM + PostgreSQL

## Admin Platform

A React/Vite SPA mounted at `/admin/*` shares the same Express process and
PostgreSQL database. Built with shadcn/ui (already in `client/`).

```
server/admin/                    # Backend admin module
├── routes.ts                    # All /admin/api/* endpoints
├── auth.ts                      # JWT (kind="admin"), requireAdmin, audit logger
├── storage.ts                   # adminStore with cross-tenant queries
└── seed.ts                      # Default super admin + roles + business seed

client/src/admin/                # Admin SPA
├── AdminApp.tsx                 # Routing + auth guard
├── AdminLayout.tsx              # Sidebar + topbar + change-password
├── lib/api.ts                   # Bearer-token API client
├── lib/queryClient.ts           # Dedicated React Query client
├── lib/AuthContext.tsx          # useAdminAuth() hook (login/logout/perms)
├── lib/i18n.tsx                 # LangProvider + useT() — zh/en toggle (localStorage)
└── pages/                       # Dashboard, Users, Tasks, Reports,
                                 # Businesses, Admins (admins+roles), Audit
```

### Admin schema (in `shared/schema.ts`)
- `admin_users` / `admin_roles` / `admin_user_roles` — RBAC
- `audit_logs` — every admin write is recorded
- `businesses` — managed business code list (replaces hardcoded whitelist;
  user-side routes fall back to this table for new codes)
- `users.status` — admin can disable a technician account

### Default credentials (first run)
`admin / admin123` — change immediately via the topbar "改密" button.

### Permission codes
`dashboard.read`, `users.read|write`, `tasks.read|write`,
`reports.read|write`, `businesses.read|write`, `admins.read|write`,
`audit.read`. The seeded `super` role grants all.

### Security notes
- Admin tokens carry `kind="admin"`; user middleware rejects them and vice versa.
- Disabled users are blocked at login and at every authenticated request.
- User-submitted report HTML is rendered in a sandboxed iframe in the admin
  viewer (no `allow-same-origin`) so it cannot read the admin token.
