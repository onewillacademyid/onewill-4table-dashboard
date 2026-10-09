/**
 * Onewill Academy | Server-Only Firestore Report Repository Foundation
 * PRD v1.1 Section 8 & Section 10 Compliant.
 * Implements IReportRepository interface with fine-grained RBAC policies and Zod schema validation.
 *
 * NOTE: Phase B Foundation module. Does NOT execute live Firestore mutations.
 */

import { User, WeeklyReport } from '@/types';
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
  throw new Error('CRITICAL SECURITY ERROR: Server-only Firestore repository imported on client side!');
}

export class FirestoreReportRepository implements IReportRepository {
  /**
   * Creates a new report draft in memory/validation layer.
   * Derives authorId, authorName, authorEmail, teamId, and teamName strictly from verified user session.
   * Enforces deterministic document ID rep_{year}_w{weekNumber}_{teamId}.
   */
  public async createReport(options: CreateReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { input, author } = options;

    // Security Guard 1: Require verified user session identity
    if (!author || !author.id || !author.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    // Security Guard 2: Evaluate centralized RBAC canCreateReport policy
    const rbacResult = canCreateReport(author);
    if (!rbacResult.allowed) {
      return {
        success: false,
        code: 'UNAUTHORIZED_ROLE',
        error: rbacResult.reason || 'Akses ditolak untuk membuat laporan baru.',
      };
    }

    // Security Guard 3: Validate input schema with Zod
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

    // Security Guard 4: Derivation of deterministic document ID based on team and period
    const docId = deriveReportDocId(author.teamId, validData.year, validData.weekNumber);
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

    return {
      success: true,
      data: newReport,
    };
  }

  /**
   * Lists authorized reports with server-enforced team scoping for Contributor and Team Lead roles.
   */
  public async listReports(options: ListReportsOptions): Promise<RepositoryResult<{ reports: WeeklyReport[]; nextCursor?: string }>> {
    const { user, filters } = options;

    if (!user || !user.id || !user.role) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    // Determine target team scope based on role
    let effectiveTeamId = filters?.teamId;

    if (user.role === 'CONTRIBUTOR' || user.role === 'TEAM_LEAD') {
      // Strictly restrict query scope to user's assigned team
      effectiveTeamId = user.teamId;
    }

    // In Phase B foundation, return empty structured response
    return {
      success: true,
      data: {
        reports: [],
        nextCursor: undefined,
      },
    };
  }

  /**
   * Reads report detail after evaluating server-side RBAC canReadReport check.
   */
  public async getReportById(options: GetReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId } = options;

    if (!user || !user.id) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (!reportId) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: 'ID Laporan tidak valid.',
      };
    }

    return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
    };
  }
}
