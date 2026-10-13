/**
 * Onewill Academy | Pure Deterministic Report Workflow State Machine
 * Milestone M4.2-B: Domain Transition Engine
 *
 * Design Guarantees:
 * 1. 100% Pure Functional Logic: Zero side-effects, zero mutations of input objects.
 * 2. Zero SDK / Network Dependencies: No Firebase Admin SDK, no Firestore, no fetch.
 * 3. Strict Finite State Machine: Only authorized lifecycle transitions are permitted.
 * 4. Segregation of Duties (Prinsip Segregasi Tugas): Authors CANNOT approve or request revision of their own report.
 *    No exception for Admin or Super Admin.
 * 5. Deterministic Revision Calculation:
 *    - DRAFT -> SUBMITTED (initial): rev = 1
 *    - SUBMITTED -> NEEDS_REVISION: rev unchanged (current)
 *    - NEEDS_REVISION -> SUBMITTED (resubmit): rev increments by exactly 1 (rev + 1)
 *    - SUBMITTED -> APPROVED: rev unchanged (current)
 * 6. Optimistic Concurrency Control: Rejects stale revisions via expectedRevision.
 */

import { UserRole, WeeklyReportSections, ReportRevisionHistory, ArchiveStatus } from '@/types';
import { validateFourTableCompleteness } from '@/lib/validation/workflow';

// ==========================================
// 1. Domain Types & State Machine Contracts
// ==========================================

export type WorkflowReportStatus = 'DRAFT' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED';

export type WorkflowAction =
  | 'SUBMIT'             // T1: DRAFT -> SUBMITTED or T3: NEEDS_REVISION -> SUBMITTED
  | 'REQUEST_REVISION'   // T2: SUBMITTED -> NEEDS_REVISION
  | 'APPROVE';           // T4: SUBMITTED -> APPROVED

export type WorkflowAuditAction =
  | 'REPORT_SUBMITTED'
  | 'REPORT_RESUBMITTED'
  | 'REVISION_REQUESTED'
  | 'REPORT_APPROVED'
  | 'REPORT_UPDATED';

export type WorkflowErrorCode =
  | 'ACCOUNT_DISABLED'
  | 'UNAUTHORIZED_ROLE'
  | 'SELF_APPROVAL_PROHIBITED'
  | 'SELF_REVISION_PROHIBITED'
  | 'CROSS_TEAM_FORBIDDEN'
  | 'INVALID_STATE_TRANSITION'
  | 'INCOMPLETE_SECTIONS'
  | 'MANDATORY_NOTES_REQUIRED'
  | 'STALE_REVISION_CONFLICT'
  | 'MISSING_CONCURRENCY_TOKEN'
  | 'INVALID_CONCURRENCY_TOKEN'
  | 'CONCURRENCY_TOKEN_MISMATCH';

export interface WorkflowCaller {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
  teamName?: string;
  active: boolean;
}

export interface WorkflowCurrentReport {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  teamId: string;
  teamName: string;
  weekNumber: number;
  year: number;
  weekStartDate: string;
  weekEndDate: string;
  status: WorkflowReportStatus;
  revision: number;
  version?: number; // Concurrency sequence token (M4.2-C)
  sections: WeeklyReportSections;
  revisionsHistory: ReportRevisionHistory[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNotes?: string;
  archiveStatus: ArchiveStatus;
  archiveError?: string;
  archiveDriveFileId?: string;
}

export interface TransitionPayload {
  comments?: string;     // For SUBMIT
  reviewNotes?: string;  // Mandatory for REQUEST_REVISION, optional for APPROVE
}

export interface ExecuteTransitionParams {
  currentReport: WorkflowCurrentReport;
  caller: WorkflowCaller;
  action: WorkflowAction;
  payload?: TransitionPayload;
  expectedVersion?: number;  // Optimistic concurrency sequence token check (M4.2-C)
  expectedRevision?: number; // Business revision check
  timestamp?: string;        // Injected ISO 8601 string for deterministic purity
}

export interface WorkflowAuditEvent {
  action: WorkflowAuditAction;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  targetType: 'report';
  targetId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ApprovedSnapshotMetadata {
  versionId: string; // e.g. "v1", "v2"
  reportId: string;
  revisionNumber: number;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  notes?: string;
}

export interface WorkflowTransitionSuccess {
  success: true;
  nextReport: WorkflowCurrentReport;
  auditEvent: WorkflowAuditEvent;
  snapshotMetadata?: ApprovedSnapshotMetadata;
}

export interface WorkflowTransitionFailure {
  success: false;
  code: WorkflowErrorCode;
  error: string;
}

export type WorkflowTransitionResult = WorkflowTransitionSuccess | WorkflowTransitionFailure;

// ==========================================
// 2. Draft Save Operation (Non-lifecycle Edit)
// ==========================================

export interface SaveDraftParams {
  currentReport: WorkflowCurrentReport;
  caller: WorkflowCaller;
  updates: {
    title?: string;
    sections: WeeklyReportSections;
  };
  expectedVersion?: number;
  expectedRevision?: number;
  timestamp?: string;
}

/**
 * Validates and executes a draft update.
 * Precondition: Report status must be DRAFT or NEEDS_REVISION.
 * Does NOT advance lifecycle status. Preserves current revision number.
 * Advances concurrency version sequence token (version + 1).
 */
export function executeSaveDraft(params: SaveDraftParams): WorkflowTransitionResult {
  const { currentReport, caller, updates, expectedVersion, expectedRevision, timestamp } = params;
  const now = timestamp || new Date().toISOString();

  // 1. Account status verification
  if (!caller.active) {
    return {
      success: false,
      code: 'ACCOUNT_DISABLED',
      error: 'Akses ditolak: Akun Anda dalam status tidak aktif.',
    };
  }

  // 2. Concurrency verification (Token & Revision)
  const currentVersion = currentReport.version ?? 1;
  if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
    return {
      success: false,
      code: 'STALE_REVISION_CONFLICT',
      error: `Konflik konkurensi: Laporan saat ini berada pada versi v${currentVersion}, sedangkan perubahan Anda didasarkan pada versi v${expectedVersion}. Silakan muat ulang halaman.`,
    };
  }
  if (expectedRevision !== undefined && expectedRevision !== currentReport.revision) {
    return {
      success: false,
      code: 'STALE_REVISION_CONFLICT',
      error: `Konflik versi: Laporan saat ini berada pada revisi #${currentReport.revision}, sedangkan data Anda didasarkan pada revisi #${expectedRevision}. Silakan muat ulang halaman.`,
    };
  }

  // 3. Status eligibility: Only DRAFT or NEEDS_REVISION can be edited
  if (currentReport.status !== 'DRAFT' && currentReport.status !== 'NEEDS_REVISION') {
    return {
      success: false,
      code: 'INVALID_STATE_TRANSITION',
      error: 'Hanya laporan dengan status DRAFT atau NEEDS_REVISION yang dapat diubah.',
    };
  }

  // 4. Caller authorization: Only author or Super Admin can edit draft
  const isAuthor = caller.id === currentReport.authorId;
  const isSuperAdmin = caller.role === 'SUPER_ADMIN';

  if (!isAuthor && !isSuperAdmin) {
    return {
      success: false,
      code: 'UNAUTHORIZED_ROLE',
      error: 'Akses ditolak: Hanya penulis asli atau Super Admin yang dapat mengubah draf laporan ini.',
    };
  }

  const nextVersion = currentVersion + 1;

  // Pure deterministic copy
  const updatedReport: WorkflowCurrentReport = {
    ...currentReport,
    title: updates.title !== undefined ? updates.title.trim() : currentReport.title,
    sections: JSON.parse(JSON.stringify(updates.sections)),
    version: nextVersion,
    updatedAt: now,
  };

  const auditEvent: WorkflowAuditEvent = {
    action: 'REPORT_UPDATED',
    actorUid: caller.id,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetType: 'report',
    targetId: currentReport.id,
    timestamp: now,
    metadata: {
      weekNumber: currentReport.weekNumber,
      year: currentReport.year,
      teamId: currentReport.teamId,
      revision: currentReport.revision,
      version: nextVersion,
      status: currentReport.status,
    },
  };

  return {
    success: true,
    nextReport: updatedReport,
    auditEvent,
  };
}

// ==========================================
// 3. Core Transition State Machine
// ==========================================

/**
 * Pure transition engine evaluating T1 (Submit), T2 (Request Revision), T3 (Resubmit), and T4 (Approve).
 */
export function executeWorkflowTransition(params: ExecuteTransitionParams): WorkflowTransitionResult {
  const { currentReport, caller, action, payload, expectedVersion, expectedRevision, timestamp } = params;
  const now = timestamp || new Date().toISOString();

  // 1. Account Active Guard
  if (!caller.active) {
    return {
      success: false,
      code: 'ACCOUNT_DISABLED',
      error: 'Akses ditolak: Akun Anda dalam status tidak aktif.',
    };
  }

  // 2. Optimistic Concurrency Guard (Version Token & Revision Prevention)
  const currentVersion = currentReport.version ?? 1;
  if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
    return {
      success: false,
      code: 'STALE_REVISION_CONFLICT',
      error: `Konflik konkurensi: Laporan saat ini berada pada versi v${currentVersion}, sedangkan perubahan Anda didasarkan pada versi v${expectedVersion}. Silakan muat ulang halaman.`,
    };
  }
  if (expectedRevision !== undefined && expectedRevision !== currentReport.revision) {
    return {
      success: false,
      code: 'STALE_REVISION_CONFLICT',
      error: `Konflik versi: Laporan saat ini berada pada revisi #${currentReport.revision}, sedangkan data Anda didasarkan pada revisi #${expectedRevision}. Silakan muat ulang halaman.`,
    };
  }

  const nextVersion = currentVersion + 1;

  // 3. Action Dispatch
  switch (action) {
    case 'SUBMIT':
      return handleTransitionSubmit(currentReport, caller, payload, now, nextVersion);
    case 'REQUEST_REVISION':
      return handleTransitionRequestRevision(currentReport, caller, payload, now, nextVersion);
    case 'APPROVE':
      return handleTransitionApprove(currentReport, caller, payload, now, nextVersion);
    default:
      return {
        success: false,
        code: 'INVALID_STATE_TRANSITION',
        error: `Aksi alur kerja tidak dikenal: ${String(action)}.`,
      };
  }
}

// ==========================================
// 4. Individual Transition Handlers
// ==========================================

/**
 * Handles T1 (DRAFT -> SUBMITTED) and T3 (NEEDS_REVISION -> SUBMITTED / Resubmit).
 */
function handleTransitionSubmit(
  currentReport: WorkflowCurrentReport,
  caller: WorkflowCaller,
  payload: TransitionPayload | undefined,
  now: string,
  nextVersion: number
): WorkflowTransitionResult {
  // Precondition: Current status must be DRAFT or NEEDS_REVISION
  if (currentReport.status !== 'DRAFT' && currentReport.status !== 'NEEDS_REVISION') {
    return {
      success: false,
      code: 'INVALID_STATE_TRANSITION',
      error: `Laporan dengan status ${currentReport.status} tidak dapat diajukan. Hanya status DRAFT atau NEEDS_REVISION yang dapat diajukan.`,
    };
  }

  // Authorization: Only original author can submit or resubmit
  if (caller.id !== currentReport.authorId) {
    return {
      success: false,
      code: 'UNAUTHORIZED_ROLE',
      error: 'Akses ditolak: Hanya penulis asli yang dapat mengajukan laporan ini.',
    };
  }

  // Completeness verification: All 4 tables must be complete
  const completeness = validateFourTableCompleteness(currentReport.sections);
  if (!completeness.complete) {
    return {
      success: false,
      code: 'INCOMPLETE_SECTIONS',
      error: completeness.reason || 'Laporan belum memenuhi kriteria kelengkapan 4 tabel.',
    };
  }

  const isResubmission = currentReport.status === 'NEEDS_REVISION';
  const newRevisionNumber = isResubmission ? currentReport.revision + 1 : currentReport.revision;
  const auditAction: WorkflowAuditAction = isResubmission ? 'REPORT_RESUBMITTED' : 'REPORT_SUBMITTED';

  const defaultNotes = isResubmission
    ? `Diajukan kembali setelah perbaikan (Revisi #${newRevisionNumber}).`
    : `Diajukan untuk peninjauan (Revisi #${newRevisionNumber}).`;
  const historyNotes = payload?.comments?.trim() || defaultNotes;

  const newHistoryEntry: ReportRevisionHistory = {
    revisionNumber: newRevisionNumber,
    updatedAt: now,
    updatedBy: caller.id,
    updatedByName: caller.name,
    action: 'SUBMITTED',
    notes: historyNotes,
  };

  const nextReport: WorkflowCurrentReport = {
    ...currentReport,
    status: 'SUBMITTED',
    revision: newRevisionNumber,
    version: nextVersion,
    submittedAt: now,
    updatedAt: now,
    revisionsHistory: [...currentReport.revisionsHistory, newHistoryEntry],
  };

  const auditEvent: WorkflowAuditEvent = {
    action: auditAction,
    actorUid: caller.id,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetType: 'report',
    targetId: currentReport.id,
    timestamp: now,
    metadata: {
      weekNumber: currentReport.weekNumber,
      year: currentReport.year,
      teamId: currentReport.teamId,
      revision: newRevisionNumber,
      version: nextVersion,
      previousStatus: currentReport.status,
      comments: payload?.comments?.trim() || undefined,
    },
  };

  return {
    success: true,
    nextReport,
    auditEvent,
  };
}

/**
 * Handles T2 (SUBMITTED -> NEEDS_REVISION).
 */
function handleTransitionRequestRevision(
  currentReport: WorkflowCurrentReport,
  caller: WorkflowCaller,
  payload: TransitionPayload | undefined,
  now: string,
  nextVersion: number
): WorkflowTransitionResult {
  // Precondition: Current status must be SUBMITTED
  if (currentReport.status !== 'SUBMITTED') {
    return {
      success: false,
      code: 'INVALID_STATE_TRANSITION',
      error: `Hanya laporan dengan status Menunggu Peninjauan (SUBMITTED) yang dapat diminta revisi (status saat ini: ${currentReport.status}).`,
    };
  }

  // Segregation of Duties: Author CANNOT request revision of their own report
  if (caller.id === currentReport.authorId) {
    return {
      success: false,
      code: 'SELF_REVISION_PROHIBITED',
      error: 'Prinsip Segregasi Tugas: Anda tidak dapat meminta revisi atas laporan yang Anda tulis sendiri.',
    };
  }

  // Role Scope Verification
  const roleCheck = verifyReviewerScope(caller, currentReport);
  if (roleCheck.allowed === false) {
    return {
      success: false,
      code: roleCheck.code,
      error: roleCheck.error,
    };
  }

  // Mandatory Review Notes Validation (min 10 chars after trimming)
  const trimmedNotes = payload?.reviewNotes?.trim() || '';
  if (trimmedNotes.length < 10) {
    return {
      success: false,
      code: 'MANDATORY_NOTES_REQUIRED',
      error: 'Catatan revisi wajib diisi minimal 10 karakter agar penulis memahami perbaikan yang dibutuhkan.',
    };
  }

  const newHistoryEntry: ReportRevisionHistory = {
    revisionNumber: currentReport.revision,
    updatedAt: now,
    updatedBy: caller.id,
    updatedByName: caller.name,
    action: 'REVISION_REQUESTED',
    notes: trimmedNotes,
  };

  const nextReport: WorkflowCurrentReport = {
    ...currentReport,
    status: 'NEEDS_REVISION',
    revision: currentReport.revision, // Preserves current revision number!
    version: nextVersion,
    reviewedAt: now,
    reviewedBy: caller.id,
    reviewerName: caller.name,
    reviewNotes: trimmedNotes,
    updatedAt: now,
    revisionsHistory: [...currentReport.revisionsHistory, newHistoryEntry],
  };

  const auditEvent: WorkflowAuditEvent = {
    action: 'REVISION_REQUESTED',
    actorUid: caller.id,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetType: 'report',
    targetId: currentReport.id,
    timestamp: now,
    metadata: {
      weekNumber: currentReport.weekNumber,
      year: currentReport.year,
      teamId: currentReport.teamId,
      revision: currentReport.revision,
      version: nextVersion,
      reviewNotes: trimmedNotes,
    },
  };

  return {
    success: true,
    nextReport,
    auditEvent,
  };
}

/**
 * Handles T4 (SUBMITTED -> APPROVED).
 */
function handleTransitionApprove(
  currentReport: WorkflowCurrentReport,
  caller: WorkflowCaller,
  payload: TransitionPayload | undefined,
  now: string,
  nextVersion: number
): WorkflowTransitionResult {
  // Precondition: Current status must be SUBMITTED
  if (currentReport.status !== 'SUBMITTED') {
    return {
      success: false,
      code: 'INVALID_STATE_TRANSITION',
      error: `Hanya laporan dengan status Menunggu Peninjauan (SUBMITTED) yang dapat disetujui (status saat ini: ${currentReport.status}).`,
    };
  }

  // Segregation of Duties: Author CANNOT approve their own report
  // Strictly applies to all roles, including Admin and Super Admin
  if (caller.id === currentReport.authorId) {
    return {
      success: false,
      code: 'SELF_APPROVAL_PROHIBITED',
      error: 'Prinsip Segregasi Tugas: Penulis laporan tidak dapat menyetujui laporannya sendiri.',
    };
  }

  // Role Scope Verification
  const roleCheck = verifyReviewerScope(caller, currentReport);
  if (roleCheck.allowed === false) {
    return {
      success: false,
      code: roleCheck.code,
      error: roleCheck.error,
    };
  }

  const approvalNotes = payload?.reviewNotes?.trim() || 'Disetujui tanpa catatan khusus.';

  const newHistoryEntry: ReportRevisionHistory = {
    revisionNumber: currentReport.revision,
    updatedAt: now,
    updatedBy: caller.id,
    updatedByName: caller.name,
    action: 'APPROVED',
    notes: approvalNotes,
  };

  const nextReport: WorkflowCurrentReport = {
    ...currentReport,
    status: 'APPROVED',
    revision: currentReport.revision, // Frozen at current revision!
    version: nextVersion,
    reviewedAt: now,
    reviewedBy: caller.id,
    reviewerName: caller.name,
    reviewNotes: approvalNotes,
    archiveStatus: 'NOT_ARCHIVED', // Preserved as NOT_ARCHIVED per Option B until operational archiving pipeline exists
    updatedAt: now,
    revisionsHistory: [...currentReport.revisionsHistory, newHistoryEntry],
  };

  const snapshotMetadata: ApprovedSnapshotMetadata = {
    versionId: `v${currentReport.revision}`,
    reportId: currentReport.id,
    revisionNumber: currentReport.revision,
    approvedBy: caller.id,
    approvedByName: caller.name,
    approvedAt: now,
    notes: approvalNotes,
  };

  const auditEvent: WorkflowAuditEvent = {
    action: 'REPORT_APPROVED',
    actorUid: caller.id,
    actorEmail: caller.email,
    actorRole: caller.role,
    targetType: 'report',
    targetId: currentReport.id,
    timestamp: now,
    metadata: {
      weekNumber: currentReport.weekNumber,
      year: currentReport.year,
      teamId: currentReport.teamId,
      revision: currentReport.revision,
      version: nextVersion,
      reviewNotes: approvalNotes,
      snapshotVersionId: snapshotMetadata.versionId,
    },
  };

  return {
    success: true,
    nextReport,
    auditEvent,
    snapshotMetadata,
  };
}

// ==========================================
// 5. Reviewer Scope & Governance Validator
// ==========================================

function verifyReviewerScope(
  caller: WorkflowCaller,
  report: WorkflowCurrentReport
): { allowed: true } | { allowed: false; code: WorkflowErrorCode; error: string } {
  // Contributor has zero review rights
  if (caller.role === 'CONTRIBUTOR') {
    return {
      allowed: false,
      code: 'UNAUTHORIZED_ROLE',
      error: 'Akses ditolak: Peran Kontributor tidak memiliki hak akses peninjauan atau persetujuan laporan.',
    };
  }

  // Team Lead can only review reports for their assigned team
  if (caller.role === 'TEAM_LEAD') {
    if (caller.teamId !== report.teamId) {
      return {
        allowed: false,
        code: 'CROSS_TEAM_FORBIDDEN',
        error: `Akses ditolak: Team Lead hanya dapat meninjau laporan divisi sendiri (${caller.teamId}).`,
      };
    }
    return { allowed: true };
  }

  // Management, Admin, Super Admin have org-wide review rights
  if (caller.role === 'MANAGEMENT' || caller.role === 'ADMIN' || caller.role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: 'UNAUTHORIZED_ROLE',
    error: 'Akses ditolak: Peran Anda tidak memiliki izin peninjauan.',
  };
}
