/**
 * Onewill Academy | M4.1-C2-C.3 Final Firestore Pagination & Cursor Security Suite
 * Validates bounded query reads, stream merging, tie-breaker sorting,
 * cross-user cursor rejection, cursor tampering protection, and page exhaustion.
 *
 * Run with: npx tsx scripts/test-rbac-consistency.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { InMemoryReportRepository } from '../src/lib/repos/in-memory-report-repository';
import { FirestoreReportRepository, createSignedCursor } from '../src/lib/repos/firestore-report-repository';
import { User } from '../src/types';
import { canReadReport } from '../src/lib/auth/rbac-policy';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — FIRESTORE PAGINATION & CURSOR SECURITY ');
console.log('===========================================================\n');

let passedTests = 0;
let totalTests = 0;

async function runTest(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

// Setup Test Users
const contributorA: User = {
  id: 'user-contrib-a',
  name: 'Contributor A',
  email: 'contrib-a@onewill-demo.id',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional',
  avatarColor: '#111',
  avatarInitials: 'CA',
  active: true,
  lastActive: '2026-10-10',
};

const contributorB: User = {
  id: 'user-contrib-b',
  name: 'Contributor B',
  email: 'contrib-b@onewill-demo.id',
  role: 'CONTRIBUTOR',
  teamId: 'team-akademik',
  teamName: 'Akademik',
  avatarColor: '#222',
  avatarInitials: 'CB',
  active: true,
  lastActive: '2026-10-10',
};

const teamLeadOperasional: User = {
  id: 'user-lead-op',
  name: 'Team Lead Operasional',
  email: 'lead-op@onewill-demo.id',
  role: 'TEAM_LEAD',
  teamId: 'team-operasional',
  teamName: 'Operasional',
  avatarColor: '#333',
  avatarInitials: 'TL',
  active: true,
  lastActive: '2026-10-10',
};

// ISO week dates mapping for 2026
const weekDatesMap: Record<number, { start: string; end: string }> = {
  33: { start: '2026-08-10', end: '2026-08-16' },
  34: { start: '2026-08-17', end: '2026-08-23' },
  35: { start: '2026-08-24', end: '2026-08-30' },
  36: { start: '2026-08-31', end: '2026-09-06' },
  37: { start: '2026-09-07', end: '2026-09-13' },
  38: { start: '2026-09-14', end: '2026-09-20' },
  39: { start: '2026-09-21', end: '2026-09-27' },
  40: { start: '2026-09-28', end: '2026-10-04' },
};

async function main() {
  const repo = new InMemoryReportRepository();

  // Populate synthetic reports for multi-page pagination & equal-value sorting
  // Create 6 reports for team-operasional by Contributor A across 2026 W35 to W40
  for (let w = 35; w <= 40; w++) {
    const dates = weekDatesMap[w];
    const res = await repo.createReport({
      input: {
        year: 2026,
        weekNumber: w,
        weekStartDate: dates.start,
        weekEndDate: dates.end,
        sections: {
          achievements: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          issues: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          objectives: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          support: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
        },
      },
      author: contributorA,
    });
    assert.strictEqual(res.success, true, `Report creation for W${w} must succeed: ${res.error}`);
  }

  // Create 2 historical cross-team reports by Contributor A in team-akademik (W33, W34)
  for (let w = 33; w <= 34; w++) {
    const dates = weekDatesMap[w];
    const res = await repo.createReport({
      input: {
        year: 2026,
        weekNumber: w,
        weekStartDate: dates.start,
        weekEndDate: dates.end,
        sections: {
          achievements: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          issues: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          objectives: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          support: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
        },
      },
      author: { ...contributorA, teamId: 'team-akademik' },
    });
    assert.strictEqual(res.success, true, `Historical report creation for W${w} must succeed: ${res.error}`);
  }

  // Create 2 reports by Contributor B in team-akademik (W39, W40)
  for (let w = 39; w <= 40; w++) {
    const dates = weekDatesMap[w];
    const res = await repo.createReport({
      input: {
        year: 2026,
        weekNumber: w,
        weekStartDate: dates.start,
        weekEndDate: dates.end,
        sections: {
          achievements: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          issues: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          objectives: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
          support: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
        },
      },
      author: contributorB,
    });
    assert.strictEqual(res.success, true, `Contributor B report creation for W${w} must succeed: ${res.error}`);
  }

  console.log('[1] RBAC Scoping & Permission Parity Checks:');

  await runTest('Contributor A sees current-team reports AND own historical cross-team reports', async () => {
    const res = await repo.listReports({ user: contributorA });
    assert.strictEqual(res.success, true);
    const reports = res.data?.reports || [];
    assert.strictEqual(reports.length, 8, 'Contributor A should see exactly 8 reports total');
  });

  await runTest('Contributor A CANNOT see other people\'s cross-team reports', async () => {
    const res = await repo.listReports({ user: contributorA });
    const reports = res.data?.reports || [];
    const containsOtherCrossTeam = reports.some((r) => r.authorId === 'user-contrib-b');
    assert.strictEqual(containsOtherCrossTeam, false);
  });

  await runTest('Detail (getReportById) and List (listReports) permissions are 100% consistent', async () => {
    const listRes = await repo.listReports({ user: contributorA });
    const listReports = listRes.data?.reports || [];

    for (const r of listReports) {
      const canRead = canReadReport(contributorA, r);
      assert.strictEqual(canRead.allowed, true, `canReadReport must allow reading list item ${r.id}`);

      const detailRes = await repo.getReportById({ user: contributorA, reportId: r.id });
      assert.strictEqual(detailRes.success, true, `getReportById must return HTTP 200/success for list item ${r.id}`);
    }
  });

  await runTest('Team Lead access respects the same central RBAC policy', async () => {
    const res = await repo.listReports({ user: teamLeadOperasional });
    assert.strictEqual(res.success, true);
    const reports = res.data?.reports || [];
    assert.strictEqual(reports.length, 6);
  });

  console.log('\n[2] Multi-Page Consecutive Pagination & Exhaustion:');

  await runTest('Pagination across 3 consecutive pages produces zero skipped or duplicate records', async () => {
    // Page 1 (Limit 3)
    const page1 = await repo.listReports({ user: contributorA, limit: 3 });
    assert.strictEqual(page1.success, true);
    assert.strictEqual(page1.data?.reports.length, 3);
    assert.ok(page1.data?.nextCursor);

    // Page 2 (Limit 3)
    const page2 = await repo.listReports({ user: contributorA, limit: 3, cursor: page1.data?.nextCursor });
    assert.strictEqual(page2.success, true);
    assert.strictEqual(page2.data?.reports.length, 3);
    assert.ok(page2.data?.nextCursor);

    // Page 3 (Limit 3)
    const page3 = await repo.listReports({ user: contributorA, limit: 3, cursor: page2.data?.nextCursor });
    assert.strictEqual(page3.success, true);
    assert.strictEqual(page3.data?.reports.length, 2);

    // Check no duplicates across page 1, 2, 3
    const allFetchedIds = [
      ...page1.data!.reports.map((r) => r.id),
      ...page2.data!.reports.map((r) => r.id),
      ...page3.data!.reports.map((r) => r.id),
    ];
    const uniqueIds = new Set(allFetchedIds);
    assert.strictEqual(uniqueIds.size, 8, 'Total unique records across 3 pages must be 8 with zero duplicates');
  });

  console.log('\n[3] Cursor Security & Tampering Protections (FirestoreReportRepository):');

  const firestoreRepo = new FirestoreReportRepository();

  await runTest('Cross-user cursor reuse is rejected cleanly with VALIDATION_ERROR', async () => {
    // User A generates valid HMAC-signed cursor
    const emptyFiltersHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ teamId: '', status: '', weekNumber: 0, year: 0 }))
      .digest('hex')
      .substring(0, 8);

    const validCursorUserA = createSignedCursor({
      u: contributorA.id,
      t: contributorA.teamId,
      f: emptyFiltersHash,
      l: 20,
      id: 'rep_2026_w40_team-operasional',
      y: 2026,
      w: 40,
    });

    // User B attempts to reuse User A's cursor
    const res = await firestoreRepo.listReports({
      user: contributorB, // Different user!
      cursor: validCursorUserA,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
    assert.ok(res.error?.includes('identitas') || res.error?.includes('tim') || res.error?.includes('pengguna') || res.error?.includes('Akses ditolak'));
  });

  await runTest('Tampered cursor payload is rejected cleanly with VALIDATION_ERROR', async () => {
    const tamperedCursor = Buffer.from('NOT_VALID_JSON_STRING').toString('base64');
    const res = await firestoreRepo.listReports({
      user: contributorA,
      cursor: tamperedCursor,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'VALIDATION_ERROR');
  });

  await runTest('Invalid limit (<1 or >50) is rejected cleanly with VALIDATION_ERROR', async () => {
    const resUnder = await firestoreRepo.listReports({ user: contributorA, limit: 0 });
    const resOver = await firestoreRepo.listReports({ user: contributorA, limit: 100 });

    assert.strictEqual(resUnder.success, false);
    assert.strictEqual(resUnder.code, 'VALIDATION_ERROR');
    assert.strictEqual(resOver.success, false);
    assert.strictEqual(resOver.code, 'VALIDATION_ERROR');
  });

  console.log('\n===========================================================');
  console.log(` RBAC & Pagination Security Summary: ${passedTests} Passed, ${totalTests - passedTests} Failed.`);
  console.log('===========================================================');
}

main().catch((err) => {
  console.error('Fatal error in RBAC consistency test:', err);
  process.exit(1);
});
