/**
 * Onewill Academy | Server-Only Report Repository Interface & Result Contracts
 * Strictly server-side interface for M4.1-C Firestore repository operations.
 */

import { User, WeeklyReport, ReportFilterCriteria } from '@/types';
import { CreateReportInput } from '@/lib/validation/report';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Server-only repository interface imported on client side!');
}

export type RepositoryErrorCode =
  | 'UNAUTHENTICATED'
  | 'CROSS_TEAM_FORBIDDEN'
  | 'UNAUTHORIZED_ROLE'
  | 'REPORT_NOT_FOUND'
  | 'REPORT_ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'MUTATION_DISABLED'
  | 'INTERNAL_ERROR';

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: RepositoryErrorCode;
}

export interface CreateReportOptions {
  input: CreateReportInput;
  author: User; // Verified user identity from server session (Required)
}

export interface ListReportsOptions {
  user: User; // Verified user identity from server session (Required)
  filters?: ReportFilterCriteria;
  limit?: number;
  cursor?: string;
}

export interface GetReportOptions {
  user: User; // Verified user identity from server session (Required)
  reportId: string;
}

export interface IReportRepository {
  /**
   * Creates a new report draft.
   * Derives author and team metadata strictly from the verified author profile.
   * Uses deterministic document ID rep_{year}_w{weekNumber}_{teamId} to prevent duplicate reports per team/week.
   */
  createReport(options: CreateReportOptions): Promise<RepositoryResult<WeeklyReport>>;

  /**
   * Lists authorized reports.
   * Automatically applies RBAC team scoping constraints for Contributor and Team Lead roles.
   */
  listReports(options: ListReportsOptions): Promise<RepositoryResult<{ reports: WeeklyReport[]; nextCursor?: string }>>;

  /**
   * Reads detail of an authorized report.
   * Evaluates server-side RBAC canReadReport check before returning report payload.
   */
  getReportById(options: GetReportOptions): Promise<RepositoryResult<WeeklyReport>>;
}
