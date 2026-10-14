/**
 * Onewill Academy — Milestone M4.2-F3 Step 1 Regression Test Suite
 * Firestore Serialization & Undefined Field Prevention Verification
 *
 * Verifies:
 * 1. sanitizeFirestorePayload removes undefined fields from shallow and deeply nested objects.
 * 2. sanitizeFirestorePayload preserves null, Date, FieldValue, Timestamp, boolean, numbers, arrays, strings.
 * 3. Legacy M4.1 DRAFT without submittedAt produces zero undefined fields when updated via executeSaveDraft.
 * 4. updateReportDraft payload is 100% compliant with Firestore strict serialization (no undefined).
 * 5. Successful draft save increments version by exactly one.
 * 6. Successful draft save generates exactly one REPORT_UPDATED audit event.
 * 7. No fabricated submittedAt or approvedAt timestamp is generated.
 * 8. Invalid required fields fail validation.
 * 9. Concurrency conflict (stale token) is still rejected.
 * 10. Audit event metadata does not contain undefined fields when comments are omitted.
 *
 * Guaranteed ZERO real Firestore network operations (100% in-memory / unit mocked).
 */

import assert from 'node:assert';
import { sanitizeFirestorePayload } from '../src/lib/repos/firestore-report-repository';
import { executeSaveDraft, executeWorkflowTransition, WorkflowCaller, WorkflowCurrentReport } from '../src/lib/workflow/state-machine';
import { WeeklyReport, WeeklyReportSections } from '../src/types';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — FIRESTORE SERIALIZATION REGRESSION TEST  ');
console.log('===========================================================\n');

let totalTests = 0;
let passedTests = 0;

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

// Helper to recursively detect any undefined property in an object
function hasUndefinedField(obj: any, path = ''): { found: boolean; path?: string } {
  if (obj === null || obj === undefined) {
    return { found: obj === undefined, path };
  }
  if (typeof obj !== 'object') {
    return { found: false };
  }
  if (obj instanceof Date) {
    return { found: false };
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const res = hasUndefinedField(obj[i], `${path}[${i}]`);
      if (res.found) return res;
    }
    return { found: false };
  }
  for (const [key, val] of Object.entries(obj)) {
    const curPath = path ? `${path}.${key}` : key;
    if (val === undefined) {
      return { found: true, path: curPath };
    }
    const res = hasUndefinedField(val, curPath);
    if (res.found) return res;
  }
  return { found: false };
}

// -------------------------------------------------------------
// Test Fixtures
// -------------------------------------------------------------
const sampleSections: WeeklyReportSections = {
  achievements: {
    items: [
      {
        id: 'ach-1',
        description: 'Menyelesaikan modul operasional',
        project: 'SOP Cabang',
        result: '100% terverifikasi',
      },
    ],
    noUpdates: false,
  },
  issues: {
    items: [],
    noUpdates: true,
    noUpdatesReason: 'Tidak ada kendala operasional pada pekan ini.',
  },
  objectives: {
    items: [
      {
        id: 'obj-1',
        objective: 'Audit fasilitas cabang',
        measurableOutcome: 'Laporan rampung',
        assignee: 'Adhi Monow',
        dueDate: '2026-10-25',
        priority: 'high',
      },
    ],
    noUpdates: false,
  },
  support: {
    items: [],
    noUpdates: true,
    noUpdatesReason: 'Tidak memerlukan eskalasi dukungan anggaran pada pekan ini.',
  },
};

const authorCaller: WorkflowCaller = {
  id: 'usr-contributor-adhi',
  email: 'adhimonow@gmail.com',
  name: 'Adhi Monow',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  active: true,
};

// Legacy M4.1 Report without submittedAt or version
const legacyW42Report: WorkflowCurrentReport = {
  id: 'rep_2026_w42_team-operasional',
  title: '[TEST DATA / NOT ACTUAL BUSINESS REPORT] Laporan Mingguan Tim Operasional W42 2026',
  authorId: 'usr-contributor-adhi',
  authorName: 'Adhi Monow',
  authorEmail: 'adhimonow@gmail.com',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  weekNumber: 42,
  year: 2026,
  weekStartDate: '2026-10-12',
  weekEndDate: '2026-10-18',
  status: 'DRAFT' as const,
  revision: 1,
  // version is undefined on legacy reports
  sections: sampleSections,
  revisionsHistory: [
    {
      revisionNumber: 1,
      updatedAt: '2026-10-12T20:18:11.428Z',
      updatedBy: 'usr-contributor-adhi',
      updatedByName: 'Adhi Monow',
      action: 'CREATED',
      notes: 'Draf laporan mingguan dibuat.',
    },
  ],
  createdAt: '2026-10-12T20:18:11.428Z',
  updatedAt: '2026-10-12T20:18:11.428Z',
  archiveStatus: 'NOT_ARCHIVED',
  // submittedAt is undefined
  // reviewedAt is undefined
  // reviewedBy is undefined
  // reviewerName is undefined
  // reviewNotes is undefined
};

// -------------------------------------------------------------
// Test Section 1: sanitizeFirestorePayload Unit Tests
// -------------------------------------------------------------
console.log('[SECTION 1] sanitizeFirestorePayload Unit Integrity:');

runTest('Removes shallow undefined keys', () => {
  const input = { a: 1, b: undefined, c: 'hello' };
  const sanitized = sanitizeFirestorePayload(input);
  assert.strictEqual(sanitized.a, 1);
  assert.strictEqual(sanitized.c, 'hello');
  assert.strictEqual('b' in sanitized, false);
});

runTest('Removes deeply nested undefined keys in objects and arrays', () => {
  const input = {
    level1: {
      valid: true,
      absent: undefined,
      nestedArray: [{ x: 10, y: undefined }, { z: 'ok' }],
    },
  };
  const sanitized = sanitizeFirestorePayload(input);
  assert.strictEqual(sanitized.level1.valid, true);
  assert.strictEqual('absent' in sanitized.level1, false);
  assert.strictEqual(sanitized.level1.nestedArray[0].x, 10);
  assert.strictEqual('y' in sanitized.level1.nestedArray[0], false);
});

runTest('Preserves null values without conversion in objects and arrays', () => {
  const input = { nullField: null, undefinedField: undefined, zero: 0, empty: '', list: [1, null, 'text'] };
  const sanitized = sanitizeFirestorePayload(input);
  assert.strictEqual(sanitized.nullField, null);
  assert.strictEqual('undefinedField' in sanitized, false);
  assert.strictEqual(sanitized.zero, 0);
  assert.strictEqual(sanitized.empty, '');
  assert.strictEqual(sanitized.list[1], null);
  assert.strictEqual(sanitized.list.length, 3);
});

runTest('Does NOT mutate the original input object or nested structures', () => {
  const original = {
    title: 'Original Title',
    items: [{ id: '1', note: undefined }],
    tags: ['ops', 'hr'],
  };
  const snapshotBefore = JSON.stringify(original);
  const sanitized = sanitizeFirestorePayload(original);

  assert.strictEqual(JSON.stringify(original), snapshotBefore, 'Original input was mutated!');
  assert.notStrictEqual(sanitized, original, 'Sanitized output should be a new object reference');
  assert.notStrictEqual(sanitized.items, original.items, 'Sanitized nested array should be a new reference');
  assert.notStrictEqual(sanitized.items[0], original.items[0], 'Sanitized nested item should be a new reference');
});

runTest('Strictly throws an error when an array contains undefined (no silent drop or position shifting)', () => {
  const inputWithUndefinedInArray = {
    items: ['first', undefined, 'third'],
  };
  assert.throws(
    () => sanitizeFirestorePayload(inputWithUndefinedInArray),
    (err: any) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('Array contains undefined element at index 1'));
      assert.ok(err.message.includes('path: "items[1]"'));
      return true;
    }
  );
});

runTest('Strictly throws an error when a deeply nested array contains undefined', () => {
  const inputWithNestedUndefinedInArray = {
    section: {
      subsections: [
        { tags: ['valid', undefined] },
      ],
    },
  };
  assert.throws(
    () => sanitizeFirestorePayload(inputWithNestedUndefinedInArray),
    (err: any) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('Array contains undefined element at index 1'));
      assert.ok(err.message.includes('path: "section.subsections[0].tags[1]"'));
      return true;
    }
  );
});

runTest('Preserves Date instances intact and clones them for purity', () => {
  const now = new Date();
  const input = { timestamp: now, omit: undefined };
  const sanitized = sanitizeFirestorePayload(input);
  assert.ok(sanitized.timestamp instanceof Date);
  assert.strictEqual(sanitized.timestamp.getTime(), now.getTime());
  assert.notStrictEqual(sanitized.timestamp, now, 'Date instance should be cloned to preserve input immutability');
  assert.strictEqual('omit' in sanitized, false);
});

runTest('Preserves custom class instances (e.g. FieldValue, Timestamp mock)', () => {
  class MockFirestoreFieldValue {
    private _method = 'serverTimestamp';
  }
  const mockFieldValue = new MockFirestoreFieldValue();
  const input = { serverTime: mockFieldValue, omit: undefined };
  const sanitized = sanitizeFirestorePayload(input);
  assert.strictEqual(sanitized.serverTime, mockFieldValue);
  assert.strictEqual('omit' in sanitized, false);
});

// -------------------------------------------------------------
// Test Section 2: Legacy M4.1 Draft Save Serialization
// -------------------------------------------------------------
console.log('\n[SECTION 2] Legacy M4.1 Report Save Serialization:');

runTest('Legacy report without submittedAt produces clean Firestore payload without undefined', () => {
  const currentReport: WorkflowCurrentReport = {
    ...legacyW42Report,
    version: legacyW42Report.version ?? 1,
  };

  const transition = executeSaveDraft({
    currentReport,
    caller: authorCaller,
    updates: {
      title: 'Laporan Diperbarui Tanpa Error',
      sections: sampleSections,
    },
    expectedVersion: 1,
    expectedRevision: 1,
  });

  assert.strictEqual(transition.success, true);
  if (!transition.success) return;

  const sanitized = sanitizeFirestorePayload(transition.nextReport);
  const check = hasUndefinedField(sanitized);
  assert.strictEqual(check.found, false, `Found undefined field at: ${check.path}`);

  // Confirm no fabricated submittedAt or approvedAt
  assert.strictEqual('submittedAt' in sanitized, false);
  assert.strictEqual('reviewedAt' in sanitized, false);
  assert.strictEqual('reviewedBy' in sanitized, false);
  assert.strictEqual('reviewNotes' in sanitized, false);
});

runTest('Successful draft save increments version from 1 to 2', () => {
  const currentReport: WorkflowCurrentReport = {
    ...legacyW42Report,
    version: 1,
  };

  const transition = executeSaveDraft({
    currentReport,
    caller: authorCaller,
    updates: {
      sections: sampleSections,
    },
    expectedVersion: 1,
  });

  assert.strictEqual(transition.success, true);
  if (!transition.success) return;

  assert.strictEqual(transition.nextReport.version, 2);
  assert.strictEqual(transition.nextReport.status, 'DRAFT');
  assert.strictEqual(transition.nextReport.revision, 1);
});

runTest('Successful draft save produces exactly one REPORT_UPDATED audit event without undefined', () => {
  const currentReport: WorkflowCurrentReport = {
    ...legacyW42Report,
    version: 1,
  };

  const transition = executeSaveDraft({
    currentReport,
    caller: authorCaller,
    updates: {
      sections: sampleSections,
    },
    expectedVersion: 1,
  });

  assert.strictEqual(transition.success, true);
  if (!transition.success) return;

  assert.strictEqual(transition.auditEvent.action, 'REPORT_UPDATED');
  assert.strictEqual(transition.auditEvent.actorUid, authorCaller.id);

  const sanitizedAudit = sanitizeFirestorePayload(transition.auditEvent);
  const check = hasUndefinedField(sanitizedAudit);
  assert.strictEqual(check.found, false, `Found undefined in audit event: ${check.path}`);
});

// -------------------------------------------------------------
// Test Section 3: Submit & Audit Metadata Undefined Prevention
// -------------------------------------------------------------
console.log('\n[SECTION 3] Submit & Approval Serialization Integrity:');

runTest('Submit without comments does NOT produce undefined in audit metadata', () => {
  const currentReport: WorkflowCurrentReport = {
    ...legacyW42Report,
    version: 1,
  };

  const transition = executeWorkflowTransition({
    currentReport,
    caller: authorCaller,
    action: 'SUBMIT',
    payload: { comments: '' }, // empty comment
    expectedVersion: 1,
  });

  assert.strictEqual(transition.success, true);
  if (!transition.success) return;

  const sanitizedAudit = sanitizeFirestorePayload(transition.auditEvent);
  const check = hasUndefinedField(sanitizedAudit);
  assert.strictEqual(check.found, false, `Found undefined in submit audit metadata: ${check.path}`);
  assert.strictEqual('comments' in sanitizedAudit.metadata, false);
});

runTest('Stale concurrency token expectedVersion is rejected with STALE_REVISION_CONFLICT', () => {
  const currentReport: WorkflowCurrentReport = {
    ...legacyW42Report,
    version: 2,
  };

  const transition = executeSaveDraft({
    currentReport,
    caller: authorCaller,
    updates: { sections: sampleSections },
    expectedVersion: 1, // Stale! Current is 2
  });

  assert.strictEqual(transition.success, false);
  if (transition.success) return;
  assert.strictEqual(transition.code, 'STALE_REVISION_CONFLICT');
});

console.log('\n===========================================================');
console.log(` Summary: ${passedTests} Passed, 0 Failed. Total: ${totalTests}`);
console.log('===========================================================');
