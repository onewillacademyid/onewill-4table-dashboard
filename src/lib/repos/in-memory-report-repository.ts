/**
 * Onewill Academy | Server-Only In-Memory Report Repository (Mock Adapter)
 * Strictly for automated HTTP unit/integration tests and isolated sandbox validation.
 * Guaranteed zero Firestore network operations.
 */

import { User, WeeklyReport } from '@/types';
import { FirestoreAuditEventDocument, FirestoreReportVersionDocument } from '@/types/firestore';
import {
  IWorkflowReportRepository,
  CreateReportOptions,
  ListReportsOptions,
  GetReportOptions,
  UpdateReportDraftOptions,
  SubmitReportOptions,
  ApproveReportOptions,
  RequestRevisionOptions,
  RepositoryResult,
} from './report-repository-interface';
import { CreateReportInputSchema, deriveReportDocId } from '@/lib/validation/report';
import { canCreateReport, canReadReport } from '@/lib/auth/rbac-policy';
import {
  executeWorkflowTransition,
  executeSaveDraft,
  WorkflowCaller,
  WorkflowCurrentReport,
} from '@/lib/workflow/state-machine';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Server-only mock repository imported on client side!');
}

function mapUserToWorkflowCaller(user: User): WorkflowCaller {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email,
    role: user.role,
    teamId: user.teamId,
    teamName: user.teamName,
    active: user.active !== false,
  };
}

function mapDocToWorkflowReport(reportData: WeeklyReport): WorkflowCurrentReport {
  return {
    id: reportData.id,
    title: reportData.title,
    authorId: reportData.authorId,
    authorName: reportData.authorName,
    authorEmail: reportData.authorEmail,
    teamId: reportData.teamId,
    teamName: reportData.teamName,
    weekNumber: reportData.weekNumber,
    year: reportData.year,
    weekStartDate: reportData.weekStartDate,
    weekEndDate: reportData.weekEndDate,
    status: reportData.status as any,
    revision: reportData.revision,
    version: reportData.version ?? 1,
    sections: reportData.sections,
    revisionsHistory: reportData.revisionsHistory || [],
    createdAt: reportData.createdAt,
    updatedAt: reportData.updatedAt,
    submittedAt: reportData.submittedAt,
    reviewedAt: reportData.reviewedAt,
    reviewedBy: reportData.reviewedBy,
    reviewerName: reportData.reviewerName,
    reviewNotes: reportData.reviewNotes,
    archiveStatus: reportData.archiveStatus,
    archiveError: reportData.archiveError,
    archiveDriveFileId: reportData.archiveDriveFileId,
  };
}

export class InMemoryReportRepository implements IWorkflowReportRepository {
  private reports: Map<string, WeeklyReport>;
  public auditEvents: FirestoreAuditEventDocument[];
  public versionSnapshots: Map<string, Map<string, FirestoreReportVersionDocument>>;
  public enforceWorkflowGate: boolean = false;

  constructor(initialReports: WeeklyReport[] = []) {
    this.reports = new Map();
    this.auditEvents = [];
    this.versionSnapshots = new Map();
    for (const r of initialReports) {
      this.reports.set(r.id, JSON.parse(JSON.stringify(r)));
    }
  }

  public async createReport(options: CreateReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { input, author } = options;

    if (!author || !author.id || !author.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    const rbacResult = canCreateReport(author);
    if (!rbacResult.allowed) {
      return {
        success: false,
        code: 'UNAUTHORIZED_ROLE',
        error: rbacResult.reason || 'Akses ditolak untuk membuat laporan baru.',
      };
    }

    const validation = CreateReportInputSchema.safeParse(input);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Data laporan tidak valid.';
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        error: firstError,
      };
    }

    const validData = validation.data;
    const docId = deriveReportDocId(author.teamId, validData.year, validData.weekNumber);

    // Atomic uniqueness check per team/ISO week-year
    if (this.reports.has(docId)) {
      return {
        success: false,
        code: 'REPORT_ALREADY_EXISTS',
        error: `Laporan mingguan untuk ${author.teamName || author.teamId} pada Pekan ${validData.weekNumber} tahun ${validData.year} sudah ada.`,
      };
    }

    const now = new Date().toISOString();
    const newReport: WeeklyReport = {
      id: docId,
      title: validData.title || `Laporan Mingguan ${author.teamName || author.teamId} — Pekan ${validData.weekNumber}`,
      authorId: author.id,
      authorName: author.name || author.email,
      authorEmail: author.email,
      teamId: author.teamId,
      teamName: author.teamName || author.teamId,
      weekNumber: validData.weekNumber,
      year: validData.year,
      weekStartDate: validData.weekStartDate,
      weekEndDate: validData.weekEndDate,
      status: 'DRAFT',
      revision: 1,
      revisionsHistory: [
        {
          revisionNumber: 1,
          updatedAt: now,
          updatedBy: author.id,
          updatedByName: author.name || author.email,
          action: 'CREATED',
          notes: 'Draf laporan mingguan dibuat.',
        },
      ],
      sections: validData.sections,
      createdAt: now,
      updatedAt: now,
      archiveStatus: 'NOT_ARCHIVED',
    };

    this.reports.set(docId, newReport);

    // Atomic audit event logging simulation
    this.auditEvents.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      actorUid: author.id,
      actorEmail: author.email,
      actorRole: author.role,
      action: 'REPORT_CREATED',
      targetType: 'report',
      targetId: docId,
      timestamp: now,
      metadata: {
        weekNumber: validData.weekNumber,
        year: validData.year,
        teamId: author.teamId,
      },
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newReport)),
    };
  }

  public async listReports(options: ListReportsOptions): Promise<RepositoryResult<{ reports: WeeklyReport[]; nextCursor?: string }>> {
    const { user, filters, limit = 20, cursor } = options;

    if (!user || !user.id || !user.role) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    let allReports = Array.from(this.reports.values());

    // Role-based scoping
    if (user.role === 'CONTRIBUTOR' || user.role === 'TEAM_LEAD') {
      // Allow report if it belongs to user's team OR user is the author
      allReports = allReports.filter((r) => r.teamId === user.teamId || r.authorId === user.id);
    } else if (filters?.teamId && filters.teamId !== 'ALL') {
      allReports = allReports.filter((r) => r.teamId === filters.teamId);
    }

    if (filters?.status && filters.status !== 'ALL') {
      allReports = allReports.filter((r) => r.status === filters.status);
    }

    if (filters?.weekNumber) {
      allReports = allReports.filter((r) => r.weekNumber === filters.weekNumber);
    }

    if (filters?.year) {
      allReports = allReports.filter((r) => r.year === filters.year);
    }

    // Sort by updatedAt descending
    allReports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    let startIndex = 0;
    if (cursor) {
      const idx = allReports.findIndex((r) => r.id === cursor);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const paginated = allReports.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < allReports.length ? paginated[paginated.length - 1]?.id : undefined;

    return {
      success: true,
      data: {
        reports: JSON.parse(JSON.stringify(paginated)),
        nextCursor,
      },
    };
  }

  public async getReportById(options: GetReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId } = options;

    if (!user || !user.id) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    const report = this.reports.get(reportId);
    if (!report) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
      };
    }

    const rbacResult = canReadReport(user, report);
    if (!rbacResult.allowed) {
      return {
        success: false,
        code: 'CROSS_TEAM_FORBIDDEN',
        error: rbacResult.reason || 'Akses ditolak: Anda tidak memiliki wewenang membaca laporan ini.',
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(report)),
    };
  }

  public async updateReportDraft(options: UpdateReportDraftOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId, updates, expectedVersion, expectedRevision } = options;

    if (!user || !user.id || !user.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return {
        success: false,
        code: 'MISSING_CONCURRENCY_TOKEN',
        error: 'Token konkurensi (expectedVersion) wajib disertakan sebagai bilangan bulat positif minimal 1.',
      };
    }

    if (this.enforceWorkflowGate) {
      return {
        success: false,
        code: 'MUTATION_DISABLED',
        error: 'Feature Gate: Workflow writes are disabled on the server (REPORT_WORKFLOW_WRITES_ENABLED=false).',
      };
    }

    const report = this.reports.get(reportId);
    if (!report) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
      };
    }

    const currentReport = mapDocToWorkflowReport(report);
    const caller = mapUserToWorkflowCaller(user);

    const transitionResult = executeSaveDraft({
      currentReport,
      caller,
      updates,
      expectedVersion,
      expectedRevision,
    });

    if (transitionResult.success === false) {
      return {
        success: false,
        code: transitionResult.code,
        error: transitionResult.error,
      };
    }

    const nextReport = JSON.parse(JSON.stringify(transitionResult.nextReport)) as WeeklyReport;
    this.reports.set(reportId, nextReport);

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.auditEvents.push({
      id: auditId,
      actorUid: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: transitionResult.auditEvent.action,
      targetType: 'report',
      targetId: reportId,
      timestamp: transitionResult.auditEvent.timestamp,
      metadata: transitionResult.auditEvent.metadata,
    });

    return {
      success: true,
      data: nextReport,
    };
  }

  public async submitReport(options: SubmitReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId, comments, expectedVersion, expectedRevision } = options;

    if (!user || !user.id || !user.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return {
        success: false,
        code: 'MISSING_CONCURRENCY_TOKEN',
        error: 'Token konkurensi (expectedVersion) wajib disertakan sebagai bilangan bulat positif minimal 1.',
      };
    }

    if (this.enforceWorkflowGate) {
      return {
        success: false,
        code: 'MUTATION_DISABLED',
        error: 'Feature Gate: Workflow writes are disabled on the server (REPORT_WORKFLOW_WRITES_ENABLED=false).',
      };
    }

    const report = this.reports.get(reportId);
    if (!report) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
      };
    }

    const currentReport = mapDocToWorkflowReport(report);
    const caller = mapUserToWorkflowCaller(user);

    const transitionResult = executeWorkflowTransition({
      currentReport,
      caller,
      action: 'SUBMIT',
      payload: { comments },
      expectedVersion,
      expectedRevision,
    });

    if (transitionResult.success === false) {
      return {
        success: false,
        code: transitionResult.code,
        error: transitionResult.error,
      };
    }

    const nextReport = JSON.parse(JSON.stringify(transitionResult.nextReport)) as WeeklyReport;
    this.reports.set(reportId, nextReport);

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.auditEvents.push({
      id: auditId,
      actorUid: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: transitionResult.auditEvent.action,
      targetType: 'report',
      targetId: reportId,
      timestamp: transitionResult.auditEvent.timestamp,
      metadata: transitionResult.auditEvent.metadata,
    });

    return {
      success: true,
      data: nextReport,
    };
  }

  public async requestRevision(options: RequestRevisionOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId, reviewNotes, expectedVersion, expectedRevision } = options;

    if (!user || !user.id || !user.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return {
        success: false,
        code: 'MISSING_CONCURRENCY_TOKEN',
        error: 'Token konkurensi (expectedVersion) wajib disertakan sebagai bilangan bulat positif minimal 1.',
      };
    }

    if (this.enforceWorkflowGate) {
      return {
        success: false,
        code: 'MUTATION_DISABLED',
        error: 'Feature Gate: Workflow writes are disabled on the server (REPORT_WORKFLOW_WRITES_ENABLED=false).',
      };
    }

    const report = this.reports.get(reportId);
    if (!report) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
      };
    }

    const currentReport = mapDocToWorkflowReport(report);
    const caller = mapUserToWorkflowCaller(user);

    const transitionResult = executeWorkflowTransition({
      currentReport,
      caller,
      action: 'REQUEST_REVISION',
      payload: { reviewNotes },
      expectedVersion,
      expectedRevision,
    });

    if (transitionResult.success === false) {
      return {
        success: false,
        code: transitionResult.code,
        error: transitionResult.error,
      };
    }

    const nextReport = JSON.parse(JSON.stringify(transitionResult.nextReport)) as WeeklyReport;
    this.reports.set(reportId, nextReport);

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.auditEvents.push({
      id: auditId,
      actorUid: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: transitionResult.auditEvent.action,
      targetType: 'report',
      targetId: reportId,
      timestamp: transitionResult.auditEvent.timestamp,
      metadata: transitionResult.auditEvent.metadata,
    });

    return {
      success: true,
      data: nextReport,
    };
  }

  public async approveReport(options: ApproveReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId, reviewNotes, expectedVersion, expectedRevision } = options;

    if (!user || !user.id || !user.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (typeof expectedVersion !== 'number' || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return {
        success: false,
        code: 'MISSING_CONCURRENCY_TOKEN',
        error: 'Token konkurensi (expectedVersion) wajib disertakan sebagai bilangan bulat positif minimal 1.',
      };
    }

    if (this.enforceWorkflowGate) {
      return {
        success: false,
        code: 'MUTATION_DISABLED',
        error: 'Feature Gate: Workflow writes are disabled on the server (REPORT_WORKFLOW_WRITES_ENABLED=false).',
      };
    }

    const report = this.reports.get(reportId);
    if (!report) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
      };
    }

    const currentReport = mapDocToWorkflowReport(report);
    const caller = mapUserToWorkflowCaller(user);

    const transitionResult = executeWorkflowTransition({
      currentReport,
      caller,
      action: 'APPROVE',
      payload: { reviewNotes },
      expectedVersion,
      expectedRevision,
    });

    if (transitionResult.success === false) {
      return {
        success: false,
        code: transitionResult.code,
        error: transitionResult.error,
      };
    }

    // Immutable snapshot handling: do not overwrite existing snapshot
    if (transitionResult.snapshotMetadata) {
      const snapshotMeta = transitionResult.snapshotMetadata;
      if (!this.versionSnapshots.has(reportId)) {
        this.versionSnapshots.set(reportId, new Map());
      }
      const reportSnapshots = this.versionSnapshots.get(reportId)!;
      if (reportSnapshots.has(snapshotMeta.versionId)) {
        return {
          success: false,
          code: 'SNAPSHOT_ALREADY_EXISTS',
          error: `Snapshot versi ${snapshotMeta.versionId} sudah ada dan tidak boleh ditimpa.`,
        };
      }

      const versionDoc: FirestoreReportVersionDocument = {
        versionId: snapshotMeta.versionId,
        reportId,
        revisionNumber: snapshotMeta.revisionNumber,
        snapshot: transitionResult.nextReport.sections,
        approvedBy: snapshotMeta.approvedBy,
        approvedByName: snapshotMeta.approvedByName,
        approvedAt: snapshotMeta.approvedAt,
        notes: snapshotMeta.notes,
      };
      reportSnapshots.set(snapshotMeta.versionId, versionDoc);
    }

    const nextReport = JSON.parse(JSON.stringify(transitionResult.nextReport)) as WeeklyReport;
    this.reports.set(reportId, nextReport);

    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.auditEvents.push({
      id: auditId,
      actorUid: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: transitionResult.auditEvent.action,
      targetType: 'report',
      targetId: reportId,
      timestamp: transitionResult.auditEvent.timestamp,
      metadata: transitionResult.auditEvent.metadata,
    });

    return {
      success: true,
      data: nextReport,
    };
  }
}
