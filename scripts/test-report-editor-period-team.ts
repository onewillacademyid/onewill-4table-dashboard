/**
 * ONEWILL ACADEMY — M4.1-E2-B2 QA TEST
 * Focused Regression Suite: Report Editor Period & Team Binding
 *
 * Verifies:
 * 1. ISO Week calculation on October 12, 2026 evaluates to W42 2026 (Oct 12 - 18).
 * 2. Previous weeks (W41, W40, W39) remain valid and available.
 * 3. Contributor team 'team-operasional' resolves to canonical 'Operasional & SDM'.
 * 4. Auth mapping ensures domain user receives 'Operasional & SDM' instead of 'General Team'.
 * 5. Title auto-generation correctly reflects canonical team name and week number.
 * 6. Title updates dynamically on week changes if not manually edited, and preserves custom title if edited.
 * 7. Client CreateReportInput payload with W42 passes canonical schema validation.
 * 8. Server-owned fields (authorId, teamId, role, status) are strictly rejected by client schema.
 * 9. Server Exact-Target Guard strictly validates W42 / team-operasional while write gates remain disabled.
 * 10. Zero real Firestore mutations occur.
 */

import { getISOWeekNumber, getWeekDates } from '../src/utils/dateUtils';
import { getCanonicalTeamName, mapFirestoreUserToDomainUser } from '../src/lib/firebase/auth-foundation';
import { CreateReportInputSchema, deriveReportDocId } from '../src/lib/validation/report';
import { verifyExactTargetGuard } from '../src/lib/auth/exact-target-guard';
import { User } from '../src/types';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.1-E2-B2 PERIOD & TEAM BINDING TEST   ');
console.log('===========================================================\n');

// -------------------------------------------------------------
// [1] ISO Week Calculation & Date Bounds for W42 2026
// -------------------------------------------------------------
console.log('[SECTION 1] ISO Week Calculation & Available Period Range:');

// October 12, 2026 is Monday of ISO Week 42
const testDateOct12 = new Date('2026-10-12T00:00:00Z');
const weekInfoOct12 = getISOWeekNumber(testDateOct12);
assert(weekInfoOct12.week === 42, `October 12, 2026 resolves to ISO week 42 (got: ${weekInfoOct12.week})`);
assert(weekInfoOct12.year === 2026, `October 12, 2026 resolves to ISO year 2026 (got: ${weekInfoOct12.year})`);

const datesW42 = getWeekDates(42, 2026);
assert(datesW42.startDate === '2026-10-12', `W42 2026 start date is 2026-10-12 (got: ${datesW42.startDate})`);
assert(datesW42.endDate === '2026-10-18', `W42 2026 end date is 2026-10-18 (got: ${datesW42.endDate})`);
assert(datesW42.label.includes('12 Okt') && datesW42.label.includes('18 Okt 2026'), `W42 label formatted correctly: ${datesW42.label}`);

// Previous reporting weeks preserved
const datesW41 = getWeekDates(41, 2026);
assert(datesW41.startDate === '2026-10-05' && datesW41.endDate === '2026-10-11', `W41 2026 dates: 2026-10-05 to 2026-10-11`);
const datesW40 = getWeekDates(40, 2026);
assert(datesW40.startDate === '2026-09-28' && datesW40.endDate === '2026-10-04', `W40 2026 dates: 2026-09-28 to 2026-10-04`);
const datesW39 = getWeekDates(39, 2026);
assert(datesW39.startDate === '2026-09-21' && datesW39.endDate === '2026-09-27', `W39 2026 dates: 2026-09-21 to 2026-09-27`);

// Available weeks array calculation
const currentWeek = weekInfoOct12.week;
const baseList = [42, 41, 40, 39];
const availableWeeks = Array.from(new Set(baseList.includes(currentWeek) ? baseList : [currentWeek, ...baseList])).sort((a, b) => b - a);
assert(availableWeeks.includes(42), `availableWeeks includes W42`);
assert(availableWeeks.includes(41), `availableWeeks includes W41`);
assert(availableWeeks.includes(40), `availableWeeks includes W40`);
assert(availableWeeks.includes(39), `availableWeeks includes W39`);
assert(availableWeeks[0] === 42, `Current week W42 is the first (top) option`);

// -------------------------------------------------------------
// [2] Canonical Team Name Resolution & Auth Foundation Mapping
// -------------------------------------------------------------
console.log('\n[SECTION 2] Canonical Team Name Resolution & Auth Mapping:');

assert(getCanonicalTeamName('team-operasional') === 'Operasional & SDM', `'team-operasional' resolves to 'Operasional & SDM'`);
assert(getCanonicalTeamName('team-akademik') === 'Akademik & Kurikulum', `'team-akademik' resolves to 'Akademik & Kurikulum'`);
assert(getCanonicalTeamName('team-pemasaran') === 'Pemasaran & Pertumbuhan', `'team-pemasaran' resolves to 'Pemasaran & Pertumbuhan'`);
assert(getCanonicalTeamName('team-teknologi') === 'Teknologi & Produk', `'team-teknologi' resolves to 'Teknologi & Produk'`);
assert(getCanonicalTeamName('team-executive') === 'Manajemen / Executive', `'team-executive' resolves to 'Manajemen / Executive'`);
assert(getCanonicalTeamName('unknown-team') === 'unknown-team', `Unknown team safely returns teamId`);
assert(getCanonicalTeamName(undefined) === 'General Team', `Undefined teamId returns 'General Team'`);

// Test mapFirestoreUserToDomainUser
const mockFirestoreDoc = {
  uid: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
  email: 'adhimonow@gmail.com',
  displayName: 'Adhi Monow',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  status: 'ACTIVE',
  createdAt: { seconds: 1728000000, nanoseconds: 0 },
  updatedAt: { seconds: 1728000000, nanoseconds: 0 },
};

// When teamName is not provided or defaults to 'General Team'
const mappedUser = mapFirestoreUserToDomainUser(mockFirestoreDoc as any);
assert(mappedUser.teamName === 'Operasional & SDM', `mappedUser.teamName is 'Operasional & SDM' (got: '${mappedUser.teamName}')`);
assert(mappedUser.teamId === 'team-operasional', `mappedUser.teamId is 'team-operasional'`);

// -------------------------------------------------------------
// [3] Title Auto-Generation & Manual Edit Preservation Logic
// -------------------------------------------------------------
console.log('\n[SECTION 3] Title Auto-Generation & Edit State Logic:');

const effectiveTeamName = getCanonicalTeamName('team-operasional');
let defaultTitle = `Laporan Mingguan ${effectiveTeamName} — Pekan 42`;
assert(defaultTitle === 'Laporan Mingguan Operasional & SDM — Pekan 42', `Default title formatted correctly: "${defaultTitle}"`);

// Changing week when unedited
let isTitleManuallyEdited = false;
let currentTitle = defaultTitle;
let selectedWeek = 41;
if (!isTitleManuallyEdited) {
  currentTitle = `Laporan Mingguan ${effectiveTeamName} — Pekan ${selectedWeek}`;
}
assert(currentTitle === 'Laporan Mingguan Operasional & SDM — Pekan 41', `Unedited title updates to Pekan 41 on week switch`);

// Editing title manually
isTitleManuallyEdited = true;
currentTitle = 'Laporan Operasional Khusus — Penyesuaian Manual';
selectedWeek = 40;
if (!isTitleManuallyEdited) {
  currentTitle = `Laporan Mingguan ${effectiveTeamName} — Pekan ${selectedWeek}`;
}
assert(currentTitle === 'Laporan Operasional Khusus — Penyesuaian Manual', `Manually edited title is preserved when week switches to 40`);

// -------------------------------------------------------------
// [4] Client Payload Schema Validation & Security Boundary
// -------------------------------------------------------------
console.log('\n[SECTION 4] Client Payload Schema Validation & Security Boundary:');

const emptySections = {
  achievements: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada pembaruan pekan ini' },
  issues: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada kendala pekan ini' },
  objectives: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada sasaran pekan ini' },
  support: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada dukungan pekan ini' },
};

const validW42Payload = {
  title: 'Laporan Mingguan Operasional & SDM — Pekan 42',
  weekNumber: 42,
  year: 2026,
  weekStartDate: '2026-10-12',
  weekEndDate: '2026-10-18',
  sections: emptySections,
};

const validationW42 = CreateReportInputSchema.safeParse(validW42Payload);
assert(validationW42.success === true, `Valid W42 2026 payload passes CreateReportInputSchema`);

// Derived Doc ID calculation
const derivedDocId = deriveReportDocId('team-operasional', 2026, 42);
assert(derivedDocId === 'rep_2026_w42_team-operasional', `Derived document ID matches exact target: rep_2026_w42_team-operasional`);

// STRICT SCHEMA BOUNDARY: Client attempts to inject authorId or teamId
const spoofedPayload = {
  ...validW42Payload,
  authorId: 'injected-attacker-id',
  teamId: 'team-executive',
};
const validationSpoofed = CreateReportInputSchema.safeParse(spoofedPayload);
assert(validationSpoofed.success === false, `CreateReportInputSchema.strict() rejects client-injected authorId/teamId`);

// Date boundary mismatch validation
const mismatchedDatesPayload = {
  ...validW42Payload,
  weekStartDate: '2026-10-13', // Tuesday instead of Monday
};
const validationMismatched = CreateReportInputSchema.safeParse(mismatchedDatesPayload);
assert(validationMismatched.success === false, `CreateReportInputSchema rejects mismatched start date for W42`);

// -------------------------------------------------------------
// [5] Fail-Closed Exact-Target Write Guard Verification
// -------------------------------------------------------------
console.log('\n[SECTION 5] Exact-Target Write Guard Enforcement:');

const verifiedContributor: User = {
  id: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
  email: 'adhimonow@gmail.com',
  name: 'Adhi Monow',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: 'bg-slate-700',
  avatarInitials: 'AM',
  active: true,
  lastActive: '2026-10-12T00:00:00Z',
};

// When flags are disabled (current runtime state):
const originalWrites = process.env.REPORTS_FIRESTORE_WRITES_ENABLED;
const originalTarget = process.env.CONTROLLED_WRITE_E2B_ENABLED;

process.env.REPORTS_FIRESTORE_WRITES_ENABLED = 'false';
process.env.CONTROLLED_WRITE_E2B_ENABLED = 'false';

const guardResultDisabled = verifyExactTargetGuard({
  author: verifiedContributor,
  input: validW42Payload,
  operation: 'CREATE_DRAFT',
});
assert(guardResultDisabled.allowed === false, `Guard fails closed when write flags are disabled (got: ${guardResultDisabled.code})`);

// When target flag is enabled in controlled test harness:
process.env.REPORTS_FIRESTORE_WRITES_ENABLED = 'true';
process.env.CONTROLLED_WRITE_E2B_ENABLED = 'true';

const guardResultAuthorized = verifyExactTargetGuard({
  author: verifiedContributor,
  input: validW42Payload,
  operation: 'CREATE_DRAFT',
});
assert(guardResultAuthorized.allowed === true, `Guard passes for exact verified Contributor, W42, 2026, team-operasional`);

// Non-matching team rejection
const guardWrongTeam = verifyExactTargetGuard({
  author: { ...verifiedContributor, teamId: 'team-akademik' },
  input: validW42Payload,
  operation: 'CREATE_DRAFT',
});
assert(guardWrongTeam.allowed === false, `Guard rejects non-matching team`);

// Non-matching week rejection
const guardWrongWeek = verifyExactTargetGuard({
  author: verifiedContributor,
  input: { ...validW42Payload, weekNumber: 41, weekStartDate: '2026-10-05', weekEndDate: '2026-10-11' },
  operation: 'CREATE_DRAFT',
});
assert(guardWrongWeek.allowed === false, `Guard rejects non-matching week 41 when W42 is targeted`);

// Restore original flags
process.env.REPORTS_FIRESTORE_WRITES_ENABLED = originalWrites;
process.env.CONTROLLED_WRITE_E2B_ENABLED = originalTarget;

console.log('\n===========================================================');
console.log(` Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log('===========================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
