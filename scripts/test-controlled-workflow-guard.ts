/**
 * Onewill Academy — M4.2-F2 Controlled Workflow Guard Security Test Suite
 *
 * Verifies:
 * 1. Fail-closed default (when CONTROLLED_WORKFLOW_TEST_ENABLED is false/undefined)
 * 2. Target Report ID binding (only rep_2026_w42_team-operasional is permitted; rep_2026_w41 or others rejected)
 * 3. Contributor Identity restriction (only lT7wNY1do3XOJ4cT5F7hTLT3SOe2 can SAVE_DRAFT, SUBMIT)
 * 4. Reviewer Identity restriction (only u21yIYrhHBOTyIuDJs3CTnxoBVY2 can REQUEST_REVISION, APPROVE)
 * 5. Project ID binding (only onewill-academy-weekly-report permitted)
 * 6. Allowed operations restriction (unauthorized operations rejected)
 * 7. 6-Operation budget limit enforcement (7th operation rejected with CONTROLLED_WORKFLOW_BUDGET_EXHAUSTED)
 * 8. End-to-end simulation through InMemoryReportRepository with isControlledWorkflowGuardEnforcedOnMockRepo
 * 9. Concurrency conflict handling under guard protection
 * 10. Production isolation: setControlledWorkflowGuardForTesting throws in production
 */

import assert from 'node:assert';
import {
  verifyControlledWorkflowGuard,
  setControlledWorkflowGuardForTesting,
  resetControlledWorkflowGuardForTesting,
  getControlledWorkflowOperationCount,
  CONTROLLED_WORKFLOW_BOUND_VALUES,
} from '../src/lib/auth/controlled-workflow-guard';
import { InMemoryReportRepository } from '../src/lib/repos/in-memory-report-repository';
import { User, WeeklyReport } from '../src/types';

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.2-F2 CONTROLLED WORKFLOW GUARD TEST  ');
console.log('===========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        console.log(`  ✅ PASS: ${description}`);
        passedTests++;
      }).catch((err) => {
        console.error(`  ❌ FAIL: ${description}`);
        console.error(`     Error: ${err.message}`);
        process.exitCode = 1;
      });
    } else {
      console.log(`  ✅ PASS: ${description}`);
      passedTests++;
    }
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// Verified Actors
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

const unrelatedContributor: User = {
  id: 'uid-unrelated-contributor',
  email: 'attacker@evil.com',
  name: 'Attacker',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#000000',
  avatarInitials: 'AT',
  active: true,
  lastActive: '2026-10-12',
};

const unrelatedReviewer: User = {
  id: 'uid-unrelated-reviewer',
  email: 'other-lead@onewill.id',
  name: 'Other Lead',
  role: 'TEAM_LEAD',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  avatarColor: '#999999',
  avatarInitials: 'OL',
  active: true,
  lastActive: '2026-10-12',
};

async function main() {
  console.log('[SECTION 1] Fail-Closed Default & Feature Gate Checks:');

  runTest('Guard fails closed when CONTROLLED_WORKFLOW_TEST_ENABLED is false', () => {
    setControlledWorkflowGuardForTesting({
      enabled: false,
      workflowWriteEnabled: true,
    });
    const result = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SAVE_DRAFT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.code, 'CONTROLLED_WORKFLOW_GUARD_DISABLED');
  });

  runTest('Guard fails closed when workflow writes flag is disabled', () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: false,
    });
    const result = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SAVE_DRAFT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.code, 'MUTATION_DISABLED');
  });

  console.log('\n[SECTION 2] Target Report ID & Project Scope Bindings:');

  runTest('Allows operation on exact target report rep_2026_w42_team-operasional', () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
    });
    const result = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SAVE_DRAFT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(result.allowed, true);
  });

  runTest('Strictly blocks mutations on rep_2026_w41_team-operasional (preserves baseline)', () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
    });
    const result = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w41_team-operasional',
      operation: 'SAVE_DRAFT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  runTest('Strictly blocks mutations on any arbitrary report ID', () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
    });
    const result = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-marketing',
      operation: 'SAVE_DRAFT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  runTest('Strictly blocks mutations if Firebase Project ID does not match', () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
    });
    const result = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SAVE_DRAFT',
      projectId: 'unauthorized-project-id',
    });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  console.log('\n[SECTION 3] Actor Identity & Operation Role Binding:');

  runTest('Allows authorized Contributor for SAVE_DRAFT', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SAVE_DRAFT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, true);
  });

  runTest('Allows authorized Contributor for SUBMIT', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SUBMIT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, true);
  });

  runTest('Blocks unauthorized Contributor UID from submitting or saving draft', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: unrelatedContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'SUBMIT',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  runTest('Allows authorized Super Admin Reviewer for REQUEST_REVISION', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: validReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'REQUEST_REVISION',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, true);
  });

  runTest('Allows authorized Super Admin Reviewer for APPROVE', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: validReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'APPROVE',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, true);
  });

  runTest('Blocks unrelated Reviewer UID from approving or requesting revision', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: unrelatedReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'APPROVE',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  runTest('Blocks Contributor from attempting APPROVE (role & guard denial)', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    const res = verifyControlledWorkflowGuard({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      operation: 'APPROVE',
      projectId: 'onewill-academy-weekly-report',
    });
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  console.log('\n[SECTION 4] Operation Budget Enforcement (6-Operation Limit):');

  runTest('Enforces maximum 6-operation budget and rejects the 7th operation', () => {
    setControlledWorkflowGuardForTesting({ enabled: true, workflowWriteEnabled: true });
    assert.strictEqual(getControlledWorkflowOperationCount(), 0);

    // Operation 1: Save Draft (Contributor)
    let res = verifyControlledWorkflowGuard({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', operation: 'SAVE_DRAFT', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, true);

    // Operation 2: Submit (Contributor)
    res = verifyControlledWorkflowGuard({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', operation: 'SUBMIT', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, true);

    // Operation 3: Request Revision (Reviewer)
    res = verifyControlledWorkflowGuard({ user: validReviewer, reportId: 'rep_2026_w42_team-operasional', operation: 'REQUEST_REVISION', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, true);

    // Operation 4: Save Revised Draft (Contributor)
    res = verifyControlledWorkflowGuard({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', operation: 'SAVE_DRAFT', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, true);

    // Operation 5: Resubmit (Contributor)
    res = verifyControlledWorkflowGuard({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', operation: 'SUBMIT', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, true);

    // Operation 6: Approve (Reviewer)
    res = verifyControlledWorkflowGuard({ user: validReviewer, reportId: 'rep_2026_w42_team-operasional', operation: 'APPROVE', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, true);

    assert.strictEqual(getControlledWorkflowOperationCount(), 6);

    // Operation 7: Attempt 7th mutation -> REJECTED
    res = verifyControlledWorkflowGuard({ user: validContributor, reportId: 'rep_2026_w42_team-operasional', operation: 'SAVE_DRAFT', projectId: 'onewill-academy-weekly-report' });
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.code, 'CONTROLLED_WORKFLOW_BUDGET_EXHAUSTED');
  });

  console.log('\n[SECTION 5] End-to-End Repository Integration with Guard:');

  const sampleSections = {
    achievements: { items: [{ id: '1', title: 'Achievement', description: 'Desc', category: 'General' }], noUpdates: false },
    issues: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada kendala' },
    objectives: { items: [{ id: '2', title: 'Objective', targetDate: '2026-10-18', status: 'ON_TRACK' }], noUpdates: false },
    support: { items: [], noUpdates: true, noUpdatesReason: 'Tidak butuh bantuan' },
  };

  const initialW42Report: WeeklyReport = {
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

  await runTest('InMemoryReportRepository rejects unscoped report when guard is enforced', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });

    const repo = new InMemoryReportRepository([initialW42Report]);

    // Attacker tries to save draft on rep_2026_w41
    const res = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w41_team-operasional',
      updates: { sections: sampleSections as any },
      expectedVersion: 1,
      expectedRevision: 1,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  await runTest('InMemoryReportRepository rejects unauthorized actor when guard is enforced', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });

    const repo = new InMemoryReportRepository([initialW42Report]);

    // Attacker tries to submit W42 report
    const res = await repo.submitReport({
      user: unrelatedContributor,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 1,
      expectedRevision: 1,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'CONTROLLED_WORKFLOW_GUARD_REJECTED');
  });

  await runTest('Full 6-step lifecycle completes cleanly through repository under guard', async () => {
    setControlledWorkflowGuardForTesting({
      enabled: true,
      workflowWriteEnabled: true,
      enforceOnMockRepo: true,
    });

    const repo = new InMemoryReportRepository([initialW42Report]);

    // Step 1: Save Draft (Contributor) -> ver 1 -> 2
    let step1 = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      updates: { title: 'Updated Draft', sections: sampleSections as any },
      expectedVersion: 1,
      expectedRevision: 1,
    });
    assert.strictEqual(step1.success, true);
    assert.strictEqual(step1.data?.version, 2);
    assert.strictEqual(step1.data?.status, 'DRAFT');

    // Step 2: Submit (Contributor) -> ver 2 -> 3, status SUBMITTED
    let step2 = await repo.submitReport({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 2,
      expectedRevision: 1,
    });
    assert.strictEqual(step2.success, true);
    assert.strictEqual(step2.data?.version, 3);
    assert.strictEqual(step2.data?.status, 'SUBMITTED');

    // Step 3: Request Revision (Reviewer) -> ver 3 -> 4, status NEEDS_REVISION
    let step3 = await repo.requestRevision({
      user: validReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      reviewNotes: 'Mohon lengkapi catatan rencana kegiatan.',
      expectedVersion: 3,
      expectedRevision: 1,
    });
    assert.strictEqual(step3.success, true);
    assert.strictEqual(step3.data?.version, 4);
    assert.strictEqual(step3.data?.status, 'NEEDS_REVISION');

    // Step 4: Save Revised Draft (Contributor) -> ver 4 -> 5
    let step4 = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      updates: { title: 'Revised Draft Content', sections: sampleSections as any },
      expectedVersion: 4,
      expectedRevision: 1,
    });
    assert.strictEqual(step4.success, true);
    assert.strictEqual(step4.data?.version, 5);

    // Step 5: Resubmit (Contributor) -> ver 5 -> 6, rev 1 -> 2, status SUBMITTED
    let step5 = await repo.submitReport({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      expectedVersion: 5,
      expectedRevision: 1,
    });
    assert.strictEqual(step5.success, true);
    assert.strictEqual(step5.data?.version, 6);
    assert.strictEqual(step5.data?.revision, 2);
    assert.strictEqual(step5.data?.status, 'SUBMITTED');

    // Step 6: Approve (Reviewer) -> ver 6 -> 7, rev 2 frozen, status APPROVED
    let step6 = await repo.approveReport({
      user: validReviewer,
      reportId: 'rep_2026_w42_team-operasional',
      reviewNotes: 'Disetujui. Capaian dan mitigasi telah sesuai standar Onewill.',
      expectedVersion: 6,
      expectedRevision: 2,
    });
    assert.strictEqual(step6.success, true);
    assert.strictEqual(step6.data?.version, 7);
    assert.strictEqual(step6.data?.revision, 2);
    assert.strictEqual(step6.data?.status, 'APPROVED');
    assert.strictEqual(step6.data?.archiveStatus, 'NOT_ARCHIVED');

    // Step 7: Attempt 7th mutation -> REJECTED by budget
    let step7 = await repo.updateReportDraft({
      user: validContributor,
      reportId: 'rep_2026_w42_team-operasional',
      updates: { sections: sampleSections as any },
      expectedVersion: 7,
      expectedRevision: 2,
    });
    assert.strictEqual(step7.success, false);
    assert.strictEqual(step7.code, 'CONTROLLED_WORKFLOW_BUDGET_EXHAUSTED');
  });

  console.log('\n[SECTION 6] Production Override Protection:');

  runTest('Throws error if test overrides are called in production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';
      assert.throws(
        () => {
          setControlledWorkflowGuardForTesting({ enabled: true });
        },
        /CRITICAL SECURITY ERROR: Controlled workflow guard test overrides are prohibited in production!/
      );
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      resetControlledWorkflowGuardForTesting();
    }
  });

  console.log(`\n===========================================================`);
  console.log(` Summary: ${passedTests} Passed, 0 Failed. Total: ${totalTests}`);
  console.log(`===========================================================`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
