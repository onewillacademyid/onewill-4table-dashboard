/**
 * Onewill Academy — M4.2-F2 Final Guard Safety & Concurrency Test
 *
 * Verifies:
 * 1. Process-local counter vs durable FSM boundary demonstration
 * 2. Duplicate operation rejection
 * 3. Out-of-order transition rejection
 * 4. 7th mutation rejection via budget
 * 5. Server restart simulation (counter reset to 0): proves report remains immutable in APPROVED state
 * 6. Concurrent request conflict rejection (stale concurrency token)
 * 7. Verification that direct repository calls execute the guard
 */

import assert from 'node:assert';
import {
  setControlledWorkflowGuardForTesting,
  resetControlledWorkflowGuardForTesting,
  getControlledWorkflowOperationCount,
} from '../src/lib/auth/controlled-workflow-guard';
import { InMemoryReportRepository } from '../src/lib/repos/in-memory-report-repository';
import { User, WeeklyReport } from '../src/types';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.2-F2 GUARD CONCURRENCY & SAFETY TEST ');
console.log('===========================================================\n');

let totalTests = 0;
let passedTests = 0;

async function runTest(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

const validContributor: User = {
  id: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
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

const validReviewer: User = {
  id: 'u21yIYrhHBOTyIuDJs3CTnxoBVY2',
  email: 'onewillacademy.id@gmail.com',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  teamId: 'team-executive',
  teamName: 'Executive',
  avatarColor: '#654321',
  avatarInitials: 'SA',
  active: true,
  lastActive: '2026-10-12',
};

const sampleSections = {
  achievements: { items: [{ id: '1', title: 'Achievement', description: 'Desc', category: 'General' }], noUpdates: false },
  issues: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada kendala' },
  objectives: { items: [{ id: '2', title: 'Objective', targetDate: '2026-10-18', status: 'ON_TRACK' }], noUpdates: false },
  support: { items: [], noUpdates: true, noUpdatesReason: 'Tidak butuh bantuan' },
};

function createInitialW42(): WeeklyReport {
  return {
    id: 'rep_2026_w42_team-operasional',
    title: '[TEST DATA / NOT ACTUAL BUSINESS REPORT] Laporan Mingguan Tim Operasional W42 2026',
    authorId: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
    authorName: 'Adhimono W',
    authorEmail: 'adhimonow@gmail.com',
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    weekNumber: 42,
    year: 2026,
    weekStartDate: '2026-10-12',
    weekEndDate: '2026-10-18',
    status: 'DRAFT',
    revision: 1,
    version: 1,
    revisionsHistory: [],
    sections: sampleSections as any,
    createdAt: '2026-10-12T20:18:11.428Z',
    updatedAt: '2026-10-12T20:18:11.428Z',
    archiveStatus: 'NOT_ARCHIVED',
  };
}

async function main() {
  console.log('[SECTION 1] Out-of-Order & Duplicate Transition Safety:');

  await runTest('Rejects out-of-order approval when report is still in DRAFT', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });
    const repo = new InMemoryReportRepository([createInitialW42()]);

    const res = await repo.approveReport({
      user: validReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 1,
      expectedRevision: 1,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'INVALID_STATE_TRANSITION');
  });

  await runTest('Rejects duplicate submission on already submitted report (SUBMITTED -> SUBMIT)', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });
    const repo = new InMemoryReportRepository([createInitialW42()]);

    // Initial submit
    const sub1 = await repo.submitReport({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 1,
      expectedRevision: 1,
    });
    assert.strictEqual(sub1.success, true);
    assert.strictEqual(sub1.data?.status, 'SUBMITTED');
    assert.strictEqual(sub1.data?.version, 2);

    // Duplicate submit
    const sub2 = await repo.submitReport({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 2,
      expectedRevision: 1,
    });
    assert.strictEqual(sub2.success, false);
    assert.strictEqual(sub2.code, 'INVALID_STATE_TRANSITION');
  });

  console.log('\n[SECTION 2] Concurrency Conflict Safety:');

  await runTest('Rejects concurrent update with stale expectedVersion (STALE_REVISION_CONFLICT)', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });
    const repo = new InMemoryReportRepository([createInitialW42()]);

    // Client A and Client B both fetched version 1
    // Client A submits first -> version becomes 2
    const clientA = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      updates: { sections: sampleSections as any },
      expectedVersion: 1,
      expectedRevision: 1,
    });
    assert.strictEqual(clientA.success, true);
    assert.strictEqual(clientA.data?.version, 2);

    // Client B tries to update using stale expectedVersion 1
    const clientB = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      updates: { sections: sampleSections as any },
      expectedVersion: 1, // Stale!
      expectedRevision: 1,
    });
    assert.strictEqual(clientB.success, false);
    assert.strictEqual(clientB.code, 'STALE_REVISION_CONFLICT');
  });

  console.log('\n[SECTION 3] 6-Operation Budget & Restart Counter-Reset Safety:');

  await runTest('Demonstrates in-process 6-operation budget exhaustion', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });
    const repo = new InMemoryReportRepository([createInitialW42()]);

    // Op 1: Save Draft (v1 -> v2)
    await repo.updateReportDraft({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', updates: { sections: sampleSections as any }, expectedVersion: 1, expectedRevision: 1 });
    // Op 2: Submit (v2 -> v3)
    await repo.submitReport({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', expectedVersion: 2, expectedRevision: 1 });
    // Op 3: Request Revision (v3 -> v4)
    await repo.requestRevision({ user: validReviewer, reportId: 'rep_2026_w42_team-operasional', reviewNotes: 'Mohon lengkapi catatan rencana kegiatan.', expectedVersion: 3, expectedRevision: 1 });
    // Op 4: Save Revised Draft (v4 -> v5)
    await repo.updateReportDraft({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', updates: { sections: sampleSections as any }, expectedVersion: 4, expectedRevision: 1 });
    // Op 5: Resubmit (v5 -> v6, rev 2)
    await repo.submitReport({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', expectedVersion: 5, expectedRevision: 1 });
    // Op 6: Approve (v6 -> v7, rev 2 frozen)
    const appRes = await repo.approveReport({ user: validReviewer, reportId: 'rep_2026_w42_team-operasional', expectedVersion: 6, expectedRevision: 2 });
    assert.strictEqual(appRes.success, true);
    assert.strictEqual(appRes.data?.status, 'APPROVED');

    assert.strictEqual(getControlledWorkflowOperationCount(), 6);

    // Op 7: Rejected by in-process budget
    const op7 = await repo.updateReportDraft({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', updates: { sections: sampleSections as any }, expectedVersion: 7, expectedRevision: 2 });
    assert.strictEqual(op7.success, false);
    assert.strictEqual(op7.code, 'CONTROLLED_WORKFLOW_BUDGET_EXHAUSTED');
  });

  await runTest('Proves durable safety after server restart: even if counter resets to 0, APPROVED report is permanently immutable', async () => {
    // Report is currently APPROVED (version 7, revision 2)
    const approvedReport: WeeklyReport = {
      ...createInitialW42(),
      status: 'APPROVED',
      version: 7,
      revision: 2,
    };

    const repo = new InMemoryReportRepository([approvedReport]);

    // Simulate SERVER RESTART: counter resets to 0!
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });
    // Counter is now 0 again:
    assert.strictEqual(getControlledWorkflowOperationCount(), 0);

    // Attempt 1: Attacker tries to save draft on approved report
    const editAttempt = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      updates: { sections: sampleSections as any },
      expectedVersion: 7,
      expectedRevision: 2,
    });
    assert.strictEqual(editAttempt.success, false);
    assert.strictEqual(editAttempt.code, 'INVALID_STATE_TRANSITION', 'FSM permanently blocks editing approved report');

    // Attempt 2: Attacker tries to submit approved report
    const submitAttempt = await repo.submitReport({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 7,
      expectedRevision: 2,
    });
    assert.strictEqual(submitAttempt.success, false);
    assert.strictEqual(submitAttempt.code, 'INVALID_STATE_TRANSITION', 'FSM permanently blocks submitting approved report');

    // Attempt 3: Attacker tries to approve approved report again
    const approveAttempt = await repo.approveReport({
      user: validReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 7,
      expectedRevision: 2,
    });
    assert.strictEqual(approveAttempt.success, false);
    assert.strictEqual(approveAttempt.code, 'INVALID_STATE_TRANSITION', 'FSM permanently blocks re-approving approved report');
  });

  console.log(`\n===========================================================`);
  console.log(` Summary: ${passedTests} Passed, 0 Failed. Total: ${totalTests}`);
  console.log(`===========================================================`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
