# Onewill Academy | Development Status

**Updated:** 2026-10-08 (Asia/Jakarta)  
**Repository:** [onewillacademyid/onewill-4table-dashboard](https://github.com/onewillacademyid/onewill-4table-dashboard)  
**Last verified application commit:** [`273993d1cb7df2471fcbbe430de4954dcc8fd293`](https://github.com/onewillacademyid/onewill-4table-dashboard/commit/273993d1cb7df2471fcbbe430de4954dcc8fd293)  
**Verification:** GitHub read API, individual source files and commit history; not an executed local build.

## Phase tracker
| Phase | Status | Evidence / limitations |
| --- | --- | --- |
| PRD v1.1 | Approved product specification | `docs/PRD_v1.1.md` (source document preserved) |
| UI prototype | User accepted | User confirmation; automated regression suite not independently executed |
| M1 readiness | Reported GO | AI Studio report, not independently reproduced |
| M2 Next.js migration | Source verified; build result unverified | GitHub commit above; `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.mjs`, `package.json` |
| M3 Firebase Auth & RBAC | Authorized for planning, not implemented/verified | Client demo authentication still in `src/context/AuthContext.tsx` |
| 1B reporting persistence | Not started | `src/services/reportRepository.ts` uses localStorage demo adapter |
| Phase 2 reviews | UI demonstration only | Approval and revision are not enforced by trusted server APIs |
| Phase 3 consumer Gmail Drive archiving | Not started | Integration screen identifies demo/not connected |
| Production deployment | Not verified | No deployment evidence reviewed |

## Code facts at verification
- Application has `next` `^16.4.0`, React 19, Tailwind 4 and Vite 8 in `package.json`.
- `npm run build:next` targets Next.js; **`npm run build` still targets Vite**. Do not confuse the two.
- `src/app/layout.tsx` provides dashboard shell, Header/Footer and demo AuthProvider; Next routes exist for reporting, reviews and administration.
- `AuthContext.tsx` still selects demo identities via `localStorage` and `switchUser`.
- `reportRepository.ts` persists example reports in browser storage, with no production Firestore path verified.
- No real Google Drive integration or Firebase server authorization verified.

## Confirmed technical risks
1. **Critical, prior to real-data access:** demo identity switching is not authentication or server authorization.
2. **Critical, prior to real-data access:** repository approval and generic update operations lack trusted server-side role, state transition and ownership enforcement.
3. **High:** amendment changes the report record rather than persisting an immutable approved snapshot.
4. **High:** editor autosave indicator can become `saved` without performing persistence.
5. **Medium:** demo metrics use hardcoded reference date and fixed expected-team denominator.
6. **Unverified:** production Next.js build, lockfile integrity, dependency audit, secret history scan, automated tests and deployment security.

## Next checkpoint (M3)
1. Verify Git branch/checkpoint and `npm run build:next`, `npm run lint`, plus dependency and secret scans.
2. Configure development Firebase project and Google provider with controlled secrets.
3. Implement server-verified sessions, invited users bound to verified UIDs, RBAC and route/API protection.
4. Execute negative authorization tests, session expiry/revocation and role-boundary tests.
5. Keep report storage and Google Drive simulated. Stop for explicit phase approval.

## Development governance
- Do not report M3 as completed until runtime tests and review evidence exist.
- Application `main` must not be directly edited by autonomous agents. Use reviewed pull requests.
- Documentation branch creation was attempted on 2026-10-08 but GitHub App returned **403 Resource not accessible by integration**. Documentation is supplied as a downloadable, uncommitted package pending write permission or user push.
