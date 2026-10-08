/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Firestore Database Collection Schemas (PRD v1.1 Section 10)
 */

import { UserRole } from './index';

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
