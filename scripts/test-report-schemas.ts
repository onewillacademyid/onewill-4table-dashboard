/**
 * Onewill Academy | M4.1 Phase B Report Schema & Repository QA Test Suite
 * Validates Zod schemas, ISO week boundaries, document ID derivation,
 * timestamp serialization, and server repository interface logic.
 * Run with: npx tsx scripts/test-report-schemas.ts
 */

import assert from 'node:assert';
import {
  CreateReportInputSchema,
  AchievementItemSchema,
  IssueItemSchema,
  ObjectiveItemSchema,
  SupportItemSchema,
  WeeklyReportSectionsSchema,
  ReportStatusSchema,
  ArchiveStatusSchema,
  deriveReportDocId,
  getIsoWeeksInYear,
  validateReportWeekBounds,
} from '../src/lib/validation/report';
import { serializeFirestoreTimestamp } from '../src/types/firestore';
import { FirestoreReportRepository } from '../src/lib/repos/firestore-report-repository';
import { User } from '../src/types';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.1 PHASE B SCHEMA & QA TEST SUITE    ');
console.log('===========================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

// ==========================================
// [1] Valid Four-Table Report Schemas
// ==========================================
console.log('[1] Valid Four-Table Report Schemas:');

runTest('Valid Achievement item parses cleanly', () => {
  const validAchievement = {
    id: 'ach-1',
    description: 'Finalisasi silabus pelatihan executive B2B Q4.',
    project: 'Pengembangan Silabus B2B',
    result: '100% modul selesai ditelaah pakar.',
    targetValue: 1,
    actualValue: 1,
    unit: 'modul',
    evidenceUrl: 'https://docs.google.com/demo/syllabus',
  };
  const result = AchievementItemSchema.safeParse(validAchievement);
  assert.strictEqual(result.success, true);
});

runTest('Valid Issue item parses cleanly', () => {
  const validIssue = {
    id: 'iss-1',
    title: 'Keterlambatan konfirmasi fasilitator tamu masterclass',
    businessImpact: 'Jadwal berisiko tertunda 3 hari kerja.',
    severity: 'high',
    owner: 'Siti Nurhaliza',
    mitigation: 'Menghubungi fasilitator cadangan.',
    targetResolutionDate: '2026-10-09',
    state: 'mitigating',
  };
  const result = IssueItemSchema.safeParse(validIssue);
  assert.strictEqual(result.success, true);
});

runTest('Valid Objective item parses cleanly', () => {
  const validObjective = {
    id: 'obj-1',
    objective: 'Merilis instrumen evaluasi kepuasan peserta terstandardisasi',
    measurableOutcome: 'Tingkat pengisian kuesioner minimal 85%',
    assignee: 'Siti Nurhaliza',
    dueDate: '2026-10-12',
    priority: 'high',
  };
  const result = ObjectiveItemSchema.safeParse(validObjective);
  assert.strictEqual(result.success, true);
});

runTest('Valid Support item parses cleanly', () => {
  const validSupport = {
    id: 'sup-1',
    request: 'Persetujuan penambahan honorarium fasilitator tamu',
    type: 'budget',
    requestedFrom: 'Budi Santoso (Manajemen)',
    neededBy: '2026-10-09',
    amount: 7500000,
    businessConsequence: 'Pelatihan dialihkan ke fasilitator lokal jika tidak disetujui',
    status: 'pending',
  };
  const result = SupportItemSchema.safeParse(validSupport);
  assert.strictEqual(result.success, true);
});

runTest('Valid complete WeeklyReportSections parses cleanly', () => {
  const validSections = {
    achievements: {
      items: [
        {
          id: 'ach-1',
          description: 'Penulisan modul 1-4 selesai.',
          project: 'LMS Modul',
          result: 'Selesai 100%',
        },
      ],
      noUpdates: false,
    },
    issues: {
      items: [],
      noUpdates: true,
      noUpdatesReason: 'Seluruh operasional berjalan lancar tanpa hambatan.',
    },
    objectives: {
      items: [
        {
          id: 'obj-1',
          objective: 'Rilis fitur baru LMS',
          measurableOutcome: 'Deployment sukses',
          assignee: 'Hendra Wijaya',
          dueDate: '2026-10-15',
          priority: 'medium',
        },
      ],
      noUpdates: false,
    },
    support: {
      items: [],
      noUpdates: true,
      noUpdatesReason: 'Tidak ada permintaan dukungan pekan ini.',
    },
  };
  const result = WeeklyReportSectionsSchema.safeParse(validSections);
  assert.strictEqual(result.success, true);
});

console.log('');

// ==========================================
// [2] Invalid Field Types & Missing Required Values
// ==========================================
console.log('[2] Invalid Field Types & Missing Values:');

runTest('Rejects missing required description in Achievement', () => {
  const invalidAchievement = {
    id: 'ach-1',
    description: '', // Empty description
    project: 'Proyek',
    result: 'Hasil',
  };
  const result = AchievementItemSchema.safeParse(invalidAchievement);
  assert.strictEqual(result.success, false);
});

runTest('Rejects invalid severity value in Issue', () => {
  const invalidIssue = {
    id: 'iss-1',
    title: 'Kendala',
    businessImpact: 'Dampak',
    severity: 'SUPER_CRITICAL', // Invalid enum
    owner: 'Owner',
    mitigation: 'Mitigasi',
    targetResolutionDate: '2026-10-09',
    state: 'open',
  };
  const result = IssueItemSchema.safeParse(invalidIssue);
  assert.strictEqual(result.success, false);
});

runTest('Rejects negative budget amount in Support request', () => {
  const invalidSupport = {
    id: 'sup-1',
    request: 'Anggaran',
    type: 'budget',
    requestedFrom: 'Manajemen',
    neededBy: '2026-10-09',
    amount: -500000, // Negative amount
    businessConsequence: 'Konsekuensi',
    status: 'pending',
  };
  const result = SupportItemSchema.safeParse(invalidSupport);
  assert.strictEqual(result.success, false);
});

runTest('Rejects noUpdates=true without providing noUpdatesReason', () => {
  const invalidSections = {
    achievements: {
      items: [],
      noUpdates: true,
      // Missing noUpdatesReason!
    },
    issues: { items: [], noUpdates: true, noUpdatesReason: 'A' },
    objectives: { items: [], noUpdates: true, noUpdatesReason: 'B' },
    support: { items: [], noUpdates: true, noUpdatesReason: 'C' },
  };
  const result = WeeklyReportSectionsSchema.safeParse(invalidSections);
  assert.strictEqual(result.success, false);
});

console.log('');

// ==========================================
// [3] ISO Week-Year & Date Boundary Validation
// ==========================================
console.log('[3] ISO Week-Year & Date Boundary Validation:');

runTest('Correctly calculates total ISO weeks in 2026 (53 weeks)', () => {
  const weeks = getIsoWeeksInYear(2026);
  assert.strictEqual(weeks, 53);
});

runTest('Correctly calculates total ISO weeks in 2027 (52 weeks)', () => {
  const weeks = getIsoWeeksInYear(2027);
  assert.strictEqual(weeks, 52);
});

runTest('Validates correct 2026 Week 41 bounds (2026-10-05 Mon to 2026-10-11 Sun)', () => {
  const valid = validateReportWeekBounds(2026, 41, '2026-10-05', '2026-10-11');
  assert.strictEqual(valid, true);
});

runTest('Rejects week 53 for year 2027 (max 52 weeks)', () => {
  const valid = validateReportWeekBounds(2027, 53, '2027-12-27', '2028-01-02');
  assert.strictEqual(valid, false);
});

runTest('Rejects non-Monday weekStartDate (e.g. Wednesday 2026-10-07)', () => {
  const valid = validateReportWeekBounds(2026, 41, '2026-10-07', '2026-10-13');
  assert.strictEqual(valid, false);
});

runTest('Rejects non-7-day week span (e.g. 5 days difference)', () => {
  const valid = validateReportWeekBounds(2026, 41, '2026-10-05', '2026-10-09');
  assert.strictEqual(valid, false);
});

console.log('');

// ==========================================
// [4] Deterministic Document ID Derivation & Status Enums
// ==========================================
console.log('[4] Deterministic Document ID & Status Enums:');

runTest('Derives deterministic document ID for team-operasional W41 2026', () => {
  const docId = deriveReportDocId('team-operasional', 2026, 41);
  assert.strictEqual(docId, 'rep_2026_w41_team-operasional');
});

runTest('Derives identical document ID regardless of casing or whitespace', () => {
  const id1 = deriveReportDocId('team-operasional', 2026, 41);
  const id2 = deriveReportDocId(' TEAM-OPERASIONAL  ', 2026, 41);
  assert.strictEqual(id1, id2);
});

runTest('Validates all 5 PRD ReportStatus enum values', () => {
  const statuses = ['DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'ARCHIVED'];
  for (const s of statuses) {
    const res = ReportStatusSchema.safeParse(s);
    assert.strictEqual(res.success, true);
  }
});

runTest('Validates all 4 PRD ArchiveStatus enum values', () => {
  const statuses = ['NOT_ARCHIVED', 'QUEUED', 'ARCHIVED', 'FAILED'];
  for (const s of statuses) {
    const res = ArchiveStatusSchema.safeParse(s);
    assert.strictEqual(res.success, true);
  }
});

console.log('');

// ==========================================
// [5] Firestore Timestamp Safe Serialization
// ==========================================
console.log('[5] Firestore Timestamp Safe Serialization:');

runTest('Serializes ISO string as ISO string unchanged', () => {
  const iso = '2026-10-08T10:00:00.000Z';
  assert.strictEqual(serializeFirestoreTimestamp(iso), iso);
});

runTest('Serializes JavaScript Date object to ISO string', () => {
  const d = new Date('2026-10-08T10:00:00.000Z');
  assert.strictEqual(serializeFirestoreTimestamp(d), '2026-10-08T10:00:00.000Z');
});

runTest('Serializes Firestore Timestamp-like object ({ toDate: () => Date })', () => {
  const mockTimestamp = {
    toDate: () => new Date('2026-10-08T10:00:00.000Z'),
  };
  assert.strictEqual(serializeFirestoreTimestamp(mockTimestamp), '2026-10-08T10:00:00.000Z');
});

runTest('Returns undefined for null or undefined input (prevents timestamp fabrication)', () => {
  const resNull = serializeFirestoreTimestamp(null);
  const resUndef = serializeFirestoreTimestamp(undefined);
  assert.strictEqual(resNull, undefined);
  assert.strictEqual(resUndef, undefined);
});

console.log('');

// ==========================================
// [6] Repository Interface & RBAC Edge Cases
// ==========================================
console.log('[6] Repository Interface & RBAC Edge Cases:');

runTest('Rejects report creation when author identity is missing (UNAUTHENTICATED)', async () => {
  const repo = new FirestoreReportRepository();
  const res = await repo.createReport({
    input: {
      weekNumber: 41,
      year: 2026,
      weekStartDate: '2026-10-05',
      weekEndDate: '2026-10-11',
      sections: {
        achievements: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        issues: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        objectives: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        support: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
      },
    },
    author: {} as User, // Missing author details!
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 'UNAUTHENTICATED');
});

runTest('Rejects report creation when author account is inactive (DISABLED/UNAUTHORIZED)', async () => {
  const repo = new FirestoreReportRepository();
  const inactiveContributor: User = {
    id: 'user-disabled',
    name: 'Disabled User',
    email: 'disabled@onewill-demo.id',
    role: 'CONTRIBUTOR',
    teamId: 'team-operasional',
    teamName: 'Operasional',
    avatarColor: '#000',
    avatarInitials: 'DU',
    active: false, // Inactive!
    lastActive: '2026-10-08',
  };

  const res = await repo.createReport({
    input: {
      weekNumber: 41,
      year: 2026,
      weekStartDate: '2026-10-05',
      weekEndDate: '2026-10-11',
      sections: {
        achievements: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        issues: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        objectives: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        support: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
      },
    },
    author: inactiveContributor,
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 'UNAUTHORIZED_ROLE');
});

runTest('FirestoreReportRepository rejects write with MUTATION_DISABLED when feature gate is false', async () => {
  const repo = new FirestoreReportRepository();
  const activeContributor: User = {
    id: 'user-adhi-real-uid',
    name: 'Adhi Monow',
    email: 'adhimonow@gmail.com',
    role: 'CONTRIBUTOR',
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    avatarColor: '#123456',
    avatarInitials: 'AM',
    active: true,
    lastActive: '2026-10-10',
  };

  const res = await repo.createReport({
    input: {
      weekNumber: 41,
      year: 2026,
      weekStartDate: '2026-10-05',
      weekEndDate: '2026-10-11',
      sections: {
        achievements: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        issues: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        objectives: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
        support: { items: [], noUpdates: true, noUpdatesReason: 'Reason' },
      },
    },
    author: activeContributor,
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 'MUTATION_DISABLED');
});

console.log('');
console.log('===========================================================');
console.log(` Report Schema & QA Test Summary: ${passedTests} Passed, ${totalTests - passedTests} Failed.`);
console.log('===========================================================');
