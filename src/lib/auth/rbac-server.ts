/**
 * Onewill Academy | Server-Only Authorization Helpers
 * Strictly server-side execution ('server-only').
 * Operates on verified server-session user records, never client-supplied role parameters.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyServerSession } from '@/lib/auth/server-auth';
import { User, UserRole } from '@/types';
import { 
  canReadReport, 
  canEditReport, 
  canApproveReport, 
  canInviteUser, 
  canManageUserAccount, 
  canManageDriveIntegration, 
  canViewAuditEvents 
} from '@/lib/auth/rbac-policy';

// Strict runtime safeguard against client-side bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Server RBAC helpers imported on client side!');
}

/**
 * Retrieves and verifies active server-session user.
 * Throws error or redirects unauthenticated sessions.
 */
export async function getVerifiedServerUser(): Promise<User> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value || '';

  const authResult = await verifyServerSession(sessionCookie);
  if (!authResult.authenticated || !authResult.user) {
    redirect('/login');
  }

  if (!authResult.user.active) {
    redirect('/login');
  }

  return authResult.user;
}

/**
 * Asserts that the authenticated server user has one of the allowed roles.
 */
export async function assertServerRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await getVerifiedServerUser();
  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }
  return user;
}

/**
 * Asserts that the server user can read a specific report.
 */
export async function assertReportReadPermission(report: { authorId: string; teamId: string; status: string }): Promise<User> {
  const user = await getVerifiedServerUser();
  const decision = canReadReport(user, report);
  if (!decision.allowed) {
    throw new Error(decision.reason || 'Akses ditolak.');
  }
  return user;
}

/**
 * Asserts that the server user can approve a specific report.
 */
export async function assertReportApprovalPermission(report: { id: string; authorId: string; teamId: string; status: string }): Promise<User> {
  const user = await getVerifiedServerUser();
  const decision = canApproveReport(user, report);
  if (!decision.allowed) {
    throw new Error(decision.reason || 'Akses ditolak.');
  }
  return user;
}

/**
 * Asserts that the server user can issue invitations for a target role.
 */
export async function assertInvitationPermission(targetRole: UserRole): Promise<User> {
  const user = await getVerifiedServerUser();
  const decision = canInviteUser(user, targetRole);
  if (!decision.allowed) {
    throw new Error(decision.reason || 'Akses ditolak.');
  }
  return user;
}

/**
 * Asserts that the server user can manage Google Drive integration.
 */
export async function assertDriveManagementPermission(): Promise<User> {
  const user = await getVerifiedServerUser();
  const decision = canManageDriveIntegration(user);
  if (!decision.allowed) {
    throw new Error(decision.reason || 'Akses ditolak.');
  }
  return user;
}
