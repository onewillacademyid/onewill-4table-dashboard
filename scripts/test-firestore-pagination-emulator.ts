/**
 * Onewill Academy | M4.1-C2-C.5 Firestore Pagination Emulator & Keyset Security Test
 * Simulates Firestore query builder, startAfter cursor evaluation, dual-stream merging,
 * exact read budget counting, stream exhaustion, and HMAC cursor security.
 *
 * Run with: npx tsx scripts/test-firestore-pagination-emulator.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { User, WeeklyReport } from '../src/types';
import { canReadReport } from '../src/lib/auth/rbac-policy';
import {
  FirestoreReportRepository,
  createSignedCursor,
  verifyAndDecodeCursor,
  StreamPosition,
} from '../src/lib/repos/firestore-report-repository';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — FIRESTORE EMULATOR PAGINATION QA SUITE ');
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

// User Fixtures
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

// Synthetic Database Storage with unequal stream lengths & heavy overlap
const mockDatabase: WeeklyReport[] = [];

// Populate 10 reports in team-operasional by Contributor A
for (let i = 1; i <= 10; i++) {
  const week = 30 + Math.floor(i / 2);
  mockDatabase.push({
    id: `rep_2026_w${week}_op_${i}`,
    title: `Op Report ${i}`,
    authorId: contributorA.id,
    authorName: contributorA.name,
    authorEmail: contributorA.email,
    teamId: 'team-operasional',
    teamName: 'Operasional',
    weekNumber: week,
    year: 2026,
    weekStartDate: '2026-08-03',
    weekEndDate: '2026-08-09',
    status: 'APPROVED',
    revision: 1,
    revisionsHistory: [],
    sections: {
      achievements: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      issues: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      objectives: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      support: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
    },
    createdAt: `2026-08-0${(i % 9) + 1}T10:00:00.000Z`,
    updatedAt: `2026-08-0${(i % 9) + 1}T12:00:00.000Z`,
    archiveStatus: 'NOT_ARCHIVED',
  });
}

// Populate 5 historical cross-team reports by Contributor A in team-akademik
for (let i = 1; i <= 5; i++) {
  const week = 25 + i;
  mockDatabase.push({
    id: `rep_2026_w${week}_hist_${i}`,
    title: `Historical Report ${i}`,
    authorId: contributorA.id,
    authorName: contributorA.name,
    authorEmail: contributorA.email,
    teamId: 'team-akademik',
    teamName: 'Akademik',
    weekNumber: week,
    year: 2026,
    weekStartDate: '2026-07-06',
    weekEndDate: '2026-07-12',
    status: 'APPROVED',
    revision: 1,
    revisionsHistory: [],
    sections: {
      achievements: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      issues: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      objectives: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      support: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
    },
    createdAt: `2026-07-0${i}T10:00:00.000Z`,
    updatedAt: `2026-07-0${i}T12:00:00.000Z`,
    archiveStatus: 'NOT_ARCHIVED',
  });
}

// Populate 5 reports in team-akademik by Contributor B (not readable by Contributor A)
for (let i = 1; i <= 5; i++) {
  const week = 35 + i;
  mockDatabase.push({
    id: `rep_2026_w${week}_akademik_${i}`,
    title: `Akademik Report ${i}`,
    authorId: contributorB.id,
    authorName: contributorB.name,
    authorEmail: contributorB.email,
    teamId: 'team-akademik',
    teamName: 'Akademik',
    weekNumber: week,
    year: 2026,
    weekStartDate: '2026-09-01',
    weekEndDate: '2026-09-07',
    status: 'APPROVED',
    revision: 1,
    revisionsHistory: [],
    sections: {
      achievements: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      issues: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      objectives: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
      support: { items: [], noUpdates: true, noUpdatesReason: 'OK' },
    },
    createdAt: `2026-09-0${i}T10:00:00.000Z`,
    updatedAt: `2026-09-0${i}T12:00:00.000Z`,
    archiveStatus: 'NOT_ARCHIVED',
  });
}

// Emulator Dual-Stream Query Runner
function executeEmulatorDualStream(
  user: User,
  limit: number,
  cursorPayload?: any
): { reports: WeeklyReport[]; nextCursor?: string; totalReads: number } {
  const fetchLimit = Math.min(limit * 2 + 5, 100);

  // Stream A: teamId == user.teamId
  let streamA = mockDatabase.filter((r) => r.teamId === user.teamId);

  // Stream B: authorId == user.id
  let streamB = mockDatabase.filter((r) => r.authorId === user.id);

  // Sort function: (year DESC, weekNumber DESC, id DESC)
  const sortFn = (a: WeeklyReport, b: WeeklyReport) => {
    if (b.year !== a.year) return b.year - a.year;
    if (b.weekNumber !== a.weekNumber) return b.weekNumber - a.weekNumber;
    return b.id.localeCompare(a.id);
  };

  const isAfter = (pos: { y: number; w: number; id: string }, item: WeeklyReport) => {
    if (item.year !== pos.y) return item.year < pos.y;
    if (item.weekNumber !== pos.w) return item.weekNumber < pos.w;
    return item.id.localeCompare(pos.id) < 0;
  };

  streamA.sort(sortFn);
  streamB.sort(sortFn);

  // Apply startAfter continuation
  const posA = cursorPayload?.sa || (cursorPayload ? { y: cursorPayload.y, w: cursorPayload.w, id: cursorPayload.id } : undefined);
  const posB = cursorPayload?.sb || (cursorPayload ? { y: cursorPayload.y, w: cursorPayload.w, id: cursorPayload.id } : undefined);

  if (posA) {
    streamA = streamA.filter((r) => isAfter(posA, r));
  }
  if (posB) {
    streamB = streamB.filter((r) => isAfter(posB, r));
  }

  // Slice bounded fetchLimit
  const fetchedA = streamA.slice(0, fetchLimit);
  const fetchedB = streamB.slice(0, fetchLimit);
  const totalReads = fetchedA.length + fetchedB.length;

  // Merge & Deduplicate
  const map = new Map<string, WeeklyReport>();
  fetchedA.forEach((r) => map.set(r.id, r));
  fetchedB.forEach((r) => map.set(r.id, r));

  // Filter against RBAC canReadReport
  let filtered = Array.from(map.values()).filter((r) => canReadReport(user, r).allowed);
  filtered.sort(sortFn);

  const paginated = filtered.slice(0, limit);
  let nextCursor: string | undefined = undefined;

  if (filtered.length > limit || fetchedA.length === fetchLimit || fetchedB.length === fetchLimit) {
    if (paginated.length > 0) {
      const lastItem = paginated[paginated.length - 1];

      let saPos: StreamPosition | undefined = cursorPayload?.sa;
      let sbPos: StreamPosition | undefined = cursorPayload?.sb;

      if (fetchedA.length > 0) {
        const lastItemInA = [...paginated].reverse().find((r) => fetchedA.some((aDoc) => aDoc.id === r.id));
        if (lastItemInA) {
          saPos = { y: lastItemInA.year, w: lastItemInA.weekNumber, id: lastItemInA.id };
        }
      }

      if (fetchedB.length > 0) {
        const lastItemInB = [...paginated].reverse().find((r) => fetchedB.some((bDoc) => bDoc.id === r.id));
        if (lastItemInB) {
          sbPos = { y: lastItemInB.year, w: lastItemInB.weekNumber, id: lastItemInB.id };
        }
      }

      const emptyFiltersHash = crypto
        .createHash('md5')
        .update(JSON.stringify({ teamId: '', status: '', weekNumber: 0, year: 0 }))
        .digest('hex')
        .substring(0, 8);

      nextCursor = createSignedCursor({
        u: user.id,
        t: user.teamId,
        f: emptyFiltersHash,
        l: limit,
        id: lastItem.id,
        y: lastItem.year,
        w: lastItem.weekNumber,
        sa: saPos,
        sb: sbPos,
      });
    }
  }

  return { reports: paginated, nextCursor, totalReads };
}

async function main() {
  console.log('[SECTION 1] Multi-Page Keyset Pagination & Deduplication Checks:');

  await runTest('Paginates 15 records across 3 pages (5 per page) with zero missing or duplicate IDs', async () => {
    // Page 1
    const res1 = executeEmulatorDualStream(contributorA, 5);
    assert.strictEqual(res1.reports.length, 5);
    assert.ok(res1.nextCursor);

    const emptyFiltersHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ teamId: '', status: '', weekNumber: 0, year: 0 }))
      .digest('hex')
      .substring(0, 8);

    const decode1 = verifyAndDecodeCursor(res1.nextCursor!, contributorA, emptyFiltersHash);
    assert.strictEqual(decode1.valid, true);

    // Page 2
    const res2 = executeEmulatorDualStream(contributorA, 5, decode1.payload);
    assert.strictEqual(res2.reports.length, 5);
    assert.ok(res2.nextCursor);

    const decode2 = verifyAndDecodeCursor(res2.nextCursor!, contributorA, emptyFiltersHash);
    assert.strictEqual(decode2.valid, true);

    // Page 3
    const res3 = executeEmulatorDualStream(contributorA, 5, decode2.payload);
    assert.strictEqual(res3.reports.length, 5);

    // Verify all 15 records are unique
    const allIds = [
      ...res1.reports.map((r) => r.id),
      ...res2.reports.map((r) => r.id),
      ...res3.reports.map((r) => r.id),
    ];
    const uniqueSet = new Set(allIds);
    assert.strictEqual(uniqueSet.size, 15, 'Total unique records across 3 pages must be 15');
  });

  console.log('\n[SECTION 2] Read Budget & Stream Bounded Operations:');

  await runTest('Database reads remain strictly bounded (<= 30 docs fetched per page for limit=5)', async () => {
    const res = executeEmulatorDualStream(contributorA, 5);
    assert.ok(res.totalReads <= 30, `Total reads (${res.totalReads}) must be <= 30`);
  });

  console.log('\n[SECTION 3] RBAC Authorization Enforcement per Record:');

  await runTest('All returned records pass canReadReport authorization check for Contributor A', async () => {
    const res = executeEmulatorDualStream(contributorA, 10);
    for (const r of res.reports) {
      const auth = canReadReport(contributorA, r);
      assert.strictEqual(auth.allowed, true, `Record ${r.id} must be authorized for Contributor A`);
      assert.notStrictEqual(r.authorId, contributorB.id, `Contributor A must NEVER see Contributor B's report ${r.id}`);
    }
  });

  console.log('\n[SECTION 4] Cursor Security & Tampering Protections:');

  await runTest('Rejects expired HMAC cursor payload', async () => {
    const emptyFiltersHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ teamId: '', status: '', weekNumber: 0, year: 0 }))
      .digest('hex')
      .substring(0, 8);

    const expiredToken = createSignedCursor(
      {
        u: contributorA.id,
        t: contributorA.teamId,
        f: emptyFiltersHash,
        l: 5,
        id: 'rep_2026_w35_op_1',
        y: 2026,
        w: 35,
      },
      -1000 // Expired 1 second ago!
    );

    const res = verifyAndDecodeCursor(expiredToken, contributorA, emptyFiltersHash);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Cursor pagination telah kadaluarsa.');
  });

  await runTest('Rejects cross-user cursor reuse', async () => {
    const emptyFiltersHash = crypto
      .createHash('md5')
      .update(JSON.stringify({ teamId: '', status: '', weekNumber: 0, year: 0 }))
      .digest('hex')
      .substring(0, 8);

    const tokenUserA = createSignedCursor({
      u: contributorA.id,
      t: contributorA.teamId,
      f: emptyFiltersHash,
      l: 5,
      id: 'rep_2026_w35_op_1',
      y: 2026,
      w: 35,
    });

    // Contributor B attempts to present User A's token
    const res = verifyAndDecodeCursor(tokenUserA, contributorB, emptyFiltersHash);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Akses ditolak: Cursor pagination milik pengguna lain.');
  });

  console.log('\n===========================================================');
  console.log(` Firestore Emulator QA Summary: ${passedTests} Passed, ${totalTests - passedTests} Failed.`);
  console.log('===========================================================');
}

main().catch((err) => {
  console.error('Fatal error in emulator QA suite:', err);
  process.exit(1);
});
