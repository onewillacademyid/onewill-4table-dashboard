# Onewill Academy | AI Agent Development Instructions

**Applies to:** Google AI Studio, OpenAI Codex, Google Antigravity, Claude Code and human contributors.  
**Priority:** Follow explicit user approval, security requirements, PRD v1.1 and branch protection. Flag conflicts instead of silently choosing.

## Required context before working
Read in order: [PRD v1.1](PRD_v1.1.md), [Development status](DEVELOPMENT_STATUS.md), [Current/target architecture](ARCHITECTURE.md), [Migration plan](MIGRATION_PLAN.md), then inspect actual code and branch. Existing facts in code take precedence for claims about current behavior; PRD controls intended behavior.

## Product invariants
- Keep The 4 Table in this order: **Achievements, Issues, Next Objectives, Support Needed**.
- Maintain desktop 2×2 grid and mobile stacked version, Onewill brand identity and Bahasa Indonesia user-facing text.
- Preserve roles: SUPER_ADMIN, ADMIN, MANAGEMENT, TEAM_LEAD, CONTRIBUTOR.
- Workflow: DRAFT → SUBMITTED → NEEDS_REVISION → SUBMITTED → APPROVED → ARCHIVED; prohibit self-approval.
- Approved content versions must be immutable. Archive job status is independent of approval.
- Firestore will become the record of truth. Google Drive is an archive of approved snapshots only, owned by a company-controlled consumer Gmail account.
- Staff Google Sign-In and Gmail Drive OAuth are separate workflows and consent grants.

## Execution restrictions
1. Never deploy, merge into `main`, change production auth, or advance to the next phase without explicit approval.
2. Preserve approved UI; do not rewrite components or domain models merely for stylistic preference.
3. Work in a dedicated feature/documentation branch. Inspect Git status and base commit. Avoid force push.
4. Do not hardcode or print secrets, Google refresh tokens, service-account credentials or employee data. Use `.env.example` only for placeholder names.
5. Do not grant roles or data access based on a client-controlled flag, localStorage, or email domain alone. Enforce UID and active role on trusted server.
6. Label demo state as DEMO; do not present mock approvals or browser storage as secure or persisted production data.
7. Never change reporting schemas, role policy, versioning rules or security architecture without explaining the implications and requesting approval.
8. Avoid unrelated refactors or dependencies. Respect Next.js server/client boundaries and never import firebase-admin in client components.
9. Document every nontrivial change, tests, failure evidence and outstanding issues. `NOT RUN` is not `PASS`.
10. Stop when asked; do not advance from M3 to 1B or Drive archiving automatically.

## Quality gates
- Confirm actual build script. Current M2 repository has `npm run build:next` and a separate Vite `npm run build`; validate the Next.js command explicitly.
- Run suitable TypeScript, lint, dependency audit and tests; report exact command and outcome. Do not claim clean build unless observed.
- Security tests must cover anonymous, uninvited, disabled, wrong-role, cross-team, self-approval, role escalation, invalid session and CSRF failure cases when implemented.
- For UI changes, compare 4 Table order, responsive layout, accessibility and core workflows against approved M2 prototype.
- Any destructive database migration, schema change or credential rotation requires explicit approval and rollback plan.

## Required response format per checkpoint
1. Goal and status (VERIFIED / REPORTED / PLANNED / BLOCKED).
2. Branch, base SHA, files changed.
3. Implemented behavior, clearly separating real and demo features.
4. Tests executed with commands, results and evidence; tests not run.
5. Security or data integrity findings and severity.
6. Risks, rollback/checkpoint and suggested next phase.
7. GO / CONDITIONAL GO / NO-GO recommendation with reason.

## Platform-specific operational notes
- **Google AI Studio:** preserve custom instruction context, verify imported branch, and do not confuse workspace output with GitHub push.
- **Codex:** consider a root `AGENTS.md` pointing to this file after explicit approval.
- **Claude Code:** consider a root `CLAUDE.md` referencing this file after explicit approval.
- **Antigravity / IDE:** execute commands in project root, checkpoint in Git and keep environment secrets local/managed.

## Source documents
This file is adapted from the existing Onewill AI Studio Custom Instructions, PRD v1.1 and the M1/M2 read-only repository review. It does not replace the original custom instructions and makes no claim that M3 has been implemented.
