/**
 * Onewill Academy | Non-Mutating Unit Tests for RBAC Permission Decisions
 * 
 * Verifies permission rules, negative security scenarios, and boundary conditions.
 * Run via CLI: bun run scripts/test-rbac-policy.ts
 */

import { User, UserRole } from '../src/types';
import { 
  canViewDashboardOrgWide, 
  canReadReport, 
  canCreateReport, 
  canEditReport, 
  canApproveReport, 
  canInviteUser, 
  canManageUserAccount, 
  canManageDriveIntegration, 
  canViewAuditEvents 
} from '../src/lib/auth/rbac-policy';
import { CreateInvitationSchema, UpdateUserSchema } from '../src/lib/auth/rbac-schemas';

function createMockUser(id: string, role: UserRole, teamId: string = 'team-1', active: boolean = true): User {
  return {
    id,
    name: `Test User ${id}`,
    email: `${id}@onewillacademy.id`,
    role,
    teamId,
    teamName: `Team ${teamId}`,
    avatarColor: '#6C2AA6',
    avatarInitials: 'TU',
    active,
    lastActive: 'Now',
  };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${failureDetail || 'Assertion failed'}`);
    failedCount++;
  }
}

function runRbacUnitTests() {
  console.log('--------------------------------------------------');
  console.log('Onewill Academy — RBAC Permission Unit Test Suite');
  console.log('--------------------------------------------------');

  const superAdmin = createMockUser('superadmin-1', 'SUPER_ADMIN', 'team-executive');
  const admin = createMockUser('admin-1', 'ADMIN', 'team-[#]');
  const management = createMockUser('mgmt-1', 'MANAGEMENT', 'team-[#]');
  const teamLeadA = createMockUser('lead-a', 'TEAM_LEAD', 'team-A');
  const teamLeadB = createMockUser('lead-b', 'TEAM_LEAD', 'team-B');
  const contributorA = createMockUser('contrib-a', 'CONTRIBUTOR', 'team-A');
  const contributorB = createMockUser('contrib-b', 'CONTRIBUTOR', 'team-B');

  // 1. Dashboard Access Tests
  console.log('\n[1] Dashboard Scope Permissions:');
  assert(canViewDashboardOrgWide('SUPER_ADMIN') === true, 'Super Admin views org-wide dashboard');
  assert(canViewDashboardOrgWide('ADMIN') === true, 'Admin views org-wide dashboard');
  assert(canViewDashboardOrgWide('MANAGEMENT') === true, 'Management views org-wide dashboard');
  assert(canViewDashboardOrgWide('TEAM_LEAD') === false, 'Team Lead denied org-wide dashboard');
  assert(canViewDashboardOrgWide('CONTRIBUTOR') === false, 'Contributor denied org-wide dashboard');

  // 2. Report Reading Tests
  console.log('\n[2] Report Reading & Scope Restrictions:');
  const reportTeamA = { id: 'rep-1', authorId: 'contrib-a', teamId: 'team-A', status: 'SUBMITTED' };
  assert(canReadReport(superAdmin, reportTeamA).allowed === true, 'Super Admin can read Team A report');
  assert(canReadReport(contributorA, reportTeamA).allowed === true, 'Contributor A can read own team report');
  assert(canReadReport(contributorB, reportTeamA).allowed === false, 'Contributor B denied cross-team read');

  // 3. Report Approval & Segregasi Tugas Tests
  console.log('\n[3] Approval Workflow & Segregasi Tugas (No Self-Approval):');
  const reportByLeadA = { id: 'rep-2', authorId: 'lead-a', teamId: 'team-A', status: 'SUBMITTED' };
  
  // Negative Test 1: Self-Approval Rejection
  const selfApprovalRes = canApproveReport(teamLeadA, reportByLeadA);
  assert(selfApprovalRes.allowed === false && selfApprovalRes.code === 'SELF_APPROVAL_PROHIBITED', 
    'Team Lead A denied self-approval of own report');

  // Negative Test 2: Cross-Team Approval Rejection
  const reportByContribA = { id: 'rep-3', authorId: 'contrib-a', teamId: 'team-A', status: 'SUBMITTED' };
  const crossTeamRes = canApproveReport(teamLeadB, reportByContribA);
  assert(crossTeamRes.allowed === false && crossTeamRes.code === 'CROSS_TEAM_FORBIDDEN', 
    'Team Lead B denied approving report of Team A');

  // Positive Test: Team Lead A approving Contributor A's report
  assert(canApproveReport(teamLeadA, reportByContribA).allowed === true, 
    'Team Lead A can approve Contributor A report in same team');

  // Negative Test: Contributor trying to approve
  assert(canApproveReport(contributorA, reportByContribA).allowed === false, 
    'Contributor denied report approval');

  // 4. User Invitation Permissions
  console.log('\n[4] Invitation Authorization & Role Restrictions:');
  assert(canInviteUser(superAdmin, 'SUPER_ADMIN').allowed === true, 'Super Admin can invite Super Admin');
  assert(canInviteUser(admin, 'CONTRIBUTOR').allowed === true, 'Admin can invite Contributor');
  
  // Negative Test 3: Admin inviting Super Admin
  const adminInviteSuperRes = canInviteUser(admin, 'SUPER_ADMIN');
  assert(adminInviteSuperRes.allowed === false && adminInviteSuperRes.code === 'SUPER_ADMIN_REQUIRED', 
    'Admin denied inviting Super Admin');

  assert(canInviteUser(teamLeadA, 'CONTRIBUTOR').allowed === false, 'Team Lead denied inviting users');

  // 5. User Account Management Safeguards
  console.log('\n[5] User Account Management Safeguards:');
  
  // Negative Test 4: Self-Deactivation Rejection
  const selfDeactivateRes = canManageUserAccount(admin, { uid: admin.id, role: 'ADMIN', active: true }, { newActiveState: false });
  assert(selfDeactivateRes.allowed === false && selfDeactivateRes.code === 'SELF_MODIFICATION_PROHIBITED', 
    'Admin denied self-deactivation');

  // Negative Test 5: Self-Role Modification Rejection
  const selfRoleRes = canManageUserAccount(admin, { uid: admin.id, role: 'ADMIN', active: true }, { newRole: 'SUPER_ADMIN' });
  assert(selfRoleRes.allowed === false && selfRoleRes.code === 'SELF_MODIFICATION_PROHIBITED', 
    'Admin denied self-promotion to Super Admin');

  // Negative Test 6: Admin modifying Super Admin
  const adminModSuperRes = canManageUserAccount(admin, { uid: superAdmin.id, role: 'SUPER_ADMIN', active: true }, { newActiveState: false });
  assert(adminModSuperRes.allowed === false && adminModSuperRes.code === 'SUPER_ADMIN_REQUIRED', 
    'Admin denied modifying Super Admin account');

  // Negative Test 7: Deactivating Last Super Admin Lock
  const deactLastSuperRes = canManageUserAccount(superAdmin, { uid: 'other-super', role: 'SUPER_ADMIN', active: true }, { newActiveState: false }, 1);
  assert(deactLastSuperRes.allowed === false && deactLastSuperRes.code === 'LAST_SUPER_ADMIN_LOCK', 
    'Super Admin denied deactivating last active Super Admin');

  // Positive Test: Super Admin deactivating non-last Super Admin when active count = 2
  assert(canManageUserAccount(superAdmin, { uid: 'other-super', role: 'SUPER_ADMIN', active: true }, { newActiveState: false }, 2).allowed === true, 
    'Super Admin can deactivate other Super Admin when active count >= 2');

  // 6. Drive Integration & Audit Access
  console.log('\n[6] System & Drive Integration Rights:');
  assert(canManageDriveIntegration(superAdmin).allowed === true, 'Super Admin manages Drive integration');
  assert(canManageDriveIntegration(admin).allowed === false, 'Admin denied Drive integration');
  assert(canViewAuditEvents(superAdmin).allowed === true, 'Super Admin views audit events');
  assert(canViewAuditEvents(admin).allowed === true, 'Admin views audit events');
  assert(canViewAuditEvents(management).allowed === false, 'Management denied audit events');

  // 7. Zod Schema Validation
  console.log('\n[7] Zod Input Schema Validation:');
  const validInvite = CreateInvitationSchema.safeParse({
    email: ' NEW.USER@OnewillAcademy.ID ',
    role: 'TEAM_LEAD',
    teamId: 'team-teknologi',
  });
  assert(validInvite.success === true && validInvite.data?.email === 'new.user@onewillacademy.id', 
    'Zod Invitation Schema normalizes email & accepts valid input');

  const invalidInvite = CreateInvitationSchema.safeParse({
    email: 'not-an-email',
    role: 'INVALID_ROLE',
    teamId: '',
  });
  assert(invalidInvite.success === false, 'Zod Invitation Schema rejects invalid input');

  console.log('--------------------------------------------------');
  console.log(`Unit Test Execution Summary: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log('--------------------------------------------------');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRbacUnitTests();
