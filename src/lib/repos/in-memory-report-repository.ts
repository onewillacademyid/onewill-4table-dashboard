/**
 * Onewill Academy | Server-Only In-Memory Report Repository (Mock Adapter)
 * Strictly for automated HTTP unit/integration tests and isolated sandbox validation.
 * Guaranteed zero Firestore network operations.
 */

import { User, WeeklyReport } from '@/types';
import { FirestoreAuditEventDocument } from '@/types/firestore';
import {
  IReportRepository,
  CreateReportOptions,
  ListReportsOptions,
  GetReportOptions,
  RepositoryResult,
} from './report-repository-interface';
import { CreateReportInputSchema, deriveReportDocId } from '@/lib/validation/report';
import { canCreateReport, canReadReport } from '@/lib/auth/rbac-policy';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Server-only mock repository imported on client side!');
}

export class InMemoryReportRepository implements IReportRepository {
  private reports: Map<string, WeeklyReport>;
  public auditEvents: FirestoreAuditEventDocument[];

  constructor(initialReports: WeeklyReport[] = []) {
    this.reports = new Map();
    this.auditEvents = [];
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
}
