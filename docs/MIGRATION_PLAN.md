# Onewill Academy — AI Studio → Next.js + Firebase Migration Plan

## Guiding decision
Prototype in AI Studio React/TypeScript first; maintain typed domain models and service abstractions. AI Studio currently offers optional Firebase integration and two-way GitHub sync, but do not assume its generated React project is already a production-ready Next.js project. Make an explicit Next.js App Router migration when the UI prototype is approved. Keep Firestore as canonical storage and Google Drive as approved archive only.

## Gates and stages

### Gate P0 — UI signoff
- Build demo via Master Prompt. Inspect every route, 4 Table edit, filters, role preview and mobile layouts.
- Review visual identity and official logo asset. Confirm report week cutoff, reviewer assignment, draft visibility and finance visibility.
- No live credentials or genuine employee data in shared prototype.

### Gate P1 — Code freeze and source control
- Connect AI Studio to PRIVATE GitHub repo, push checkpoint tag e.g. `prototype-v1.0` and preserve README.
- If sync unavailable to your account, export ZIP and commit locally. Never assume code pushed until visible in GitHub.
- Document existing data models, routes, demo-vs-real behaviors, dependencies and lint/build results.

### Phase 1A — Secure Next.js foundation
- Create Next.js App Router + TypeScript + Tailwind + shadcn/ui in project branch; port design tokens, components and typed domain model from React demo.
- Enable Google Sign-In using Firebase Authentication. Establish verified server session using Firebase Admin SDK, secure HttpOnly cookies, CSRF strategy and protected routes.
- Invitations: admin enters permitted email; after Firebase confirms verified email, server binds invitation to UID. Server-managed `users/{uid}` with `active`, `role`, `teamId`. One-time controlled Super Admin bootstrap.
- Enforce RBAC **on every backend route** and verify team/record ownership. Deny all client Firestore access by default if backend-only architecture.
- Test unauthorized/disabled/anonymous requests, cross-team access, role spoofing, self-approval restriction.
- Production deployment target: Firebase App Hosting, with explicit cost/billing review and env/secret configuration.
- No Drive OAuth in Phase 1A.

### Phase 1B — Persistent 4-table reporting
- Replace demo ReportRepository with Firebase Admin-backed server repository. Keep UI props and data types unchanged as much as feasible.
- Collections: `users`, `invitations`, `teams`, `reports`, `report_versions`, `reviews`, `audit_events`. Later: `drive_integrations`, `exports`.
- Zod server schemas, immutable IDs, server timestamps, per-section arrays/subcollections as size dictates, optimistic version conflict handling, autosave rate limits, audit trail, report-week timezone Asia/Jakarta.
- CRUD: list/create/read/update own drafts; team-specific views; explicit No Updates reason; evidence links. Add indexes according to actual query patterns.
- Test simultaneous edits, permission isolation, mobile and accessibility.

### Phase 2 — Reviews and management
- Implement submit, review assignment, needs revision, re-submit, approve, immutable `report_versions` snapshot; guard approvals through server transactions and no-self-approve rule.
- KPIs computed using expected report roster/weekly denominator and business meaning, not invented.
- Track issue/support lifecycle and role-limited financial data.

### Phase 3 — Google Drive archive (personal Gmail)
- Separate OAuth 2.0 consent by designated organization-controlled Gmail account; ordinary users never grant Drive permissions.
- Use narrow `drive.file` scope where feasible; create app-managed archive folder (or authorize selected existing folder with supported picker flow). No Google Workspace, domain-wide delegation or service-account impersonation.
- Secure OAuth state and redirect validation; store refresh token in a managed secret store; test publishing status, verification requirements, refresh-token rotation/expiry/revoke.
- After approval, async PDF render from immutable report version; export job keyed by reportId+revision for idempotent retry. Persist Drive file ID, export status, attempt count and error. Approval remains valid during archive failure.
- Add Admin settings: connect/reconnect/test/disconnect and visible upload health.

### Phase 4 — Operations and rollout
- Minimum 2FA for custodian Gmail; recovery/offboarding ownership plan, private repo, secret scanning, backups, Cloud Monitoring/errors, deployment promotion and rollback.
- UAT on real role-permission matrix, export failure recovery, accessibility and responsive design. Document support and data retention.

## Suggested repository layout (target Next.js)
```
src/
  app/(public)/login/page.tsx
  app/(protected)/dashboard/page.tsx
  app/(protected)/reports/page.tsx
  app/(protected)/reports/new/page.tsx
  app/(protected)/reviews/page.tsx
  app/(protected)/admin/users/page.tsx
  app/(protected)/admin/integrations/page.tsx
  app/api/auth/session/route.ts
  app/api/reports/route.ts
  app/api/reports/[id]/route.ts
  app/api/reports/[id]/submit/route.ts
  app/api/reports/[id]/review/route.ts
  components/reporting/*
  components/dashboard/*
  lib/auth/*
  lib/firebase/admin.ts
  lib/firebase/client.ts
  lib/repos/report-repository.ts
  lib/repos/firestore-report-repository.ts
  lib/validation/report.ts
  types/report.ts
firestore.rules
```

## Handoff contract (avoid rework)
- Stable `Report`, `Achievement`, `Issue`, `NextObjective`, `SupportRequest`, `Review`, `UserRole` interfaces and enum values.
- UI components accept props/hooks, not direct Firebase SDK calls.
- Demo and production repositories share method signatures.
- Client components never decide access; backend handles authorization.
- No OAuth Drive scopes/keys mixed into Google Sign-In.

## Completion verification
1. `npm run lint`, `npm run build`, typecheck and unit tests pass.
2. E2E role matrix including denied operations passes.
3. UAT approves report, version freezes, export uploads exactly once, retry after simulated failure.
4. Published dashboard restricts all sensitive routes and API data.
5. Operational owner can rotate credentials, reconnect Gmail and restore backups.
