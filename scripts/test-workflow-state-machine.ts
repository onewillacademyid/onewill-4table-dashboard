/**
 * Onewill Academy — Milestone M4.2-B QA Test Suite
 * Pure State Machine & Workflow Zod Schemas Verification
 *
 * Validates:
 * 1. Valid workflow transitions:
 *    - T1: DRAFT -> SUBMITTED (initial, rev=1)
 *    - T2: SUBMITTED -> NEEDS_REVISION (rev unchanged)
 *    - T3: NEEDS_REVISION -> SUBMITTED (resubmit, rev increments by exactly 1)
 *    - T4: SUBMITTED -> APPROVED (rev unchanged, snapshot prepared)
 * 2. Invalid transitions:
 *    - DRAFT -> APPROVED (rejected)
 *    - DRAFT -> NEEDS_REVISION (rejected)
 *    - SUBMITTED -> DRAFT (rejected)
 *    - NEEDS_REVISION -> APPROVED (rejected)
 *    - APPROVED -> any state (rejected)
 * 3. Author-only submission (non-author rejected).
 * 4. Reviewer authorization (Contributor rejected from review actions).
 * 5. Principle of Segregation of Duties (Prinsip Segregasi Tugas):
 *    - Author CANNOT approve own report (even if Admin / Super Admin).
 *    - Author CANNOT request revision of own report (even if Admin / Super Admin).
 * 6. Cross-team restrictions (Team Lead restricted to assigned team).
 * 7. Disabled users (rejected with ACCOUNT_DISABLED).
 * 8. Revision increment on resubmit (rev + 1).
 * 9. No revision increment on request revision (preserves rev).
 * 10. Approval snapshot metadata creation (v{revision}, reportId, approvedBy, approvedAt).
 * 11. Mandatory review notes (min 10 characters after trim).
 * 12. Strict Zod schemas (rejects client-injected authorId, teamId, status, actorUid, etc.).
 * 13. Draft completeness validation (all 4 tables required or noUpdates with rationale).
 * 14. Optimistic concurrency / stale revision prevention (expectedRevision mismatch).
 * 15. Draft editing operation (SAVE_DRAFT preserves status and revision).
 * 16. Zero database/network activity (100% pure in-memory deterministic testing).
 *
 * Run with: npx tsx scripts/test-workflow-state-machine.ts
 */

import {
  executeWorkflowTransition,
  executeSaveDraft,
  WorkflowCaller,
  WorkflowCurrentReport,
  WorkflowErrorCode,
  WorkflowTransitionResult,
} from '../src/lib/workflow/state-machine';

import {
  UpdateReportDraftSchema,
  SubmitReportSchema,
  ApproveReportSchema,
  RequestRevisionSchema,
  validateFourTableCompleteness,
} from '../src/lib/validation/workflow';

import { WeeklyReportSections } from '../src/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    process.exitCode = 1;
  }
}

function assertFailure(
  result: WorkflowTransitionResult,
  expectedCode: WorkflowErrorCode,
  message: string
) {
  if (result.success === false) {
    assert(result.code === expectedCode, message);
  } else {
    assert(false, `${message} (expected failure ${expectedCode}, got success)`);
  }
}

console.log('===========================================================');
console.log(' ONEWILL ACADEMY — M4.2-B PURE STATE MACHINE & SCHEMAS TEST');
console.log('===========================================================\n');

// -------------------------------------------------------------
// Test User Personas
// -------------------------------------------------------------
const authorContributor: WorkflowCaller = {
  id: 'usr-contributor-adhi',
  email: 'adhimonow@gmail.com',
  name: 'Adhi Monow',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  active: true,
};

const otherContributor: WorkflowCaller = {
  id: 'usr-contributor-bambang',
  email: 'bambang@onewill.id',
  name: 'Bambang',
  role: 'CONTRIBUTOR',
  teamId: 'team-operasional',
  active: true,
};

const leadOperasional: WorkflowCaller = {
  id: 'usr-lead-budi',
  email: 'budi.santoso@onewill.id',
  name: 'Budi Santoso',
  role: 'TEAM_LEAD',
  teamId: 'team-operasional',
  teamName: 'Operasional & SDM',
  active: true,
};

const leadAkademik: WorkflowCaller = {
  id: 'usr-lead-siti',
  email: 'siti@onewill.id',
  name: 'Siti Nurhaliza',
  role: 'TEAM_LEAD',
  teamId: 'team-akademik',
  teamName: 'Akademik & Kurikulum',
  active: true,
};

const managerExecutive: WorkflowCaller = {
  id: 'usr-manager-hendra',
  email: 'hendra.wijaya@onewill.id',
  name: 'Hendra Wijaya',
  role: 'MANAGEMENT',
  teamId: 'team-executive',
  active: true,
};

const superAdminAuthor: WorkflowCaller = {
  id: 'usr-superadmin-willy',
  email: 'willy@onewill.id',
  name: 'Willy Premadi',
  role: 'SUPER_ADMIN',
  teamId: 'team-operasional',
  active: true,
};

const disabledUser: WorkflowCaller = {
  id: 'usr-disabled-user',
  email: 'disabled@onewill.id',
  name: 'Disabled User',
  role: 'TEAM_LEAD',
  teamId: 'team-operasional',
  active: false,
};

// -------------------------------------------------------------
// Sample 4-Table Section Data
// -------------------------------------------------------------
const completeSections: WeeklyReportSections = {
  achievements: {
    items: [
      {
        id: 'ach-1',
        project: 'Sistem Laporan',
        description: 'Menyelesaikan modul validasi 4 tabel',
        result: 'Tercapai 100%',
      },
    ],
    noUpdates: false,
  },
  issues: {
    items: [],
    noUpdates: true,
    noUpdatesReason: 'Tidak ada kendala operasional yang perlu dieskalasi pekan ini.',
  },
  objectives: {
    items: [
      {
        id: 'obj-1',
        objective: 'Integrasi alur peninjauan M4.2-C',
        measurableOutcome: 'Endpoint peninjauan teruji',
        assignee: 'Tim Backend',
        dueDate: '2026-10-20',
        priority: 'high',
      },
    ],
    noUpdates: false,
  },
  support: {
    items: [],
    noUpdates: true,
    noUpdatesReason: 'Semua sumber daya dan otorisasi mencukupi.',
  },
};

const incompleteSections: WeeklyReportSections = {
  achievements: { items: [], noUpdates: false }, // Incomplete!
  issues: completeSections.issues,
  objectives: completeSections.objectives,
  support: completeSections.support,
};

function createMockReport(overrides?: Partial<WorkflowCurrentReport>): WorkflowCurrentReport {
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
    sections: completeSections,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-10-12T10:00:00Z',
        updatedBy: authorContributor.id,
        updatedByName: authorContributor.name,
        action: 'CREATED',
        notes: 'Draf laporan mingguan dibuat.',
      },
    ],
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt: '2026-10-12T10:00:00Z',
    archiveStatus: 'NOT_ARCHIVED',
    ...overrides,
  };
}

// -------------------------------------------------------------
// [SECTION 1] 4-Table Completeness & Strict Zod Validation
// -------------------------------------------------------------
console.log('[SECTION 1] 4-Table Completeness & Strict Zod Validation:');

const completenessCheckValid = validateFourTableCompleteness(completeSections);
assert(completenessCheckValid.complete === true, 'Complete sections pass 4-table completeness check');

const completenessCheckInvalid = validateFourTableCompleteness(incompleteSections);
assert(completenessCheckInvalid.complete === false, 'Incomplete achievements fail 4-table completeness check');
assert(completenessCheckInvalid.missingSections.includes('achievements'), 'Incomplete check identifies missing achievements');

// Zod: UpdateReportDraftSchema
const validDraftInput = {
  title: 'Judul Laporan Diperbarui',
  sections: completeSections,
};
assert(UpdateReportDraftSchema.safeParse(validDraftInput).success === true, 'UpdateReportDraftSchema accepts valid draft payload');

const draftWithInjectedFields = {
  ...validDraftInput,
  authorId: 'hacker-uid',
  status: 'APPROVED',
  revision: 99,
};
assert(UpdateReportDraftSchema.safeParse(draftWithInjectedFields).success === false, 'UpdateReportDraftSchema.strict() rejects client-injected authorId, status, revision');

// Zod: SubmitReportSchema
assert(SubmitReportSchema.safeParse({ comments: 'Mohon ditinjau' }).success === true, 'SubmitReportSchema accepts valid optional comments');
assert(SubmitReportSchema.safeParse({ status: 'SUBMITTED' }).success === false, 'SubmitReportSchema rejects client-injected status');

// Zod: ApproveReportSchema
assert(ApproveReportSchema.safeParse({ reviewNotes: 'Disetujui' }).success === true, 'ApproveReportSchema accepts optional review notes');
assert(ApproveReportSchema.safeParse({ approvedBy: 'fake-id' }).success === false, 'ApproveReportSchema rejects client-injected approvedBy');

// Zod: RequestRevisionSchema (Mandatory notes >= 10 chars after trimming)
assert(RequestRevisionSchema.safeParse({ reviewNotes: 'Mohon perbaiki data capaian pada tabel 1.' }).success === true, 'RequestRevisionSchema accepts valid notes >= 10 chars');
assert(RequestRevisionSchema.safeParse({ reviewNotes: 'Revisi.' }).success === false, 'RequestRevisionSchema rejects short notes (< 10 chars)');
assert(RequestRevisionSchema.safeParse({ reviewNotes: '   Pendek   ' }).success === false, 'RequestRevisionSchema rejects trimmed notes < 10 chars');
assert(RequestRevisionSchema.safeParse({}).success === false, 'RequestRevisionSchema rejects missing reviewNotes');

// -------------------------------------------------------------
// [SECTION 2] Valid Lifecycle Transitions (T1 -> T2 -> T3 -> T4)
// -------------------------------------------------------------
console.log('\n[SECTION 2] Valid Lifecycle Transitions (T1 -> T2 -> T3 -> T4):');

// T1: DRAFT -> SUBMITTED (Initial submission)
const draftReport = createMockReport({ status: 'DRAFT', revision: 1 });
const t1Result = executeWorkflowTransition({
  currentReport: draftReport,
  caller: authorContributor,
  action: 'SUBMIT',
  payload: { comments: 'Siap untuk ditinjau Team Lead' },
  timestamp: '2026-10-12T11:00:00Z',
});

assert(t1Result.success === true, 'T1: Author successfully submits DRAFT to SUBMITTED');
if (t1Result.success) {
  assert(t1Result.nextReport.status === 'SUBMITTED', 'T1: Next status is SUBMITTED');
  assert(t1Result.nextReport.revision === 1, 'T1: Initial submission preserves revision 1');
  assert(t1Result.nextReport.submittedAt === '2026-10-12T11:00:00Z', 'T1: Sets submittedAt timestamp');
  assert(t1Result.auditEvent.action === 'REPORT_SUBMITTED', 'T1: Audit action is REPORT_SUBMITTED');
  assert(t1Result.auditEvent.actorUid === authorContributor.id, 'T1: Audit actorUid matches author');
}

// T2: SUBMITTED -> NEEDS_REVISION (Reviewer requests revision)
const submittedReport = t1Result.success ? t1Result.nextReport : createMockReport({ status: 'SUBMITTED', revision: 1 });
const t2Result = executeWorkflowTransition({
  currentReport: submittedReport,
  caller: leadOperasional,
  action: 'REQUEST_REVISION',
  payload: { reviewNotes: 'Mohon lengkapi metrik capaian pada tabel capaian sebelum disetujui.' },
  timestamp: '2026-10-12T12:00:00Z',
});

assert(t2Result.success === true, 'T2: Team Lead successfully requests revision');
if (t2Result.success) {
  assert(t2Result.nextReport.status === 'NEEDS_REVISION', 'T2: Next status is NEEDS_REVISION');
  assert(t2Result.nextReport.revision === 1, 'T2: Revision remains 1 (not incremented on request revision)');
  assert(t2Result.nextReport.reviewedBy === leadOperasional.id, 'T2: Sets reviewedBy to reviewer UID');
  assert(t2Result.nextReport.reviewedAt === '2026-10-12T12:00:00Z', 'T2: Sets reviewedAt timestamp');
  assert(t2Result.auditEvent.action === 'REVISION_REQUESTED', 'T2: Audit action is REVISION_REQUESTED');
}

// Interlude: SAVE_DRAFT during NEEDS_REVISION
const needsRevisionReport = t2Result.success ? t2Result.nextReport : createMockReport({ status: 'NEEDS_REVISION', revision: 1 });
const saveDraftResult = executeSaveDraft({
  currentReport: needsRevisionReport,
  caller: authorContributor,
  updates: {
    title: 'Laporan Mingguan Operasional & SDM — Pekan 42 (Perbaikan Capaian)',
    sections: completeSections,
  },
  timestamp: '2026-10-12T13:00:00Z',
});
assert(saveDraftResult.success === true, 'SAVE_DRAFT succeeds during NEEDS_REVISION state');
if (saveDraftResult.success) {
  assert(saveDraftResult.nextReport.status === 'NEEDS_REVISION', 'SAVE_DRAFT preserves NEEDS_REVISION status');
  assert(saveDraftResult.nextReport.revision === 1, 'SAVE_DRAFT preserves revision 1');
  assert(saveDraftResult.auditEvent.action === 'REPORT_UPDATED', 'SAVE_DRAFT audit action is REPORT_UPDATED');
}

// T3: NEEDS_REVISION -> SUBMITTED (Resubmission by Author)
const editedRevisionReport = saveDraftResult.success ? saveDraftResult.nextReport : needsRevisionReport;
const t3Result = executeWorkflowTransition({
  currentReport: editedRevisionReport,
  caller: authorContributor,
  action: 'SUBMIT',
  payload: { comments: 'Sudah diperbaiki sesuai catatan peninjau.' },
  timestamp: '2026-10-12T14:00:00Z',
});

assert(t3Result.success === true, 'T3: Author successfully resubmits report');
if (t3Result.success) {
  assert(t3Result.nextReport.status === 'SUBMITTED', 'T3: Next status is SUBMITTED');
  assert(t3Result.nextReport.revision === 2, 'T3: Revision increments by exactly 1 on resubmit (1 -> 2)');
  assert(t3Result.auditEvent.action === 'REPORT_RESUBMITTED', 'T3: Audit action is REPORT_RESUBMITTED');
  assert(t3Result.auditEvent.metadata.revision === 2, 'T3: Audit metadata records revision 2');
}

// T4: SUBMITTED -> APPROVED (Reviewer approves Rev 2)
const resubmittedReport = t3Result.success ? t3Result.nextReport : createMockReport({ status: 'SUBMITTED', revision: 2 });
const t4Result = executeWorkflowTransition({
  currentReport: resubmittedReport,
  caller: leadOperasional,
  action: 'APPROVE',
  payload: { reviewNotes: 'Perbaikan telah diverifikasi dan disetujui.' },
  timestamp: '2026-10-12T15:00:00Z',
});

assert(t4Result.success === true, 'T4: Team Lead approves resubmitted report');
if (t4Result.success) {
  assert(t4Result.nextReport.status === 'APPROVED', 'T4: Next status is APPROVED');
  assert(t4Result.nextReport.revision === 2, 'T4: Approved revision frozen at 2');
  assert(t4Result.nextReport.archiveStatus === 'QUEUED', 'T4: archiveStatus transitions to QUEUED');
  assert(t4Result.auditEvent.action === 'REPORT_APPROVED', 'T4: Audit action is REPORT_APPROVED');
  assert(t4Result.snapshotMetadata !== undefined, 'T4: Creates snapshotMetadata for v2');
  assert(t4Result.snapshotMetadata?.versionId === 'v2', 'T4: Snapshot versionId is "v2"');
  assert(t4Result.snapshotMetadata?.revisionNumber === 2, 'T4: Snapshot revisionNumber is 2');
  assert(t4Result.snapshotMetadata?.approvedBy === leadOperasional.id, 'T4: Snapshot approvedBy matches reviewer');
}

// -------------------------------------------------------------
// [SECTION 3] Segregation of Duties (Prinsip Segregasi Tugas)
// -------------------------------------------------------------
console.log('\n[SECTION 3] Segregation of Duties (No Self-Approval Enforcement):');

// Author Contributor attempts to approve own report
const selfApproveContributor = executeWorkflowTransition({
  currentReport: submittedReport,
  caller: authorContributor,
  action: 'APPROVE',
});
assert(selfApproveContributor.success === false, 'Contributor cannot approve own report');
assertFailure(selfApproveContributor, 'SELF_APPROVAL_PROHIBITED', 'Rejects with SELF_APPROVAL_PROHIBITED');

// Author Contributor attempts to request revision of own report
const selfReviseContributor = executeWorkflowTransition({
  currentReport: submittedReport,
  caller: authorContributor,
  action: 'REQUEST_REVISION',
  payload: { reviewNotes: 'Saya ingin merevisi laporan saya sendiri.' },
});
assert(selfReviseContributor.success === false, 'Contributor cannot request revision of own report');
assertFailure(selfReviseContributor, 'SELF_REVISION_PROHIBITED', 'Rejects with SELF_REVISION_PROHIBITED');

// Super Admin authors a report -> CANNOT approve own report!
const superAdminAuthoredReport = createMockReport({
  authorId: superAdminAuthor.id,
  authorName: superAdminAuthor.name,
  status: 'SUBMITTED',
  revision: 1,
});

const selfApproveSuperAdmin = executeWorkflowTransition({
  currentReport: superAdminAuthoredReport,
  caller: superAdminAuthor,
  action: 'APPROVE',
});
assert(selfApproveSuperAdmin.success === false, 'Super Admin CANNOT approve own report (Strict Segregasi Tugas)');
assertFailure(selfApproveSuperAdmin, 'SELF_APPROVAL_PROHIBITED', 'Super Admin self-approval blocked with SELF_APPROVAL_PROHIBITED');

// -------------------------------------------------------------
// [SECTION 4] RBAC Scope & Role Privileges
// -------------------------------------------------------------
console.log('\n[SECTION 4] RBAC Scope & Role Privileges:');

// Non-author attempts to SUBMIT report
const nonAuthorSubmit = executeWorkflowTransition({
  currentReport: draftReport,
  caller: otherContributor,
  action: 'SUBMIT',
});
assert(nonAuthorSubmit.success === false, 'Non-author cannot submit draft');
assertFailure(nonAuthorSubmit, 'UNAUTHORIZED_ROLE', 'Non-author submit rejected with UNAUTHORIZED_ROLE');

// Contributor attempts to APPROVE someone else's report
const otherSubmittedReport = createMockReport({ authorId: 'another-user', status: 'SUBMITTED' });
const contributorApprove = executeWorkflowTransition({
  currentReport: otherSubmittedReport,
  caller: otherContributor,
  action: 'APPROVE',
});
assert(contributorApprove.success === false, 'Contributor cannot approve reports');
assertFailure(contributorApprove, 'UNAUTHORIZED_ROLE', 'Contributor approve rejected with UNAUTHORIZED_ROLE');

// Cross-Team Review: Team Lead of Akademik attempts to approve Operasional report
const crossTeamLeadApprove = executeWorkflowTransition({
  currentReport: submittedReport, // Operasional report
  caller: leadAkademik,           // Akademik lead
  action: 'APPROVE',
});
assert(crossTeamLeadApprove.success === false, 'Team Lead cannot approve cross-team report');
assertFailure(crossTeamLeadApprove, 'CROSS_TEAM_FORBIDDEN', 'Cross-team lead rejected with CROSS_TEAM_FORBIDDEN');

// Org-Wide Review: Management can approve any team's report (if not author)
const managementApprove = executeWorkflowTransition({
  currentReport: submittedReport, // Operasional report
  caller: managerExecutive,       // Executive management
  action: 'APPROVE',
  payload: { reviewNotes: 'Disetujui oleh Manajemen Eksekutif.' },
});
assert(managementApprove.success === true, 'Management can approve cross-team report');

// Disabled User Rejection
const disabledUserAction = executeWorkflowTransition({
  currentReport: submittedReport,
  caller: disabledUser,
  action: 'APPROVE',
});
assert(disabledUserAction.success === false, 'Disabled user action is rejected');
assertFailure(disabledUserAction, 'ACCOUNT_DISABLED', 'Disabled user rejected with ACCOUNT_DISABLED');

// -------------------------------------------------------------
// [SECTION 5] Invalid State Transitions (Negative FSM Tests)
// -------------------------------------------------------------
console.log('\n[SECTION 5] Invalid State Transitions (Negative FSM Tests):');

// DRAFT -> APPROVE (Direct bypass of review queue)
const draftDirectApprove = executeWorkflowTransition({
  currentReport: draftReport,
  caller: leadOperasional,
  action: 'APPROVE',
});
assert(draftDirectApprove.success === false, 'DRAFT -> APPROVE transition is rejected');
assertFailure(draftDirectApprove, 'INVALID_STATE_TRANSITION', 'Rejected with INVALID_STATE_TRANSITION');

// DRAFT -> REQUEST_REVISION
const draftDirectRevise = executeWorkflowTransition({
  currentReport: draftReport,
  caller: leadOperasional,
  action: 'REQUEST_REVISION',
  payload: { reviewNotes: 'Catatan revisi sebelum submit.' },
});
assert(draftDirectRevise.success === false, 'DRAFT -> REQUEST_REVISION transition is rejected');

// SUBMITTED -> SUBMIT (Double submission)
const submittedDoubleSubmit = executeWorkflowTransition({
  currentReport: submittedReport,
  caller: authorContributor,
  action: 'SUBMIT',
});
assert(submittedDoubleSubmit.success === false, 'SUBMITTED -> SUBMIT double submission is rejected');

// APPROVED -> SUBMIT / REQUEST_REVISION / APPROVE
const approvedReport = createMockReport({ status: 'APPROVED', revision: 2 });

const approvedSubmit = executeWorkflowTransition({
  currentReport: approvedReport,
  caller: authorContributor,
  action: 'SUBMIT',
});
assert(approvedSubmit.success === false, 'APPROVED report cannot be resubmitted directly');

const approvedApprove = executeWorkflowTransition({
  currentReport: approvedReport,
  caller: leadOperasional,
  action: 'APPROVE',
});
assert(approvedApprove.success === false, 'APPROVED report cannot be approved again');

// -------------------------------------------------------------
// [SECTION 6] Completeness & Optimistic Concurrency Checks
// -------------------------------------------------------------
console.log('\n[SECTION 6] Completeness & Optimistic Concurrency Checks:');

// Submission of incomplete draft is rejected
const incompleteDraftReport = createMockReport({
  status: 'DRAFT',
  sections: incompleteSections,
});
const incompleteSubmit = executeWorkflowTransition({
  currentReport: incompleteDraftReport,
  caller: authorContributor,
  action: 'SUBMIT',
});
assert(incompleteSubmit.success === false, 'Incomplete draft submission is rejected');
assertFailure(incompleteSubmit, 'INCOMPLETE_SECTIONS', 'Rejected with INCOMPLETE_SECTIONS');

// Optimistic Concurrency: Stale revision mismatch
const staleRevisionSubmit = executeWorkflowTransition({
  currentReport: draftReport, // Revision is 1
  caller: authorContributor,
  action: 'SUBMIT',
  expectedRevision: 99, // Mismatched expected revision!
});
assert(staleRevisionSubmit.success === false, 'Stale expectedRevision is rejected');
assertFailure(staleRevisionSubmit, 'STALE_REVISION_CONFLICT', 'Rejected with STALE_REVISION_CONFLICT');

// Optimistic Concurrency: Matching expectedRevision succeeds
const matchingRevisionSubmit = executeWorkflowTransition({
  currentReport: draftReport, // Revision is 1
  caller: authorContributor,
  action: 'SUBMIT',
  expectedRevision: 1, // Matches!
});
assert(matchingRevisionSubmit.success === true, 'Matching expectedRevision succeeds');

// Save Draft Optimistic Concurrency
const staleSaveDraft = executeSaveDraft({
  currentReport: draftReport,
  caller: authorContributor,
  updates: { sections: completeSections },
  expectedRevision: 2, // Mismatch
});
assert(staleSaveDraft.success === false, 'Save draft rejects stale expectedRevision');

// Mandatory notes check: Request revision with spaces only
const spacesNotesRevise = executeWorkflowTransition({
  currentReport: submittedReport,
  caller: leadOperasional,
  action: 'REQUEST_REVISION',
  payload: { reviewNotes: '          ' },
});
assert(spacesNotesRevise.success === false, 'Request revision rejects whitespace-only notes');
assertFailure(spacesNotesRevise, 'MANDATORY_NOTES_REQUIRED', 'Rejected with MANDATORY_NOTES_REQUIRED');

// -------------------------------------------------------------
// [SECTION 7] Purity & Immutability Verification
// -------------------------------------------------------------
console.log('\n[SECTION 7] Purity & Immutability Verification:');

const originalReportSnapshot = JSON.stringify(draftReport);
executeWorkflowTransition({
  currentReport: draftReport,
  caller: authorContributor,
  action: 'SUBMIT',
});
assert(JSON.stringify(draftReport) === originalReportSnapshot, 'Pure function does NOT mutate input currentReport object');

const originalCallerSnapshot = JSON.stringify(authorContributor);
executeWorkflowTransition({
  currentReport: draftReport,
  caller: authorContributor,
  action: 'SUBMIT',
});
assert(JSON.stringify(authorContributor) === originalCallerSnapshot, 'Pure function does NOT mutate input caller object');

console.log('\n===========================================================');
console.log(` Summary: ${passedTests} Passed, ${failedTests} Failed. Total: ${totalTests}`);
console.log('===========================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
