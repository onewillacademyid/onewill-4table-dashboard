/**
 * Onewill Academy | Firebase Auth & User Registry Foundation
 * Helper abstractions for Google Sign-In and Firestore User Registry mapping.
 * Real authentication live enforcement is deferred to Checkpoint M3.2 per M3.1 plan.
 */

import { User as DomainUser, UserRole } from '@/types';
import { FirestoreUserDocument } from '@/types/firestore';

export const CANONICAL_TEAM_NAMES: Record<string, string> = {
  'team-operasional': 'Operasional & SDM',
  'team-akademik': 'Akademik & Kurikulum',
  'team-pemasaran': 'Pemasaran & Pertumbuhan',
  'team-teknologi': 'Teknologi & Produk',
  'team-executive': 'Manajemen / Executive',
};

export function getCanonicalTeamName(teamId?: string): string {
  if (!teamId) return 'General Team';
  return CANONICAL_TEAM_NAMES[teamId] || teamId;
}

/**
 * Maps a Firestore user document to the application's domain User model.
 */
export function mapFirestoreUserToDomainUser(
  doc: FirestoreUserDocument,
  teamName?: string
): DomainUser {
  const nameParts = doc.displayName.trim().split(/\s+/);
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : doc.displayName.substring(0, 2).toUpperCase() || 'OW';

  const resolvedTeamName = (teamName && teamName !== 'General Team')
    ? teamName
    : getCanonicalTeamName(doc.teamId);

  return {
    id: doc.uid,
    name: doc.displayName,
    email: doc.email,
    role: doc.role,
    teamId: doc.teamId,
    teamName: resolvedTeamName,
    avatarColor: 'bg-slate-700',
    avatarInitials: initials,
    active: doc.active,
    lastActive: doc.lastLoginAt,
  };
}

/**
 * Foundation helper for Google Sign-In popup parameters.
 * Does NOT execute live login flow automatically.
 */
export function getGoogleSignInConfig() {
  return {
    provider: 'google.com',
    scopes: ['email', 'profile'],
    customParameters: { prompt: 'select_account' },
  };
}

/**
 * Validates whether a user role has administrative access.
 * Server side verification is mandatory before granting privilege.
 */
export function isRoleAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}
