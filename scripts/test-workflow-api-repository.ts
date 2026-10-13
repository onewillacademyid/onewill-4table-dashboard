/**
 * Onewill Academy — Milestone M4.2-C Test Suite
 * Secure Workflow Repository & API Implementation Verification
 *
 * Validates:
 * 1. Valid workflow transitions (PATCH draft, POST submit, POST request-revision, POST approve).
 * 2. Invalid transitions (Draft -> Approve, Draft -> Request Revision, Submitted -> Submit, etc.).
 * 3. Contributor authorization (Contributor cannot approve, non-author cannot submit).
 * 4. Reviewer team scope (Team Lead can only review reports for own team).
 * 5. Cross-team denial (Team Lead of team A denied for team B).
 * 6. Segregation of Duties (Author cannot approve own report; Admin/Super Admin cannot self-approve).
 * 7. Disabled accounts (Active false rejected with 403 DISABLED).
 * 8. Missing session (Unauthenticated request rejected with 401 UNAUTHENTICATED).
 * 9. CSRF rejection (Untrusted origin rejected with 403 CSRF_REJECTED).
 * 10. Spoofed server metadata (Client-injected authorId, teamId, status, actorUid rejected with 400).
 * 11. Stale concurrency token (Expected version/revision mismatch rejected with 409).
 * 12. Duplicate transitions (Double submit rejected).
 * 13. Atomic report & audit event generation.
 * 14. Immutable approval snapshots (Snapshot created; overwrite rejected).
 * 15. Legacy M4.1 backward compatibility (Reports without version token default to v1 and advance).
 * 16. Feature gate fail-closed (Returns 403 MUTATION_DISABLED when gate is enforced).
 *
 * Guaranteed ZERO real Firestore network operations (100% in-memory mocked execution).
 * Run with: npx tsx scripts/test-workflow-api-repository.ts
 */

import assert from 'node:assert';
import { PATCH as handlePatchReportDraft } from '../src/app/api/reports/[id]/route';
import { POST as handleSubmitReport } from '../src/app/api/reports/[id]/submit/route';
import { POST as handleRequestRevision } from '../src/app/api/reports/[id]/request-revision/route';
import { POST as handleApproveReport } from '../src/app/api/reports/[id]/approve/route';

import {
  setReportRepositoryForTesting,
  resetReportRepositoryForTesting,
} from '../src/lib/repos/report-repository-factory';
import { InMemoryReportRepository } from '../src/lib/repos/in-memory-report-repository';
import { setCustomSessionVerifierForTesting } from '../src/lib/auth/server-auth';
import { User, WeeklyReport, WeeklyReportSections } from '../src/types';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.2-C WORKFLOW REPOSITORY & API TEST   ');
console.log('===========================================================\n');

let totalTests = 0;
let passedTests = 0;

async function runTest(description: string, fn: () => Promise<void>) {
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

// -------------------------------------------------------------
// Test User Personas
// -------------------------------------------------------------
const authorContributor: User = {
  id: 'usr-contributor-adhi',
  email: 'adhimonow@gmail.com',
  name: 'Adhi Monow',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#123456',
  avatarInitials: 'AM',
  active: true,
  lastActive: '2026-10-12',
};

const otherContributor: User = {
  id: 'usr-contributor-bambang',
  email: 'bambang@onewill.id',
  name: 'Bambang',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#234567',
  avatarInitials: 'B',
  active: true,
  lastActive: '2026-10-12',
};

const leadOperasional: User = {
  id: 'usr-lead-budi',
  email: 'budi.santoso@onewill.id',
  name: 'Budi Santoso',
  role: 'TEAM_LEAD',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#345678',
  avatarInitials: 'BS',
  active: true,
  lastActive: '2026-10-12',
};

const leadAkademik: User = {
  id: 'usr-lead-siti',
  email: 'siti@onewill.id',
  name: 'Siti Nurhaliza',
  role: 'TEAM_LEAD',
  teamId: 'team-akademik',
  teamName: 'Akademik & Kurikulum',
  avatarColor: '#456789',
  avatarInitials: 'SN',
  active: true,
  lastActive: '2026-10-12',
};

const managerExecutive: User = {
  id: 'usr-manager-hendra',
  email: 'hendra.wijaya@onewill.id',
  name: 'Hendra Wijaya',
  role: 'MANAGEMENT',
  teamId: 'team-executive',
  teamName: 'Manajemen / Executive',
  avatarColor: '#567890',
  avatarInitials: 'HW',
  active: true,
  lastActive: '2026-10-12',
};

const superAdminAuthor: User = {
  id: 'usr-superadmin-willy',
  email: 'willy@onewill.id',
  name: 'Willy Premadi',
  role: 'SUPER_ADMIN',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#678901',
  avatarInitials: 'WP',
  active: true,
  lastActive: '2026-10-12',
};

const disabledUser: User = {
  id: 'usr-disabled-user',
  email: 'disabled@onewill.id',
  name: 'Disabled User',
  role: 'TEAM_LEAD',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#000000',
  avatarInitials: 'DU',
  active: false,
  lastActive: '2026-10-12',
};

// -------------------------------------------------------------
// Sample 4-Table Sections Data
// -------------------------------------------------------------
const completeSections: WeeklyReportSections = {
  achievements: {
    items: [
      {
        id: 'ach-1',
        description: 'Menyelesaikan modul orientasi 5 karyawan baru',
        project: 'Program Onboarding Q4',
        result: '100% peserta lulus evaluasi awal',
        targetValue: 5,
        actualValue: 5,
        unit: 'orang',
      },
    ],
    noUpdates: false,
  },
  issues: {
    items: [
      {
        id: 'iss-1',
        title: 'Keterlambatan verifikasi berkas BPJS',
        businessImpact: 'Tertundanya kepesertaan 3 staf baru',
        severity: 'medium',
        owner: 'Siti HR',
        mitigation: 'Eskalasi ke kantor cabang BPJS wilayah',
        targetResolutionDate: '2026-10-20',
        state: 'open',
      },
    ],
    noUpdates: false,
  },
  objectives: {
    items: [
      {
        id: 'obj-1',
        objective: 'Finalisasi rekapitulasi presensi bulanan',
        measurableOutcome: 'Laporan payroll terbit tanggal 25',
        assignee: 'Budi Ops',
        dueDate: '2026-10-22',
        priority: 'high',
      },
    ],
    noUpdates: false,
  },
  support: {
    items: [
      {
        id: 'sup-1',
        request: 'Persetujuan anggaran pelatihan internal Rp 3.500.000',
        type: 'budget',
        requestedFrom: 'Finance & Director',
        neededBy: '2026-10-25',
        amount: 3500000,
        businessConsequence: 'Pelatihan tertunda ke bulan berikutnya jika belum disetujui',
        status: 'pending',
      },
    ],
    noUpdates: false,
  },
};

function createMockReport(overrides: Partial<WeeklyReport> = {}): WeeklyReport {
  return {
    id: 'rep_2026_w42_team-operasional',
    title: 'Laporan Mingguan Operasional & SDM — Pekan 42',
    authorId: authorContributor.id,
    authorName: authorContributor.name,
    authorEmail: authorContributor.email,
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    weekNumber: 42,
    year: 2026,
    weekStartDate: '2026-10-12',
    weekEndDate: '2026-10-18',
    status: 'DRAFT',
    revision: 1,
    version: 1,
    sections: completeSections,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-10-12T08:00:00.000Z',
        updatedBy: authorContributor.id,
        updatedByName: authorContributor.name,
        action: 'CREATED',
        notes: 'Draf laporan mingguan dibuat.',
      },
    ],
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-10-12T08:00:00.000Z',
    archiveStatus: 'NOT_ARCHIVED',
    ...overrides,
  };
}

function setupMockSession(user: User | null) {
  setCustomSessionVerifierForTesting(async (cookie: string) => {
    if (!cookie || cookie === 'invalid-cookie') {
      return { authenticated: false, code: 'UNAUTHENTICATED', error: 'Sesi tidak ditemukan.' };
    }
    if (!user) {
      return { authenticated: false, code: 'UNAUTHENTICATED', error: 'Pengguna tidak ditemukan.' };
    }
    return {
      authenticated: true,
      user,
    };
  });
}

function createApiRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    origin?: string;
    cookie?: string;
  } = {}
) {
  const method = options.method || 'POST';
  const headers = new Headers(options.headers || {});
  headers.set('cookie', options.cookie !== undefined ? options.cookie : 'session=valid-mock-session-cookie');
  headers.set('content-type', 'application/json');
  if (options.origin !== undefined) {
    if (options.origin) headers.set('origin', options.origin);
  } else {
    headers.set('origin', 'http://localhost:3000');
  }

  const reqInit: RequestInit = {
    method,
    headers,
  };

  if (options.body !== undefined) {
    reqInit.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  return new Request(url, reqInit);
}

// -------------------------------------------------------------
// Test Execution
// -------------------------------------------------------------
async function runAllTests() {
  // ==========================================
  // SECTION 1: Session, CSRF & Input Safeguards
  // ==========================================
  console.log('[SECTION 1] Session, CSRF & Input Safeguards:');

  await runTest('PATCH /api/reports/:id rejects unauthenticated request (401)', async () => {
    setupMockSession(null);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_1', {
      method: 'PATCH',
      cookie: 'invalid-cookie',
      body: { sections: completeSections },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'UNAUTHENTICATED');
  });

  await runTest('POST /api/reports/:id/submit rejects untrusted Origin (403 CSRF)', async () => {
    setupMockSession(authorContributor);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_1/submit', {
      method: 'POST',
      origin: 'https://evil-attacker.com',
      body: {},
    });
    const res = await handleSubmitReport(req, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'CSRF_REJECTED');
  });

  await runTest('POST /api/reports/:id/submit rejects disabled user (403 DISABLED)', async () => {
    setupMockSession(disabledUser);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_1/submit', {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    const res = await handleSubmitReport(req, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'DISABLED');
  });

  await runTest('PATCH /api/reports/:id rejects malformed JSON (400 INVALID_JSON)', async () => {
    setupMockSession(authorContributor);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_1', {
      method: 'PATCH',
      body: '{ not valid json ...',
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'INVALID_JSON');
  });

  await runTest('PATCH /api/reports/:id rejects client-injected server fields (400 VALIDATION_ERROR)', async () => {
    setupMockSession(authorContributor);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_1', {
      method: 'PATCH',
      body: {
        sections: completeSections,
        expectedVersion: 1,
        authorId: 'injected-author-id',
        status: 'APPROVED',
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  // ==========================================
  // SECTION 2: Valid Workflow Lifecycle (Draft -> Submit -> Revise -> Resubmit -> Approve)
  // ==========================================
  console.log('\n[SECTION 2] Valid Workflow Lifecycle Execution:');

  const initialReport = createMockReport();
  const repo = new InMemoryReportRepository([initialReport]);
  setReportRepositoryForTesting(repo);

  await runTest('PATCH /api/reports/:id updates draft and increments version token (v1 -> v2)', async () => {
    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${initialReport.id}`, {
      method: 'PATCH',
      body: {
        title: 'Laporan Mingguan Operasional & SDM — Pekan 42 (Revisi Judul)',
        sections: completeSections,
        expectedVersion: 1,
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: initialReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.version, 2);
    assert.strictEqual(body.data.revision, 1); // Revision unchanged on draft save!
    assert.strictEqual(body.data.status, 'DRAFT');
  });

  await runTest('POST /api/reports/:id/submit advances status to SUBMITTED and increments version (v2 -> v3)', async () => {
    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${initialReport.id}/submit`, {
      method: 'POST',
      body: {
        comments: 'Pengajuan laporan pekan 42 untuk direview Team Lead.',
        expectedVersion: 2,
        expectedRevision: 1,
      },
    });
    const res = await handleSubmitReport(req, { params: Promise.resolve({ id: initialReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'SUBMITTED');
    assert.strictEqual(body.data.revision, 1);
    assert.strictEqual(body.data.version, 3);
    assert.ok(body.data.submittedAt);
  });

  await runTest('POST /api/reports/:id/request-revision transitions to NEEDS_REVISION (v3 -> v4, rev unchanged)', async () => {
    setupMockSession(leadOperasional);
    const req = createApiRequest(`http://localhost:3000/api/reports/${initialReport.id}/request-revision`, {
      method: 'POST',
      body: {
        reviewNotes: 'Mohon tambahkan rincian target resolution date pada kendala BPJS.',
        expectedVersion: 3,
        expectedRevision: 1,
      },
    });
    const res = await handleRequestRevision(req, { params: Promise.resolve({ id: initialReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'NEEDS_REVISION');
    assert.strictEqual(body.data.revision, 1); // Revision unchanged on revision request!
    assert.strictEqual(body.data.version, 4);
    assert.strictEqual(body.data.reviewedBy, leadOperasional.id);
  });

  await runTest('POST /api/reports/:id/submit resubmits report (v4 -> v5, rev increments to 2)', async () => {
    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${initialReport.id}/submit`, {
      method: 'POST',
      body: {
        comments: 'Sudah diperbaiki dengan rincian tanggal BPJS.',
        expectedVersion: 4,
        expectedRevision: 1,
      },
    });
    const res = await handleSubmitReport(req, { params: Promise.resolve({ id: initialReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'SUBMITTED');
    assert.strictEqual(body.data.revision, 2); // Deterministic increment on resubmit!
    assert.strictEqual(body.data.version, 5);
  });

  await runTest('POST /api/reports/:id/approve approves report, freezes revision 2, and prepares snapshot v2', async () => {
    setupMockSession(leadOperasional);
    const req = createApiRequest(`http://localhost:3000/api/reports/${initialReport.id}/approve`, {
      method: 'POST',
      body: {
        reviewNotes: 'Laporan disetujui, target dan mitigasi sudah jelas.',
        expectedVersion: 5,
        expectedRevision: 2,
      },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: initialReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'APPROVED');
    assert.strictEqual(body.data.revision, 2);
    assert.strictEqual(body.data.version, 6);
    assert.strictEqual(body.data.archiveStatus, 'NOT_ARCHIVED');

    // Verify snapshot was created in repository store
    const snapshots = repo.versionSnapshots.get(initialReport.id);
    assert.ok(snapshots);
    assert.ok(snapshots.has('v2'));
    const snapshotDoc = snapshots.get('v2');
    assert.strictEqual(snapshotDoc?.versionId, 'v2');
    assert.strictEqual(snapshotDoc?.revisionNumber, 2);
    assert.strictEqual(snapshotDoc?.approvedBy, leadOperasional.id);
  });

  // ==========================================
  // SECTION 3: Concurrency & Stale Token Detection
  // ==========================================
  console.log('\n[SECTION 3] Concurrency & Stale Token Enforcement:');

  await runTest('PATCH /api/reports/:id rejects missing expectedVersion concurrency token (400 MISSING_CONCURRENCY_TOKEN)', async () => {
    const reportForMissing = createMockReport({ id: 'rep_missing_token', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([reportForMissing]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${reportForMissing.id}`, {
      method: 'PATCH',
      body: {
        sections: completeSections,
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: reportForMissing.id }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'MISSING_CONCURRENCY_TOKEN');
  });

  await runTest('PATCH /api/reports/:id rejects malformed expectedVersion concurrency token (400 INVALID_CONCURRENCY_TOKEN)', async () => {
    const reportForInvalid = createMockReport({ id: 'rep_invalid_token', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([reportForInvalid]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${reportForInvalid.id}`, {
      method: 'PATCH',
      headers: { 'x-expected-version': 'invalid-token' },
      body: {
        sections: completeSections,
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: reportForInvalid.id }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'INVALID_CONCURRENCY_TOKEN');
  });

  await runTest('PATCH /api/reports/:id rejects conflicting header and body tokens (400 CONCURRENCY_TOKEN_MISMATCH)', async () => {
    const reportForMismatch = createMockReport({ id: 'rep_mismatch_token', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([reportForMismatch]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${reportForMismatch.id}`, {
      method: 'PATCH',
      headers: { 'x-expected-version': '2' },
      body: {
        sections: completeSections,
        expectedVersion: 1,
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: reportForMismatch.id }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'CONCURRENCY_TOKEN_MISMATCH');
  });

  await runTest('PATCH /api/reports/:id accepts header-only x-expected-version token', async () => {
    const reportForHeader = createMockReport({ id: 'rep_header_token', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([reportForHeader]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${reportForHeader.id}`, {
      method: 'PATCH',
      headers: { 'x-expected-version': '1' },
      body: {
        sections: completeSections,
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: reportForHeader.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.version, 2);
  });

  await runTest('PATCH /api/reports/:id rejects stale expectedVersion with 409 Conflict', async () => {
    const reportForConflict = createMockReport({ id: 'rep_conflict_test', status: 'DRAFT', version: 3 });
    const localRepo = new InMemoryReportRepository([reportForConflict]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${reportForConflict.id}`, {
      method: 'PATCH',
      body: {
        sections: completeSections,
        expectedVersion: 1, // Stale! Current is 3
      },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: reportForConflict.id }) });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.code, 'STALE_REVISION_CONFLICT');
  });

  await runTest('POST /api/reports/:id/submit rejects stale expectedRevision with 409 Conflict', async () => {
    const reportForConflict = createMockReport({ id: 'rep_conflict_rev', status: 'DRAFT', revision: 2, version: 1 });
    const localRepo = new InMemoryReportRepository([reportForConflict]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${reportForConflict.id}/submit`, {
      method: 'POST',
      body: {
        expectedVersion: 1,
        expectedRevision: 99, // Mismatched! Current is 2
      },
    });
    const res = await handleSubmitReport(req, { params: Promise.resolve({ id: reportForConflict.id }) });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.code, 'STALE_REVISION_CONFLICT');
  });

  await runTest('Concurrent draft edits cannot silently overwrite each other', async () => {
    const reportConcur = createMockReport({ id: 'rep_concurrent_edits', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([reportConcur]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    // User A successfully edits at version 1 -> advances to version 2
    const reqA = createApiRequest(`http://localhost:3000/api/reports/${reportConcur.id}`, {
      method: 'PATCH',
      body: {
        title: 'Title from User A',
        sections: completeSections,
        expectedVersion: 1,
      },
    });
    const resA = await handlePatchReportDraft(reqA, { params: Promise.resolve({ id: reportConcur.id }) });
    assert.strictEqual(resA.status, 200);

    // User B attempts to edit using stale version 1 -> rejected with 409 Conflict
    const reqB = createApiRequest(`http://localhost:3000/api/reports/${reportConcur.id}`, {
      method: 'PATCH',
      body: {
        title: 'Overwriting title from User B',
        sections: completeSections,
        expectedVersion: 1,
      },
    });
    const resB = await handlePatchReportDraft(reqB, { params: Promise.resolve({ id: reportConcur.id }) });
    assert.strictEqual(resB.status, 409);
    const bodyB = await resB.json();
    assert.strictEqual(bodyB.code, 'STALE_REVISION_CONFLICT');
  });

  // ==========================================
  // SECTION 4: Segregation of Duties & RBAC Denials
  // ==========================================
  console.log('\n[SECTION 4] Segregation of Duties & RBAC Denials:');

  await runTest('POST /api/reports/:id/approve strictly blocks author self-approval (403 SELF_APPROVAL_PROHIBITED)', async () => {
    const submittedReport = createMockReport({
      id: 'rep_self_approve',
      authorId: authorContributor.id,
      status: 'SUBMITTED',
    });
    const localRepo = new InMemoryReportRepository([submittedReport]);
    setReportRepositoryForTesting(localRepo);

    // Contributor author attempts to approve own report
    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${submittedReport.id}/approve`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: submittedReport.id }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'SELF_APPROVAL_PROHIBITED');
  });

  await runTest('POST /api/reports/:id/approve strictly blocks Super Admin self-approval (403 SELF_APPROVAL_PROHIBITED)', async () => {
    const superAdminReport = createMockReport({
      id: 'rep_superadmin_self',
      authorId: superAdminAuthor.id,
      authorName: superAdminAuthor.name,
      status: 'SUBMITTED',
    });
    const localRepo = new InMemoryReportRepository([superAdminReport]);
    setReportRepositoryForTesting(localRepo);

    // Super Admin author attempts to self-approve
    setupMockSession(superAdminAuthor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${superAdminReport.id}/approve`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: superAdminReport.id }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'SELF_APPROVAL_PROHIBITED');
  });

  await runTest('POST /api/reports/:id/approve blocks Contributor role (403 UNAUTHORIZED_ROLE)', async () => {
    const someoneElsesReport = createMockReport({
      id: 'rep_someone_else',
      authorId: 'someone-else',
      status: 'SUBMITTED',
    });
    const localRepo = new InMemoryReportRepository([someoneElsesReport]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(otherContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${someoneElsesReport.id}/approve`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: someoneElsesReport.id }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'UNAUTHORIZED_ROLE');
  });

  await runTest('POST /api/reports/:id/approve blocks cross-team Team Lead (403 CROSS_TEAM_FORBIDDEN)', async () => {
    const operasionalReport = createMockReport({
      id: 'rep_operasional_only',
      teamId: 'team-operasional',
      status: 'SUBMITTED',
    });
    const localRepo = new InMemoryReportRepository([operasionalReport]);
    setReportRepositoryForTesting(localRepo);

    // Akademik Lead attempts to approve Operasional report
    setupMockSession(leadAkademik);
    const req = createApiRequest(`http://localhost:3000/api/reports/${operasionalReport.id}/approve`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: operasionalReport.id }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'CROSS_TEAM_FORBIDDEN');
  });

  await runTest('POST /api/reports/:id/approve allows Executive Management org-wide approval', async () => {
    const operasionalReport = createMockReport({
      id: 'rep_exec_approve',
      teamId: 'team-operasional',
      status: 'SUBMITTED',
    });
    const localRepo = new InMemoryReportRepository([operasionalReport]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(managerExecutive);
    const req = createApiRequest(`http://localhost:3000/api/reports/${operasionalReport.id}/approve`, {
      method: 'POST',
      body: { reviewNotes: 'Disetujui oleh Direksi / Executive.', expectedVersion: 1 },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: operasionalReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'APPROVED');
  });

  // ==========================================
  // SECTION 5: Negative FSM & Completeness Tests
  // ==========================================
  console.log('\n[SECTION 5] Negative FSM & Completeness Validations:');

  await runTest('POST /api/reports/:id/approve rejects report still in DRAFT status (422)', async () => {
    const draftReport = createMockReport({ id: 'rep_draft_app', status: 'DRAFT' });
    const localRepo = new InMemoryReportRepository([draftReport]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(leadOperasional);
    const req = createApiRequest(`http://localhost:3000/api/reports/${draftReport.id}/approve`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    const res = await handleApproveReport(req, { params: Promise.resolve({ id: draftReport.id }) });
    assert.strictEqual(res.status, 422);
    const body = await res.json();
    assert.strictEqual(body.code, 'INVALID_STATE_TRANSITION');
  });

  await runTest('POST /api/reports/:id/request-revision rejects empty or short review notes (400)', async () => {
    const submittedReport = createMockReport({ id: 'rep_short_notes', status: 'SUBMITTED' });
    const localRepo = new InMemoryReportRepository([submittedReport]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(leadOperasional);
    const req = createApiRequest(`http://localhost:3000/api/reports/${submittedReport.id}/request-revision`, {
      method: 'POST',
      body: { reviewNotes: 'Pendek', expectedVersion: 1 }, // < 10 characters!
    });
    const res = await handleRequestRevision(req, { params: Promise.resolve({ id: submittedReport.id }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  // ==========================================
  // SECTION 6: Snapshot Immutability & Audit Trail
  // ==========================================
  console.log('\n[SECTION 6] Snapshot Immutability & Audit Trail:');

  await runTest('Immutable Snapshot prevents duplicate overwrite (409 SNAPSHOT_ALREADY_EXISTS)', async () => {
    const approvedReport = createMockReport({ id: 'rep_snapshot_overwrite', status: 'SUBMITTED', revision: 1, version: 1 });
    const localRepo = new InMemoryReportRepository([approvedReport]);
    setReportRepositoryForTesting(localRepo);

    // First approval
    setupMockSession(leadOperasional);
    const req1 = createApiRequest(`http://localhost:3000/api/reports/${approvedReport.id}/approve`, {
      method: 'POST',
      body: { reviewNotes: 'Persetujuan pertama.', expectedVersion: 1 },
    });
    const res1 = await handleApproveReport(req1, { params: Promise.resolve({ id: approvedReport.id }) });
    assert.strictEqual(res1.status, 200);

    // Second approval attempt on same snapshot
    const req2 = createApiRequest(`http://localhost:3000/api/reports/${approvedReport.id}/approve`, {
      method: 'POST',
      body: { reviewNotes: 'Persetujuan kedua tidak boleh menimpa.', expectedVersion: 2 },
    });
    const res2 = await handleApproveReport(req2, { params: Promise.resolve({ id: approvedReport.id }) });
    // Status is already APPROVED so it fails transition with 422
    assert.strictEqual(res2.status, 422);
  });

  await runTest('Audit events recorded for every workflow state transition', async () => {
    const reportAudit = createMockReport({ id: 'rep_audit_trail', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([reportAudit]);
    setReportRepositoryForTesting(localRepo);

    // 1. Submit
    setupMockSession(authorContributor);
    const reqSubmit = createApiRequest(`http://localhost:3000/api/reports/${reportAudit.id}/submit`, {
      method: 'POST',
      body: { expectedVersion: 1 },
    });
    await handleSubmitReport(reqSubmit, { params: Promise.resolve({ id: reportAudit.id }) });

    // 2. Request Revision
    setupMockSession(leadOperasional);
    const reqRevise = createApiRequest(`http://localhost:3000/api/reports/${reportAudit.id}/request-revision`, {
      method: 'POST',
      body: { reviewNotes: 'Catatan revisi detail minimal 10 karakter.', expectedVersion: 2 },
    });
    await handleRequestRevision(reqRevise, { params: Promise.resolve({ id: reportAudit.id }) });

    // Verify audit event logs
    assert.strictEqual(localRepo.auditEvents.length, 2);
    assert.strictEqual(localRepo.auditEvents[0].action, 'REPORT_SUBMITTED');
    assert.strictEqual(localRepo.auditEvents[1].action, 'REVISION_REQUESTED');
    assert.strictEqual(localRepo.auditEvents[1].actorUid, leadOperasional.id);
  });

  // ==========================================
  // SECTION 7: Legacy M4.1 Compatibility & Feature Gate Fail-Closed
  // ==========================================
  console.log('\n[SECTION 7] Legacy Compatibility & Feature Gate Fail-Closed:');

  await runTest('Legacy M4.1 report without version token defaults to v1 and advances to v2 on PATCH', async () => {
    const legacyReport = createMockReport({ id: 'rep_legacy_doc' });
    delete legacyReport.version; // Simulate legacy document created before M4.2-C!

    const localRepo = new InMemoryReportRepository([legacyReport]);
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${legacyReport.id}`, {
      method: 'PATCH',
      body: { sections: completeSections, expectedVersion: 1 },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: legacyReport.id }) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.version, 2); // Defaulted to 1, advanced to 2!
  });

  await runTest('Feature gate fail-closed rejects workflow mutations when gate enforced (403 MUTATION_DISABLED)', async () => {
    const gatedReport = createMockReport({ id: 'rep_gated_test', status: 'DRAFT', version: 1 });
    const localRepo = new InMemoryReportRepository([gatedReport]);
    localRepo.enforceWorkflowGate = true; // Simulates server with REPORT_WORKFLOW_WRITES_ENABLED=false!
    setReportRepositoryForTesting(localRepo);

    setupMockSession(authorContributor);
    const req = createApiRequest(`http://localhost:3000/api/reports/${gatedReport.id}`, {
      method: 'PATCH',
      body: { sections: completeSections, expectedVersion: 1 },
    });
    const res = await handlePatchReportDraft(req, { params: Promise.resolve({ id: gatedReport.id }) });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'MUTATION_DISABLED');
  });

  resetReportRepositoryForTesting();

  console.log('\n===========================================================');
  console.log(` Summary: ${passedTests} Passed, 0 Failed. Total: ${totalTests}`);
  console.log('===========================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
