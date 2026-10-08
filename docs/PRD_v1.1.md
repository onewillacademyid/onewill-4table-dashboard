# Product Requirements Document (PRD) v1.1
## Onewill Academy | The 4 Table Weekly Progress Dashboard
**Date:** 8 October 2026  
**Status:** Approved architectural decision: consumer Gmail for archive owner. Application NOT deployed.  
**Supersedes:** v1.0 for Google account ownership, login, Drive integration, and delivery sequence.

## 1. Objective
Build a restricted-access, mobile-friendly weekly progress-report web app using the four original sections: (1) Last-week Achievements, (2) Issues, (3) Next-week Objectives, (4) Support Needed. Support draft/submission, review and approvals, executive oversight, and archival of approved versioned PDF reports to a designated consumer Gmail My Drive account controlled by Onewill Academy.

## 2. Confirmed architectural decisions
- Google Workspace is **not required** for MVP.
- Company-controlled consumer Gmail owns the My Drive archive folder; do not use an individual employee's personal account if possible.
- Google Sign-In and Firebase Email Link Passwordless via Firebase Authentication are the approved methods for user identity. Invite-only application authorization and role-based rules are enforced on the server using verified Firebase UID and active user registry.
- Login OAuth and Google Drive authorization are **separate consent and token flows**. Normal users are not asked to grant Drive permissions.
- Database (Firestore) is source of truth; Google Drive stores approved PDFs and snapshots only.
- OAuth 2.0 Drive integration uses a company-controlled Google user authorization, NOT service-account impersonation, domain-wide delegation, or Shared Drives.
- Minimum Drive permission should be `https://www.googleapis.com/auth/drive.file` where feasible. Prefer creating the archive root folder using the app; if selecting an existing folder, use compatible picker/authorization and verify access before relying on that folder. Do not simply assume a folder ID grants permission.
- No Gmail passwords, OAuth client secrets, or Drive refresh tokens are hard-coded in source code or sent to the browser.

## 3. Personas and permissions
| Role | Reports | Approval | Administration |
|---|---|---|---|
| Super Admin | Org-wide | Only if explicitly reviewer | Manage integration, roles, audit, reconnect |
| Admin | Org-wide per policy | Only if explicitly reviewer | Invitations, deactivate accounts, teams |
| Management | Cross-team | Assigned report reviews | None |
| Team Lead | Own and assigned team | Assigned reviews, no self-approval | None |
| Contributor | Create/edit own draft or revision; read allowed reports | None | None |

All API handlers must verify Firebase sessions on the backend, re-fetch active user/role and check ownership/team. Admin and app logins require no Google Workspace email domain. Do not automatically grant access to any Google account merely because it successfully signs in. Role grants must be server-controlled.

## 4. The 4 Table structured records
**Common metadata:** reportId, weekStart, weekEnd, author UID, teamId, status, revision, createdAt, updatedAt, submittedAt, reviewer UID.

1. **Achievements**: description, project, result, optional metric target/actual/unit, evidence URL, previous objective link.
2. **Issues**: title, business impact, severity, owner, mitigation, resolution target date, status.
3. **Next Objectives**: objective, measurable output, assignee, target date, priority, reference issue.
4. **Support Needed**: request, type (decision/budget/people/access/material/other), requestedFrom, neededBy, amount optional, business consequence, status.

Each section permits multiple rows and optional explicit “No updates” with reason. Provide friendly, fast input and avoid forcing target metrics for qualitative work.

## 5. Reporting workflow
`DRAFT → SUBMITTED → (NEEDS_REVISION → SUBMITTED)* → APPROVED → ARCHIVED`

Review comments are timestamped and attributable. An approved version is immutable; any amendment generates a new revision. A Drive upload failure changes only the archive job state (FAILED/RETRYING), **not** the report approval. Idempotent export by report ID + version prevents duplicate uploads.

## 6. Executive dashboard
Weekly counters: expected/received reports, submitted-on-time rate, awaiting-review, outstanding high/critical issues, overdue next objectives, open support requests. Drill into responsible team, report, issue and request. Filters: reporting week, team, member, project, status. Explicitly distinguish progress/activities from achieved impact.

## 7. Visual and accessibility
Preserve 4-Table 2x2 grid at desktop and stack sections on mobile. Onewill site / logo reference: https://onewillacademy.com; proposed not-verified brand palette: deep plum `#35115A`, purple `#6C2AA6`, light lavender `#F4EFFA`, white `#FFFFFF`, ink `#242038`. Obtain brand approval/logo asset rights before production. WCAG-oriented contrast, keyboard navigation, responsive minimum ~375px width. Priority indicators must also have text, not just color.

## 8. Technical architecture
- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Zod.
- Firebase Auth with Google provider and secured server sessions.
- Firebase Admin SDK on server; Firestore as main datastore.
- Firestore rules: deny client direct reads/writes by default if all report access is through server handlers; grant least privileges if direct access is introduced later.
- Cloud Run or Firebase App Hosting with application secret management.
- Google Drive API OAuth consent is initiated by a highly privileged administrator in dedicated settings route with CSRF-safe state, callback validation, offline access, scoped consent, secure refresh-token storage, reconnect/revoke flow.
- Archive PDFs asynchronously once approved; persist Drive file ID, URL, time, exact report revision, upload result and retries.
- Backup/export approach and offboarding ownership policy documented before rollout.

## 9. Consumer Gmail-specific risks
1. **Ownership and continuity:** Gmail and Drive files belong to a user account; set up a company-controlled account, documented recovery, MFA, limited custodian access and contingency plan for lost/revoked account.
2. **Scope creep:** avoid full-drive `drive` scope for routine report archiving; if the feature requires more than `drive.file`, redesign or subject it to a separate security/verification decision.
3. **OAuth testing:** external OAuth apps in Testing may have limited test users and short-lived refresh tokens; evaluate OAuth Publishing Status and verification requirements before unattended production archival. Do not promise persistent automated upload until tested.
4. **Service accounts:** not a substitute for the consumer Gmail authorization and must not be assumed to write directly to the Gmail My Drive.
5. **Google quota and account suspension:** expose integration status and a retry queue, save canonical report in Firestore so no content is lost.
6. **Sensitive data:** support requests may include finance/personnel details. Apply least privilege, no public link-sharing by default, retention policy, and audit access.

## 10. Database (Firestore collections)
- `users/{uid}`: email, displayName, active, role, teamId, invitedEmail, createdAt, lastLoginAt.
- `invitations/{id}`: normalizedEmail, role, teamId, invitedBy, expiresAt, status. Ensure one accepted invitation binds to one verified UID.
- `teams/{teamId}`.
- `reports/{reportId}`: owner UID, teamId, weekStart, weekEnd, status, version, entry references/embedded structured sections.
- `report_versions/{versionId}`: immutable approval snapshots.
- `reviews/{reviewId}`: actor, report, version, decision, comment, timestamp.
- `drive_integrations/{integrationId}`: connection owner identifier, enabled, scope, archiveFolderId, token secret *reference* only, status, updatedAt. No plaintext credentials.
- `exports/{exportId}`: report/version, driveFileId, url, state, attempts, lastError, timestamp.
- `audit_events/{eventId}`: actor, action, target, timestamp, minimal metadata.

## 11. API outline
`GET /api/me`, `POST /api/admin/invitations`, `GET /api/admin/users`, `PATCH /api/admin/users/:uid`, `GET /api/reports`, `POST /api/reports`, `PATCH /api/reports/:id`, `POST /api/reports/:id/submit`, `POST /api/reports/:id/review`, `GET /api/dashboard/summary`, `GET /api/admin/audit`, `POST /api/admin/drive/connect`, `GET /api/admin/drive/callback`, `POST /api/admin/drive/test`, `POST /api/admin/drive/disconnect`, `POST /api/reports/:id/export` (phase 3+ only).

## 12. Phase plan (revised)
**Phase 1A: Secure foundation**: repo and environment, branded login, Google Sign-In, verified server session, allowlist-based activation, roles, protected dashboard shell, admin invited-user management, tests. **No Drive scopes or Drive refresh tokens in Phase 1.**

**Phase 1B: 4-Table MVP**: reporting periods, Firestore schemas and CRUD, draft autosave, validation, own-report listing, basic team view, accessibility.

**Phase 2: Review and insights**: submit/revise/approve flows, immutable versions, alerts and executive overview, audit.

**Phase 3: Gmail Drive archive**: separate Google Drive OAuth link for Gmail owner, secure secrets, test folder setup, PDF generation, idempotent upload and retries.

**Phase 4: Rollout**: backups, security review, user acceptance testing, monitoring, documentation, launch.

## 13. Phase 1A Definition of Done
- Invited, active Google users can sign in and see only their permitted dashboard shell; uninvited and disabled users receive 403 and cannot fetch API data.
- Server verifies session and authorization on every protected route. Anonymous calls fail.
- Role changes occur only through server-verified admin operations; no browser-role tampering or self-promotion.
- Super Admin bootstrap uses one-time controlled procedure and cannot be claimed through public login.
- Invitation email matches Google verified email, then binds to UID once accepted.
- Security rules, route tests and end-to-end sign-in/denial tests pass.
- No Gmail Drive credentials collected; no Google Drive API calls in Phase 1.
- Staging deployment with secrets separated from client bundles and working auth redirect domains.

## 14. Outstanding confirmations before production
1. Exact company-owned Gmail archive account (share via secure setup, not chat).
2. Initial Super Admin's invited email and emergency recovery owner (secure input only).
3. Reporting week cutoff and required reviewers per team.
4. Who may see unsubmitted drafts and financial support requests.
5. Whether archive is PDFs only or also Sheets index / attachments.

## 15. Reference documentation
- Firebase Google Sign-In: https://firebase.google.com/docs/auth/web/google-signin
- Drive API scope strategy: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Drive file creation & ownership: https://developers.google.com/workspace/drive/api/guides/create-file

## 16. Prototype note
Prior HTML prototype remains a **local UI demonstration** only; it is not authenticated, is not connected to Firestore/Google Drive, and must not be used for real confidential weekly reports.
