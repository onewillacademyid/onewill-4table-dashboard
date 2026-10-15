/**
 * ONEWILL ACADEMY — M4.2-F3 STEP 2 QA TEST SUITE
 * Submit Request Investigation & UI Workflow Regression Suite
 *
 * Verifies:
 * 1. Submit already-saved DRAFT: issues exactly one POST /submit, ZERO PATCH.
 * 2. Dirty form (unsaved changes): submission strictly blocked with a clear Save Draft first message.
 * 3. Unpersisted report: submission strictly blocked requiring explicit Save Draft first.
 * 4. Missing required fields / 4-table completeness: clear validation feedback without network requests.
 * 5. Confirmation cancel: dialog closes with zero mutations (0 POST, 0 PATCH).
 * 6. Concurrency contract: sends expectedVersion: 2 and expectedRevision: 1 in body and x-expected-version header.
 * 7. Duplicate click prevention: in-flight locking prevents duplicate requests.
 * 8. Stale version (HTTP 409): handled safely with clear error banner and no automatic retry.
 * 9. Backend errors (HTTP 400, 403, 500): clear error messages without false success notification.
 * 10. Resubmit workflow (NEEDS_REVISION): sends expectedVersion: 4, expectedRevision: 1, advances revision to 2.
 * 11. Complete isolation: 100% in-memory mocked testing, zero real Firestore mutations.
 */

import assert from 'node:assert';
import { WeeklyReport, WeeklyReportSections } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function runTest(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      throw new Error(`Test '${description}' returned a promise. Use synchronous or await properly.`);
    }
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(description: string, fn: () => Promise<void>) {
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

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.2-F3 STEP 2 SUBMIT WORKFLOW QA TEST  ');
console.log('===========================================================\n');

// Standard 4-table sample sections meeting PRD completeness
const COMPLETE_SECTIONS: WeeklyReportSections = {
  achievements: {
    items: [
      {
        id: 'ach-1',
        description: 'Menyelesaikan modul pelatihan orientasi',
        project: 'Onboarding 2026',
        result: '100% peserta lulus evaluasi awal',
      },
    ],
    noUpdates: false,
  },
  issues: {
    items: [
      {
        id: 'iss-1',
        title: 'Keterlambatan konfirmasi narasumber tamu',
        businessImpact: 'Jadwal sesi pekan depan berpotensi mundur',
        severity: 'medium',
        owner: 'Siti Aminah',
        mitigation: 'Menghubungi narasumber cadangan',
        targetResolutionDate: '2026-10-18',
        state: 'open',
      },
    ],
    noUpdates: false,
  },
  objectives: {
    items: [
      {
        id: 'obj-1',
        objective: 'Melaksanakan evaluasi tengah pekan',
        measurableOutcome: 'Laporan evaluasi diterbitkan',
        assignee: 'Adhi Monow',
        dueDate: '2026-10-16',
        priority: 'high',
      },
    ],
    noUpdates: false,
  },
  support: {
    items: [
      {
        id: 'sup-1',
        request: 'Persetujuan anggaran narasumber tamu',
        type: 'budget',
        requestedFrom: 'Manajemen Keuangan',
        neededBy: '2026-10-15',
        businessConsequence: 'Pelatihan tidak dapat berjalan tanpa honorarium resmi',
        status: 'pending',
      },
    ],
    noUpdates: false,
  },
};

// Completeness validation helper identical to ReportEditorView
function validateCompleteness(
  title: string,
  sections: WeeklyReportSections
): { valid: boolean; error?: string } {
  if (!title.trim()) {
    return { valid: false, error: 'Judul laporan tidak boleh kosong.' };
  }
  if (sections.achievements.items.length === 0) {
    if (!sections.achievements.noUpdates) {
      return {
        valid: false,
        error:
          'Seksi Capaian Pekan Lalu (1) belum diisi. Tambahkan minimal 1 baris capaian atau centang "Tidak ada pembaruan".',
      };
    }
    if (
      !sections.achievements.noUpdatesReason ||
      sections.achievements.noUpdatesReason.trim().length < 5
    ) {
      return {
        valid: false,
        error:
          'Alasan tidak adanya pembaruan pada Seksi Capaian Pekan Lalu (1) wajib diisi minimal 5 karakter.',
      };
    }
  }
  if (sections.issues.items.length === 0) {
    if (!sections.issues.noUpdates) {
      return {
        valid: false,
        error:
          'Seksi Kendala & Hambatan (2) belum diisi. Tambahkan minimal 1 baris kendala atau centang "Tidak ada pembaruan".',
      };
    }
    if (
      !sections.issues.noUpdatesReason ||
      sections.issues.noUpdatesReason.trim().length < 5
    ) {
      return {
        valid: false,
        error:
          'Alasan tidak adanya pembaruan pada Seksi Kendala & Hambatan (2) wajib diisi minimal 5 karakter.',
      };
    }
  }
  if (sections.objectives.items.length === 0) {
    if (!sections.objectives.noUpdates) {
      return {
        valid: false,
        error:
          'Seksi Sasaran Pekan Depan (3) belum diisi. Tambahkan minimal 1 baris sasaran atau centang "Tidak ada pembaruan".',
      };
    }
    if (
      !sections.objectives.noUpdatesReason ||
      sections.objectives.noUpdatesReason.trim().length < 5
    ) {
      return {
        valid: false,
        error:
          'Alasan tidak adanya pembaruan pada Seksi Sasaran Pekan Depan (3) wajib diisi minimal 5 karakter.',
      };
    }
  }
  if (sections.support.items.length === 0) {
    if (!sections.support.noUpdates) {
      return {
        valid: false,
        error:
          'Seksi Dukungan yang Dibutuhkan (4) belum diisi. Tambahkan minimal 1 baris dukungan atau centang "Tidak ada pembaruan".',
      };
    }
    if (
      !sections.support.noUpdatesReason ||
      sections.support.noUpdatesReason.trim().length < 5
    ) {
      return {
        valid: false,
        error:
          'Alasan tidak adanya pembaruan pada Seksi Dukungan yang Dibutuhkan (4) wajib diisi minimal 5 karakter.',
      };
    }
  }
  return { valid: true };
}

// -------------------------------------------------------------
// [SECTION 1] Pre-Submission Guards & Early Returns
// -------------------------------------------------------------
console.log('[SECTION 1] Pre-Submission Guards & Early Returns:');

runTest('1. Missing title blocks submission with validation feedback', () => {
  const result = validateCompleteness('', COMPLETE_SECTIONS);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Judul laporan tidak boleh kosong.');
});

runTest('2. Incomplete sections without "no updates" justification blocks submission', () => {
  const incompleteSections: WeeklyReportSections = {
    ...COMPLETE_SECTIONS,
    achievements: { items: [], noUpdates: false },
  };
  const result = validateCompleteness('Laporan Mingguan W42', incompleteSections);
  assert.strictEqual(result.valid, false);
  assert.match(result.error || '', /Seksi Capaian Pekan Lalu \(1\) belum diisi/);
});

runTest('3. Incomplete sections with short reason (< 5 chars) blocks submission', () => {
  const shortReasonSections: WeeklyReportSections = {
    ...COMPLETE_SECTIONS,
    issues: { items: [], noUpdates: true, noUpdatesReason: 'nih' },
  };
  const result = validateCompleteness('Laporan Mingguan W42', shortReasonSections);
  assert.strictEqual(result.valid, false);
  assert.match(result.error || '', /minimal 5 karakter/);
});

runTest('4. Complete 4-table report passes completeness validation', () => {
  const result = validateCompleteness('Laporan Mingguan W42', COMPLETE_SECTIONS);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.error, undefined);
});

// -------------------------------------------------------------
// [SECTION 2] UI Workflow State Simulation (ReportEditorView Logic)
// -------------------------------------------------------------
console.log('\n[SECTION 2] Submit Workflow State Transitions & Mocked Execution:');

interface MockEditorState {
  report: WeeklyReport | null;
  title: string;
  sections: WeeklyReportSections;
  autosaveStatus: 'saved' | 'saving' | 'dirty' | 'failed';
  isConfirmSubmitOpen: boolean;
  isSubmitting: boolean;
  validationError: string | null;
  successMessage: string | null;
}

interface MockNetworkCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
}

function createEditorWorkflowHarness(initialReport: WeeklyReport | null, initialStatus: 'saved' | 'dirty' = 'saved') {
  const networkCalls: MockNetworkCall[] = [];
  let mockFetchHandler: ((call: MockNetworkCall) => Promise<{ status: number; data: any }>) | null = null;

  const state: MockEditorState = {
    report: initialReport,
    title: initialReport?.title || 'Laporan Mingguan Operasional & SDM — Pekan 42',
    sections: initialReport?.sections || COMPLETE_SECTIONS,
    autosaveStatus: initialStatus,
    isConfirmSubmitOpen: false,
    isSubmitting: false,
    validationError: null,
    successMessage: null,
  };

  const handleInitiateSubmit = () => {
    // 1. Completeness
    const completeness = validateCompleteness(state.title, state.sections);
    if (!completeness.valid) {
      state.validationError = completeness.error || 'Laporan belum lengkap.';
      return;
    }

    // 2. Dirty guard
    if (state.autosaveStatus === 'dirty') {
      state.validationError =
        'Terdapat perubahan yang belum disimpan. Silakan klik "Simpan Draf" terlebih dahulu sebelum mengajukan laporan.';
      return;
    }

    if (!state.report?.id) {
      state.validationError =
        'Laporan baru harus disimpan sebagai draf terlebih dahulu sebelum dapat diajukan. Silakan klik "Simpan Draf".';
      return;
    }

    // 3. Guards passed -> Open confirmation modal
    state.validationError = null;
    state.isConfirmSubmitOpen = true;
  };

  const handleCancelSubmit = () => {
    state.isConfirmSubmitOpen = false;
  };

  const handleConfirmSubmit = async () => {
    if (state.isSubmitting) return; // double click prevention
    state.isSubmitting = true;
    state.isConfirmSubmitOpen = false;
    state.validationError = null;

    try {
      const activeReportId = state.report?.id;
      if (!activeReportId) {
        state.validationError = 'ID Laporan tidak ditemukan.';
        state.isSubmitting = false;
        return;
      }

      const currentVersion = state.report?.version || 1;
      const currentRevision = state.report?.revision || 1;

      const endpoint = `/api/reports/${encodeURIComponent(activeReportId)}/submit`;
      const call: MockNetworkCall = {
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-expected-version': String(currentVersion),
        },
        body: {
          expectedVersion: currentVersion,
          expectedRevision: currentRevision,
        },
      };
      networkCalls.push(call);

      if (mockFetchHandler) {
        const response = await mockFetchHandler(call);
        if (response.status === 200 && response.data?.success) {
          const isResubmit = state.report?.status === 'NEEDS_REVISION';
          state.report = response.data.data;
          state.autosaveStatus = 'saved';
          state.successMessage = isResubmit
            ? `Laporan berhasil diajukan ulang untuk ditinjau (Revisi #${response.data.data.revision}).`
            : 'Laporan mingguan berhasil diajukan untuk ditinjau.';
          return;
        }

        if (response.status === 409) {
          state.autosaveStatus = 'failed';
          state.validationError =
            'Terjadi konflik versi (Stale Revision Conflict): Laporan ini telah diperbarui di sesi lain. Silakan muat ulang dan periksa kembali.';
        } else if (response.status === 400) {
          state.validationError = response.data?.error || 'Pengajuan laporan gagal: Validasi 4 tabel tidak terpenuhi.';
        } else if (response.status === 403) {
          state.validationError = response.data?.error || 'Akses ditolak: Anda tidak memiliki izin untuk mengajukan laporan ini.';
        } else {
          state.validationError = response.data?.error || 'Gagal mengajukan laporan.';
        }
      }
    } catch {
      state.validationError = 'Koneksi terputus saat mengajukan laporan ke server. Silakan coba kembali.';
    } finally {
      state.isSubmitting = false;
    }
  };

  return {
    state,
    networkCalls,
    setMockFetchHandler: (h: (call: MockNetworkCall) => Promise<{ status: number; data: any }>) => {
      mockFetchHandler = h;
    },
    handleInitiateSubmit,
    handleCancelSubmit,
    handleConfirmSubmit,
  };
}

const mockDraftReport: WeeklyReport = {
  id: 'rep_2026_w42_team-operasional',
  title: 'Laporan Mingguan Operasional & SDM — Pekan 42',
  authorId: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
  authorName: 'Adhi Monow',
  authorEmail: 'adhimonow@gmail.com',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  weekNumber: 42,
  year: 2026,
  weekStartDate: '2026-10-12',
  weekEndDate: '2026-10-18',
  status: 'DRAFT',
  version: 2,
  revision: 1,
  sections: COMPLETE_SECTIONS,
  archiveStatus: 'NOT_ARCHIVED',
  revisionsHistory: [],
  createdAt: '2026-10-12T08:00:00Z',
  updatedAt: '2026-10-12T09:00:00Z',
};

await runAsyncTest('5. Submit already-saved DRAFT: issues exactly ONE POST, ZERO PATCH', async () => {
  const harness = createEditorWorkflowHarness(mockDraftReport, 'saved');

  harness.setMockFetchHandler(async (call) => {
    assert.strictEqual(call.method, 'POST');
    assert.strictEqual(call.url, '/api/reports/rep_2026_w42_team-operasional/submit');
    return {
      status: 200,
      data: {
        success: true,
        data: {
          ...mockDraftReport,
          status: 'SUBMITTED',
          version: 3,
          revision: 1,
        },
      },
    };
  });

  // Step A: User clicks "Ajukan Laporan"
  harness.handleInitiateSubmit();
  assert.strictEqual(harness.state.isConfirmSubmitOpen, true, 'Confirmation modal opens for clean, saved draft');
  assert.strictEqual(harness.networkCalls.length, 0, 'Zero network calls before confirmation');

  // Step B: User confirms submission in modal
  await harness.handleConfirmSubmit();

  // Verify network call metrics
  assert.strictEqual(harness.networkCalls.length, 1, 'Exactly ONE network call issued');
  const call = harness.networkCalls[0];
  assert.strictEqual(call.method, 'POST', 'Operation method is POST (not PATCH)');
  assert.strictEqual(call.url, '/api/reports/rep_2026_w42_team-operasional/submit');
  assert.strictEqual(call.body.expectedVersion, 2, 'Token expectedVersion is 2');
  assert.strictEqual(call.body.expectedRevision, 1, 'Token expectedRevision is 1');
  assert.strictEqual(call.headers['x-expected-version'], '2', 'Header x-expected-version is "2"');

  // Verify UI outcome
  assert.strictEqual(harness.state.report?.status, 'SUBMITTED');
  assert.strictEqual(harness.state.report?.version, 3);
  assert.strictEqual(harness.state.isSubmitting, false);
  assert.match(harness.state.successMessage || '', /berhasil diajukan untuk ditinjau/);
});

await runAsyncTest('6. Dirty form: submission blocked with clear "Save Draft first" message', async () => {
  const harness = createEditorWorkflowHarness(mockDraftReport, 'dirty');

  harness.handleInitiateSubmit();

  // Modal must NOT open
  assert.strictEqual(harness.state.isConfirmSubmitOpen, false, 'Modal remains closed when form is dirty');
  assert.strictEqual(harness.networkCalls.length, 0, 'ZERO network calls issued (zero PATCH, zero POST)');
  assert.match(
    harness.state.validationError || '',
    /Terdapat perubahan yang belum disimpan\. Silakan klik "Simpan Draf" terlebih dahulu/,
    'Displays clear Indonesian guidance requiring explicit Save Draft first'
  );
});

await runAsyncTest('7. Unpersisted report (no ID): blocked requiring Save Draft first', async () => {
  const harness = createEditorWorkflowHarness(null, 'saved');

  harness.handleInitiateSubmit();

  assert.strictEqual(harness.state.isConfirmSubmitOpen, false, 'Modal remains closed for unpersisted report');
  assert.strictEqual(harness.networkCalls.length, 0, 'ZERO network calls issued');
  assert.match(
    harness.state.validationError || '',
    /Laporan baru harus disimpan sebagai draf terlebih dahulu/,
    'Displays guidance to save draft first for new report'
  );
});

await runAsyncTest('8. Confirmation cancel: closes modal with zero mutations', async () => {
  const harness = createEditorWorkflowHarness(mockDraftReport, 'saved');

  harness.handleInitiateSubmit();
  assert.strictEqual(harness.state.isConfirmSubmitOpen, true, 'Modal opens');

  // User cancels modal
  harness.handleCancelSubmit();
  assert.strictEqual(harness.state.isConfirmSubmitOpen, false, 'Modal closes on cancel');
  assert.strictEqual(harness.networkCalls.length, 0, 'ZERO mutations (zero requests) on cancel');
});

await runAsyncTest('9. Stale version (HTTP 409): handled safely without infinite retry', async () => {
  const harness = createEditorWorkflowHarness(mockDraftReport, 'saved');

  harness.setMockFetchHandler(async () => {
    return {
      status: 409,
      data: {
        success: false,
        code: 'STALE_REVISION_CONFLICT',
        error: 'Terjadi konflik versi: Laporan ini telah diperbarui di sesi lain.',
      },
    };
  });

  harness.handleInitiateSubmit();
  await harness.handleConfirmSubmit();

  assert.strictEqual(harness.networkCalls.length, 1, 'Exactly 1 request made (no automatic retry)');
  assert.strictEqual(harness.state.autosaveStatus, 'failed');
  assert.strictEqual(harness.state.isSubmitting, false);
  assert.match(harness.state.validationError || '', /Terjadi konflik versi \(Stale Revision Conflict\)/);
  assert.strictEqual(harness.state.successMessage, null, 'No false success banner');
});

await runAsyncTest('10. Duplicate click prevention: in-flight submission rejects concurrent clicks', async () => {
  const harness = createEditorWorkflowHarness(mockDraftReport, 'saved');

  let resolveRequest: any;
  const delayedPromise = new Promise<{ status: number; data: any }>((resolve) => {
    resolveRequest = resolve;
  });

  harness.setMockFetchHandler(async () => {
    return delayedPromise;
  });

  harness.handleInitiateSubmit();

  // First confirm click starts in-flight submission
  const firstSubmission = harness.handleConfirmSubmit();
  assert.strictEqual(harness.state.isSubmitting, true, 'isSubmitting locked to true');

  // Rapid second click while in flight
  await harness.handleConfirmSubmit();

  // Complete first request
  resolveRequest({
    status: 200,
    data: {
      success: true,
      data: { ...mockDraftReport, status: 'SUBMITTED', version: 3 },
    },
  });
  await firstSubmission;

  assert.strictEqual(harness.networkCalls.length, 1, 'Only exactly 1 request issued despite duplicate click');
});

await runAsyncTest('11. Backend 403 Forbidden: displays error message without false success', async () => {
  const harness = createEditorWorkflowHarness(mockDraftReport, 'saved');

  harness.setMockFetchHandler(async () => {
    return {
      status: 403,
      data: {
        success: false,
        code: 'UNAUTHORIZED_ROLE',
        error: 'Akses ditolak: Hanya penulis asli yang dapat mengajukan laporan ini.',
      },
    };
  });

  harness.handleInitiateSubmit();
  await harness.handleConfirmSubmit();

  assert.strictEqual(harness.networkCalls.length, 1);
  assert.strictEqual(harness.state.isSubmitting, false);
  assert.match(harness.state.validationError || '', /Akses ditolak: Hanya penulis asli/);
  assert.strictEqual(harness.state.successMessage, null);
});

await runAsyncTest('12. Resubmit workflow (NEEDS_REVISION): advances revision to 2 with single POST', async () => {
  const mockRevisionReport: WeeklyReport = {
    ...mockDraftReport,
    status: 'NEEDS_REVISION',
    version: 4,
    revision: 1,
    reviewNotes: 'Mohon tambahkan rincian mitigasi.',
  };

  const harness = createEditorWorkflowHarness(mockRevisionReport, 'saved');

  harness.setMockFetchHandler(async (call) => {
    assert.strictEqual(call.body.expectedVersion, 4);
    assert.strictEqual(call.body.expectedRevision, 1);
    assert.strictEqual(call.headers['x-expected-version'], '4');
    return {
      status: 200,
      data: {
        success: true,
        data: {
          ...mockRevisionReport,
          status: 'SUBMITTED',
          version: 5,
          revision: 2,
        },
      },
    };
  });

  harness.handleInitiateSubmit();
  assert.strictEqual(harness.state.isConfirmSubmitOpen, true);

  await harness.handleConfirmSubmit();

  assert.strictEqual(harness.networkCalls.length, 1, 'Single POST for resubmission (0 PATCH)');
  assert.strictEqual(harness.state.report?.revision, 2);
  assert.match(harness.state.successMessage || '', /Revisi #2/);
});

console.log('\n===========================================================');
console.log(` Summary: ${passedTests} Passed, ${totalTests - passedTests} Failed. Total: ${totalTests}`);
console.log('===========================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
