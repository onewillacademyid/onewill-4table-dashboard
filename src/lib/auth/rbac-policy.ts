/**
 * Onewill Academy | Centralized Typed RBAC Permission Policy
 * PRD v1.1 Section 3 Compliant.
 * Evaluates fine-grained authorization rules across the 5 PRD roles:
 * - SUPER_ADMIN
 * - ADMIN
 * - MANAGEMENT
 * - TEAM_LEAD
 * - CONTRIBUTOR
 */

import { UserRole, User, WeeklyReport } from '@/types';
import { FirestoreUserDocument } from '@/types/firestore';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  code?: 
    | 'UNAUTHORIZED_ROLE' 
    | 'SELF_APPROVAL_PROHIBITED' 
    | 'CROSS_TEAM_FORBIDDEN' 
    | 'SELF_MODIFICATION_PROHIBITED' 
    | 'SUPER_ADMIN_REQUIRED' 
    | 'LAST_SUPER_ADMIN_LOCK';
}

/**
 * Evaluates whether live Admin mutations (invitations, role updates, deactivation)
 * are enabled on the server via ADMIN_MUTATIONS_ENABLED environment variable.
 * Disabled by default (false). Cannot be enabled by query params, localStorage, or client state.
 */
export function isAdminMutationEnabled(): boolean {
  return process.env.ADMIN_MUTATIONS_ENABLED === 'true';
}

/**
 * Evaluates whether a user can access org-wide dashboard metrics or team-restricted metrics.
 */
export function canViewDashboardOrgWide(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGEMENT';
}

/**
 * Evaluates whether a user can read a given report based on role and team ownership.
 */
export function canReadReport(user: User, report: { authorId: string; teamId: string; status: string }): AuthorizationResult {
  // Super Admin, Admin, and Management can read all reports across the organization
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGEMENT') {
    return { allowed: true };
  }

  // Team Lead and Contributor can read reports belonging to their own team
  if (report.teamId === user.teamId) {
    return { allowed: true };
  }

  // Author can always read their own report
  if (report.authorId === user.id) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: 'CROSS_TEAM_FORBIDDEN',
    reason: 'Akses ditolak: Anda hanya dapat membaca laporan divisi Anda sendiri.',
  };
}

/**
 * Evaluates whether a user can create a new report.
 * All active roles can create reports for their assigned team.
 */
export function canCreateReport(user: User): AuthorizationResult {
  if (!user.active) {
    return {
      allowed: false,
      code: 'UNAUTHORIZED_ROLE',
      reason: 'Akses ditolak: Akun Anda dalam status tidak aktif.',
    };
  }
  return { allowed: true };
}

/**
 * Evaluates whether a user can edit a report draft or a report needing revision.
 */
export function canEditReport(user: User, report: { authorId: string; status: string }): AuthorizationResult {
  // Super Admin can edit any non-archived report if necessary
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  // Only the original author can edit their own draft or report needing revision
  if (report.authorId === user.id) {
    if (report.status === 'DRAFT' || report.status === 'NEEDS_REVISION') {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: 'UNAUTHORIZED_ROLE',
      reason: 'Laporan yang telah diajukan atau disetujui bersifat permanen dan tidak dapat diubah.',
    };
  }

  return {
    allowed: false,
    code: 'UNAUTHORIZED_ROLE',
    reason: 'Akses ditolak: Hanya penulis asli yang diperbolehkan mengubah laporan ini.',
  };
}

/**
 * Evaluates whether a user can approve or request revision for a report.
 * Strict Governance Rules:
 * 1. Segregasi Tugas (No Self-Approval): Author CANNOT approve their own report.
 * 2. Team Lead Scope Lock: Team Leads can ONLY approve reports for their assigned team.
 * 3. Contributor Restrictions: Contributors have NO approval rights.
 */
export function canApproveReport(
  user: User, 
  report: { id: string; authorId: string; teamId: string; status: string }
): AuthorizationResult {
  // Rule 1: No Self-Approval (Prinsip Segregasi Tugas)
  if (report.authorId === user.id) {
    return {
      allowed: false,
      code: 'SELF_APPROVAL_PROHIBITED',
      reason: 'Prinsip Segregasi Tugas: Penulis laporan tidak dapat menyetujui laporannya sendiri.',
    };
  }

  // Report must be in SUBMITTED state to be approved
  if (report.status !== 'SUBMITTED') {
    return {
      allowed: false,
      code: 'UNAUTHORIZED_ROLE',
      reason: 'Hanya laporan dengan status Menunggu Tinjauan (SUBMITTED) yang dapat ditinjau.',
    };
  }

  // Rule 2: Super Admin, Admin, and Management can approve any team's report
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MANAGEMENT') {
    return { allowed: true };
  }

  // Rule 3: Team Lead can ONLY approve reports for their own team
  if (user.role === 'TEAM_LEAD') {
    if (report.teamId === user.teamId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: 'CROSS_TEAM_FORBIDDEN',
      reason: 'Akses ditolak: Team Lead hanya dapat menyetujui laporan divisi sendiri.',
    };
  }

  // Contributors have no approval rights
  return {
    allowed: false,
    code: 'UNAUTHORIZED_ROLE',
    reason: 'Akses ditolak: Peran Kontributor tidak memiliki hak akses persetujuan laporan.',
  };
}

/**
 * Evaluates whether a caller can issue an invitation for a target role.
 * Rule: Only Super Admin can issue Super Admin invitations. Admin can issue non-Super-Admin invitations.
 */
export function canInviteUser(caller: User, targetRole: UserRole): AuthorizationResult {
  if (caller.role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  if (caller.role === 'ADMIN') {
    if (targetRole === 'SUPER_ADMIN') {
      return {
        allowed: false,
        code: 'SUPER_ADMIN_REQUIRED',
        reason: 'Akses ditolak: Hanya Super Admin yang dapat membuat undangan Super Admin baru.',
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    code: 'UNAUTHORIZED_ROLE',
    reason: 'Akses ditolak: Hanya Admin dan Super Admin yang dapat mengundang pengguna baru.',
  };
}

/**
 * Evaluates whether a caller can modify another user's role or status.
 * Strict Safeguard Rules:
 * 1. Reject Self-Role Modification: Users cannot change their own role.
 * 2. Reject Self-Deactivation: Users cannot deactivate their own account.
 * 3. Super Admin Role Protection: Only Super Admin can assign or edit Super Admin role.
 * 4. Last Active Super Admin Protection: Cannot deactivate or demote the last active Super Admin.
 */
export function canManageUserAccount(
  caller: User,
  targetUser: { uid: string; role: UserRole; active: boolean },
  updates: { newRole?: UserRole; newActiveState?: boolean },
  activeSuperAdminCount: number = 1
): AuthorizationResult {
  // Safeguard 1: Reject Self-Deactivation
  if (caller.id === targetUser.uid && updates.newActiveState === false) {
    return {
      allowed: false,
      code: 'SELF_MODIFICATION_PROHIBITED',
      reason: 'Tindakan ditolak: Anda tidak dapat menonaktifkan akun Anda sendiri.',
    };
  }

  // Safeguard 2: Reject Self-Role Modification
  if (caller.id === targetUser.uid && updates.newRole && updates.newRole !== targetUser.role) {
    return {
      allowed: false,
      code: 'SELF_MODIFICATION_PROHIBITED',
      reason: 'Tindakan ditolak: Anda tidak dapat mengubah peran (role) Anda sendiri.',
    };
  }

  // Safeguard 3: Super Admin Privilege Boundary
  const isTargetSuperAdmin = targetUser.role === 'SUPER_ADMIN';
  const isAssigningSuperAdmin = updates.newRole === 'SUPER_ADMIN';

  if ((isTargetSuperAdmin || isAssigningSuperAdmin) && caller.role !== 'SUPER_ADMIN') {
    return {
      allowed: false,
      code: 'SUPER_ADMIN_REQUIRED',
      reason: 'Akses ditolak: Membutuhkan hak akses Super Admin untuk mengelola akun Super Admin.',
    };
  }

  // Safeguard 4: Last Active Super Admin Preservation
  if (isTargetSuperAdmin) {
    const isDeactivating = updates.newActiveState === false;
    const isDemoting = updates.newRole && updates.newRole !== 'SUPER_ADMIN';

    if ((isDeactivating || isDemoting) && activeSuperAdminCount <= 1) {
      return {
        allowed: false,
        code: 'LAST_SUPER_ADMIN_LOCK',
        reason: 'Tindakan ditolak: Tidak dapat menonaktifkan atau menurunkan peran Super Admin terakhir dalam sistem.',
      };
    }
  }

  // Admins can manage non-Super-Admin accounts
  if (caller.role === 'SUPER_ADMIN' || caller.role === 'ADMIN') {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: 'UNAUTHORIZED_ROLE',
    reason: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengelola akun pengguna.',
  };
}

/**
 * Evaluates whether a user can manage Google Drive OAuth integration.
 * Super Admin ONLY.
 */
export function canManageDriveIntegration(user: User): AuthorizationResult {
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true };
  }
  return {
    allowed: false,
    code: 'SUPER_ADMIN_REQUIRED',
    reason: 'Akses ditolak: Integrasi Google Drive hanya dapat dikelola oleh Super Admin.',
  };
}

/**
 * Evaluates whether a user can view system audit logs.
 * Super Admin and Admin ONLY.
 */
export function canViewAuditEvents(user: User): AuthorizationResult {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    return { allowed: true };
  }
  return {
    allowed: false,
    code: 'UNAUTHORIZED_ROLE',
    reason: 'Akses ditolak: Log audit sistem hanya dapat diakses oleh Admin dan Super Admin.',
  };
}
