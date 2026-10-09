/**
 * Onewill Academy — M4.1 Phase C1 Reports API HTTP Security Suite
 * Validates POST /api/reports, GET /api/reports, and GET /api/reports/[id] endpoints.
 * Operates strictly with mock session authentication and InMemoryReportRepository.
 * Guaranteed ZERO real Firestore operations executed.
 * Run with: npx tsx scripts/test-reports-api-http.ts
 */

import assert from 'node:assert';
import { POST as handlePostReports, GET as handleGetReports } from '../src/app/api/reports/route';
import { GET as handleGetReportById } from '../src/app/api/reports/[id]/route';
import {
  setReportRepositoryForTesting,
  resetReportRepositoryForTesting,
  getReportRepository,
} from '../src/lib/repos/report-repository-factory';
import { InMemoryReportRepository } from '../src/lib/repos/in-memory-report-repository';
import { FirestoreReportRepository } from '../src/lib/repos/firestore-report-repository';
import { setCustomSessionVerifierForTesting } from '../src/lib/auth/server-auth';
import { User, WeeklyReport } from '../src/types';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.1 PHASE C1 REPORTS API SECURITY TEST ');
console.log('===========================================================\n');

let passedTests = 0;
let totalTests = 0;

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

// Test User Profiles
const contributorUser: User = {
  id: 'uid-contributor-adhi',
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

const adminUser: User = {
  id: 'uid-admin-willy',
  name: 'Willy Premadi',
  email: 'willy.premadi@onewillsolusi.com',
  role: 'ADMIN',
  teamId: 'team-executive',
  teamName: 'Manajemen / Executive',
  avatarColor: '#654321',
  avatarInitials: 'WP',
  active: true,
  lastActive: '2026-10-10',
};

const disabledUser: User = {
  id: 'uid-disabled-user',
  name: 'Disabled User',
  email: 'disabled@onewill-demo.id',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#000000',
  avatarInitials: 'DU',
  active: false,
  lastActive: '2026-10-08',
};

function setupMockSession(user: User | null) {
  setCustomSessionVerifierForTesting(async (cookie: string) => {
    if (!cookie || cookie === 'invalid-cookie') {
      return { authenticated: false, code: 'UNAUTHENTICATED', error: 'Sesi tidak ditemukan.' };
    }
    if (!user) {
      return { authenticated: false, code: 'UNAUTHENTICATED', error: 'User tidak ditemukan.' };
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
  const method = options.method || 'GET';
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

const sampleValidReportInput = {
  weekNumber: 41,
  year: 2026,
  weekStartDate: '2026-10-05',
  weekEndDate: '2026-10-11',
  title: 'Laporan Pekan 41 Operasional',
  sections: {
    achievements: {
      items: [
        {
          id: 'ach-1',
          description: 'Audit fasilitas kampus selesai',
          project: 'Fasilitas Kampus',
          result: 'Selesai 100%',
        },
      ],
      noUpdates: false,
    },
    issues: {
      items: [],
      noUpdates: true,
      noUpdatesReason: 'Seluruh operasional berjalan normal.',
    },
    objectives: {
      items: [
        {
          id: 'obj-1',
          objective: 'Pembaruan kontrak kerjasama',
          measurableOutcome: 'Kontrak diteken',
          assignee: 'Budi Santoso',
          dueDate: '2026-10-15',
          priority: 'medium' as const,
        },
      ],
      noUpdates: false,
    },
    support: {
      items: [],
      noUpdates: true,
      noUpdatesReason: 'Tidak ada dukungan tambahan.',
    },
  },
};

async function main() {
  const mockRepo = new InMemoryReportRepository();
  setReportRepositoryForTesting(mockRepo);

  // ==========================================
  // [SECTION 1] AUTHENTICATION, EXPIRED & INACTIVE SESSIONS
  // ==========================================
  console.log('[SECTION 1] Authentication & Session Isolation:');

  await runTest('Unauthenticated POST /api/reports returns HTTP 401 UNAUTHENTICATED', async () => {
    setupMockSession(null);
    const req = new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify(sampleValidReportInput),
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'UNAUTHENTICATED');
    assert.strictEqual(data.data, undefined); // No data leakage
  });

  await runTest('Unauthenticated GET /api/reports returns HTTP 401 UNAUTHENTICATED', async () => {
    setupMockSession(null);
    const req = new Request('http://localhost:3000/api/reports', { method: 'GET' });
    const res = await handleGetReports(req);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.data, undefined);
  });

  await runTest('Unauthenticated GET /api/reports/[id] returns HTTP 401 UNAUTHENTICATED', async () => {
    setupMockSession(null);
    const req = new Request('http://localhost:3000/api/reports/rep_1', { method: 'GET' });
    const res = await handleGetReportById(req, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.data, undefined);
  });

  await runTest('Disabled account on all endpoints returns HTTP 403 DISABLED', async () => {
    setupMockSession(disabledUser);
    const postReq = createApiRequest('http://localhost:3000/api/reports', { method: 'POST', body: sampleValidReportInput });
    const postRes = await handlePostReports(postReq);
    assert.strictEqual(postRes.status, 403);

    const getReq = createApiRequest('http://localhost:3000/api/reports');
    const getRes = await handleGetReports(getReq);
    assert.strictEqual(getRes.status, 403);

    const getIdReq = createApiRequest('http://localhost:3000/api/reports/rep_1');
    const getIdRes = await handleGetReportById(getIdReq, { params: Promise.resolve({ id: 'rep_1' }) });
    assert.strictEqual(getIdRes.status, 403);
  });

  await runTest('Untrusted Origin on POST /api/reports returns HTTP 403 CSRF_REJECTED', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: sampleValidReportInput,
      origin: 'http://attacker-evil-domain.com',
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'CSRF_REJECTED');
  });

  console.log('');

  // ==========================================
  // [SECTION 2] POST /api/reports & STRICT ZOD VALIDATION
  // ==========================================
  console.log('[SECTION 2] POST /api/reports & Strict Validation:');

  await runTest('Authorized Contributor creates report draft (HTTP 201 Created)', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: sampleValidReportInput,
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, 'rep_2026_w41_team-operasional');
    assert.strictEqual(json.data.authorId, contributorUser.id);
    assert.strictEqual(json.data.teamId, contributorUser.teamId);
    assert.strictEqual(json.data.status, 'DRAFT');
    assert.strictEqual(json.data.revision, 1);
  });

  await runTest('Rejects malformed JSON body with HTTP 400 INVALID_JSON', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: 'INVALID_JSON_RAW_STRING{{{',
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'INVALID_JSON');
  });

  await runTest('Strict Zod Schema rejects client-injected server fields (authorId, status) with HTTP 400 VALIDATION_ERROR', async () => {
    setupMockSession(contributorUser);
    const spoofedInput = {
      ...sampleValidReportInput,
      weekNumber: 42,
      authorId: 'user-spoofed-superadmin',
      teamId: 'team-akademik',
      status: 'APPROVED',
      revision: 99,
    };
    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: spoofedInput,
    });
    const res = await handlePostReports(req);
    // Strict parsing now rejects unrecognized client properties with HTTP 400
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
  });

  await runTest('Rejects invalid week dates (non-Monday start date) with HTTP 400 VALIDATION_ERROR', async () => {
    setupMockSession(contributorUser);
    const invalidWeekInput = {
      ...sampleValidReportInput,
      weekNumber: 43,
      weekStartDate: '2026-10-07', // Wednesday!
      weekEndDate: '2026-10-13',
    };
    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: invalidWeekInput,
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
  });

  await runTest('Rejects duplicate report creation for same team/week with HTTP 409 REPORT_ALREADY_EXISTS', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: sampleValidReportInput,
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 409);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'REPORT_ALREADY_EXISTS');
  });

  await runTest('Feature Gate test: Real Firestore repo returns HTTP 403 MUTATIONS_DISABLED when write flag is false', async () => {
    setupMockSession(contributorUser);
    setReportRepositoryForTesting(new FirestoreReportRepository());

    const req = createApiRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: {
        ...sampleValidReportInput,
        weekNumber: 44,
        weekStartDate: '2026-10-26',
        weekEndDate: '2026-11-01',
      },
    });
    const res = await handlePostReports(req);
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'MUTATIONS_DISABLED');

    setReportRepositoryForTesting(mockRepo);
  });

  console.log('');

  // ==========================================
  // [SECTION 3] GET /api/reports LIST REPORTS
  // ==========================================
  console.log('[SECTION 3] GET /api/reports List Reports:');

  await runTest('Contributor listing is strictly scoped to assigned team (team-operasional)', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports?teamId=team-akademik');
    const res = await handleGetReports(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.reports));
    for (const r of json.data.reports) {
      assert.strictEqual(r.teamId, 'team-operasional');
    }
  });

  await runTest('Admin listing can query any team scope (team-operasional)', async () => {
    setupMockSession(adminUser);
    const req = createApiRequest('http://localhost:3000/api/reports?teamId=team-operasional');
    const res = await handleGetReports(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.reports.length >= 1);
  });

  await runTest('Rejects invalid limit parameter with HTTP 400 VALIDATION_ERROR', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports?limit=999');
    const res = await handleGetReports(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
  });

  console.log('');

  // ==========================================
  // [SECTION 4] GET /api/reports/[id] READ DETAIL & PARAMETER SECURITY
  // ==========================================
  console.log('[SECTION 4] GET /api/reports/[id] Read Detail:');

  await runTest('Authorized Contributor reads own team report (HTTP 200 OK)', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_2026_w41_team-operasional');
    const res = await handleGetReportById(req, { params: Promise.resolve({ id: 'rep_2026_w41_team-operasional' }) });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, 'rep_2026_w41_team-operasional');
  });

  await runTest('Rejects invalid/empty report ID with HTTP 400 VALIDATION_ERROR', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports/%20');
    const res = await handleGetReportById(req, { params: Promise.resolve({ id: '   ' }) });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'VALIDATION_ERROR');
  });

  await runTest('Returns HTTP 404 REPORT_NOT_FOUND for non-existent report ID', async () => {
    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_2026_w99_nonexistent');
    const res = await handleGetReportById(req, { params: Promise.resolve({ id: 'rep_2026_w99_nonexistent' }) });
    assert.strictEqual(res.status, 404);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'REPORT_NOT_FOUND');
    assert.strictEqual(json.data, undefined);
  });

  await runTest('Cross-team read attempt by Contributor returns HTTP 403 CROSS_TEAM_FORBIDDEN with NO report payload', async () => {
    const akademikReport: WeeklyReport = {
      id: 'rep_2026_w41_team-akademik',
      title: 'Laporan Akademik Pekan 41',
      authorId: 'user-siti-lead',
      authorName: 'Siti Nurhaliza',
      authorEmail: 'siti@onewill-demo.id',
      teamId: 'team-akademik',
      teamName: 'Akademik & Kurikulum',
      weekNumber: 41,
      year: 2026,
      weekStartDate: '2026-10-05',
      weekEndDate: '2026-10-11',
      status: 'SUBMITTED',
      revision: 1,
      revisionsHistory: [],
      sections: sampleValidReportInput.sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archiveStatus: 'NOT_ARCHIVED',
    };
    (mockRepo as any).reports.set(akademikReport.id, akademikReport);

    setupMockSession(contributorUser);
    const req = createApiRequest('http://localhost:3000/api/reports/rep_2026_w41_team-akademik');
    const res = await handleGetReportById(req, { params: Promise.resolve({ id: 'rep_2026_w41_team-akademik' }) });
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'CROSS_TEAM_FORBIDDEN');
    assert.strictEqual(json.data, undefined);
  });

  console.log('');

  // ==========================================
  // [SECTION 5] AUDIT LOGGING ATOMICITY & PRODUCTION ISOLATION
  // ==========================================
  console.log('[SECTION 5] Audit Logging Atomicity & Production Isolation:');

  await runTest('Creating a report records an audit event atomically in mock audit log', async () => {
    const auditLogs = mockRepo.auditEvents;
    assert.ok(auditLogs.length >= 1);
    const lastEvent = auditLogs[auditLogs.length - 1];
    assert.strictEqual(lastEvent.action, 'REPORT_CREATED');
    assert.strictEqual(lastEvent.actorUid, contributorUser.id);
    assert.strictEqual(lastEvent.targetType, 'report');
    assert.strictEqual(lastEvent.targetId, 'rep_2026_w41_team-operasional');
  });

  await runTest('Production isolation safeguard: setCustomSessionVerifierForTesting throws Error in NODE_ENV=production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      assert.throws(
        () => {
          setCustomSessionVerifierForTesting(() => Promise.resolve({ authenticated: false }));
        },
        /CRITICAL SECURITY ERROR/
      );
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  await runTest('Production isolation safeguard: setReportRepositoryForTesting throws Error in NODE_ENV=production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      assert.throws(
        () => {
          setReportRepositoryForTesting(mockRepo);
        },
        /CRITICAL SECURITY ERROR/
      );
      // In production getReportRepository always returns FirestoreReportRepository
      const prodRepo = getReportRepository();
      assert.ok(prodRepo instanceof FirestoreReportRepository);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  // Cleanup testing DI & verifier
  resetReportRepositoryForTesting();
  setCustomSessionVerifierForTesting(null);

  console.log('');
  console.log('===========================================================');
  console.log(` Reports API HTTP Security Test Summary: ${passedTests} Passed, ${totalTests - passedTests} Failed.`);
  console.log('===========================================================');
}

main().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
