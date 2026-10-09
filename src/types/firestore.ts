/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Firestore Database Collection Schemas (PRD v1.1 Section 10)
 */

import { UserRole, ReportStatus, ArchiveStatus, ReportRevisionHistory, WeeklyReportSections } from './index';

export interface FirestoreUserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  active: boolean;
  role: UserRole;
  teamId: string;
  invitedEmail: string;
  createdAt: string; // ISO String or Server Timestamp representation
  updatedAt?: string; // ISO String or Server Timestamp representation
  lastLoginAt: string; // ISO String or Server Timestamp representation
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface FirestoreInvitationDocument {
  id: string;
  normalizedEmail: string;
  role: UserRole;
  teamId: string;
  invitedBy: string; // UID of admin who created invitation
  expiresAt: string;
  status: InvitationStatus;
  createdAt: string;
  acceptedAt?: string;
  acceptedByUid?: string;
}

export interface FirestoreReportDocument {
  id: string; // Deterministic ID: rep_{year}_w{weekNumber}_{teamId}
  title: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  teamId: string;
  teamName: string;
  weekNumber: number;
  year: number;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  status: ReportStatus;
  revision: number;
  revisionsHistory: ReportRevisionHistory[];
  sections: WeeklyReportSections;
  createdAt: string; // ISO 8601 string or ServerTimestamp
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNotes?: string;
  archivedAt?: string;
  archiveStatus: ArchiveStatus;
  archiveError?: string;
  archiveDriveFileId?: string;
}

export interface FirestoreReportVersionDocument {
  versionId: string; // Document ID: v{revisionNumber}
  reportId: string;
  revisionNumber: number;
  snapshot: WeeklyReportSections;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  notes?: string;
}

export interface FirestoreAuditEventDocument {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string; // e.g., 'REPORT_CREATED', 'REPORT_SUBMITTED', 'REPORT_APPROVED'
  targetType: 'report' | 'user' | 'invitation' | 'drive';
  targetId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Safely serializes Firestore Timestamp object, Date object, or ISO string into a standard ISO 8601 string.
 * Returns undefined if input is null, undefined, or empty (prevents timestamp fabrication for optional fields).
 */
export function serializeFirestoreTimestamp(val: unknown): string | undefined {
  if (val === null || val === undefined || val === '') {
    return undefined;
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'object' && val !== null) {
    // Check if it's a Firestore Timestamp object with toDate() method
    if ('toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
      return (val as { toDate: () => Date }).toDate().toISOString();
    }
    // Check if it's a JS Date object
    if (val instanceof Date) {
      return val.toISOString();
    }
  }
  return undefined;
}
