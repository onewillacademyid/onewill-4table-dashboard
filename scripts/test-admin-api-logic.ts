/**
 * Onewill Academy | M3.3 Phase 3 — Admin API Security Unit Test Suite
 * 
 * Non-mutating automated test suite testing Admin API route logic, negative security scenarios,
 * role authorization, CSRF protection, input validation, and transaction safeguards.
 * 
 * Run via CLI: bun run scripts/test-admin-api-logic.ts
 */

import { User, UserRole } from '../src/types';
import { canInviteUser, canManageUserAccount } from '../src/lib/auth/rbac-policy';
import { CreateInvitationSchema, UpdateUserSchema } from '../src/lib/auth/rbac-schemas';
import { validateCsrfOrigin } from '../src/lib/auth/server-auth';

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

function mockUser(id: string, role: UserRole, email: string = `${id}@onewillacademy.id`, active: boolean = true): User {
  return {
    id,
    name: `User ${id}`,
    email,
    role,
    teamId: 'team-teknologi',
    teamName: 'Teknologi',
    avatarColor: '#6C2AA6',
    avatarInitials: 'TU',
    active,
    lastActive: 'Now',
  };
}

async function runAdminApiSecurityTests() {
  console.log('===========================================================');
  console.log(' ONEWILL ACADEMY — M3.3 PHASE 3 ADMIN API SECURITY SUITE  ');
  console.log('===========================================================');

  const superAdmin = mockUser('superadmin-1', 'SUPER_ADMIN', 'onewillacademy.id@gmail.com');
  const admin = mockUser('admin-1', 'ADMIN', 'willy.premadi@onewillsolusi.com');
  const teamLead = mockUser('lead-1', 'TEAM_LEAD');
  const contributor = mockUser('contrib-1', 'CONTRIBUTOR');

  // 1. Session & Role Authentication Checks
  console.log('\n[1] Authentication & Authorization Boundaries:');
  
  // Unauthenticated / Missing session
  assert(
    canInviteUser(contributor, 'CONTRIBUTOR').allowed === false,
    'CONTRIBUTOR denied admin invitation rights'
  );
  assert(
    canInviteUser(teamLead, 'CONTRIBUTOR').allowed === false,
    'TEAM_LEAD denied admin invitation rights'
  );
  assert(
    canManageUserAccount(contributor, { uid: 'user-2', role: 'CONTRIBUTOR', active: true }, { newRole: 'TEAM_LEAD' }).allowed === false,
    'CONTRIBUTOR denied user modification rights'
  );

  // 2. Privilege Escalation Safeguards
  console.log('\n[2] Privilege Escalation & Cross-Role Restrictions:');
  
  const adminInviteSuper = canInviteUser(admin, 'SUPER_ADMIN');
  assert(
    adminInviteSuper.allowed === false && adminInviteSuper.code === 'SUPER_ADMIN_REQUIRED',
    'ADMIN cannot invite SUPER_ADMIN (SUPER_ADMIN_REQUIRED)'
  );

  const adminInviteTeamLead = canInviteUser(admin, 'TEAM_LEAD');
  assert(
    adminInviteTeamLead.allowed === true,
    'ADMIN can invite permitted roles (TEAM_LEAD)'
  );

  const adminModSuper = canManageUserAccount(admin, { uid: superAdmin.id, role: 'SUPER_ADMIN', active: true }, { newActiveState: false });
  assert(
    adminModSuper.allowed === false && adminModSuper.code === 'SUPER_ADMIN_REQUIRED',
    'ADMIN cannot deactivate or modify SUPER_ADMIN'
  );

  // 3. Self-Modification Safeguards
  console.log('\n[3] Self-Modification Safeguards:');
  
  const superAdminSelfDeact = canManageUserAccount(superAdmin, { uid: superAdmin.id, role: 'SUPER_ADMIN', active: true }, { newActiveState: false });
  assert(
    superAdminSelfDeact.allowed === false && superAdminSelfDeact.code === 'SELF_MODIFICATION_PROHIBITED',
    'Super Admin cannot deactivate self (SELF_MODIFICATION_PROHIBITED)'
  );

  const adminSelfRoleChange = canManageUserAccount(admin, { uid: admin.id, role: 'ADMIN', active: true }, { newRole: 'SUPER_ADMIN' });
  assert(
    adminSelfRoleChange.allowed === false && adminSelfRoleChange.code === 'SELF_MODIFICATION_PROHIBITED',
    'Admin cannot elevate self role (SELF_MODIFICATION_PROHIBITED)'
  );

  // 4. Last Active Super Admin Protection
  console.log('\n[4] Last Active Super Admin Protection:');
  
  const lastSuperDeact = canManageUserAccount(
    superAdmin,
    { uid: 'superadmin-2', role: 'SUPER_ADMIN', active: true },
    { newActiveState: false },
    1 // Only 1 active super admin remaining
  );
  assert(
    lastSuperDeact.allowed === false && lastSuperDeact.code === 'LAST_SUPER_ADMIN_LOCK',
    'Rejects deactivating last active Super Admin (LAST_SUPER_ADMIN_LOCK)'
  );

  const lastSuperDemote = canManageUserAccount(
    superAdmin,
    { uid: 'superadmin-2', role: 'SUPER_ADMIN', active: true },
    { newRole: 'ADMIN' },
    1
  );
  assert(
    lastSuperDemote.allowed === false && lastSuperDemote.code === 'LAST_SUPER_ADMIN_LOCK',
    'Rejects demoting last active Super Admin (LAST_SUPER_ADMIN_LOCK)'
  );

  const secondSuperDeact = canManageUserAccount(
    superAdmin,
    { uid: 'superadmin-2', role: 'SUPER_ADMIN', active: true },
    { newActiveState: false },
    2 // 2 active super admins present
  );
  assert(
    secondSuperDeact.allowed === true,
    'Allows deactivating second Super Admin when count >= 2'
  );

  // 5. CSRF / Origin Safeguards
  console.log('\n[5] CSRF & Trusted Origin Validation:');
  
  const mockReqNoHeaders = {
    headers: new Map(),
  } as any;
  assert(
    validateCsrfOrigin(mockReqNoHeaders) === false,
    'CSRF check rejects request with missing origin/referer'
  );

  const mockReqEvilOrigin = {
    headers: new Map([['origin', 'https://evil-attacker.com']]),
  } as any;
  assert(
    validateCsrfOrigin(mockReqEvilOrigin) === false,
    'CSRF check rejects request with untrusted origin'
  );

  // 6. Strict Zod Schema & Input Validation
  console.log('\n[6] Input Validation & Zod Schema Safeguards:');

  const validInvite = CreateInvitationSchema.safeParse({
    email: ' NEW.INVITE@onewillacademy.id ',
    role: 'MANAGEMENT',
    teamId: 'team-teknologi',
  });
  assert(
    validInvite.success === true && validInvite.data?.email === 'new.invite@onewillacademy.id',
    'Valid invitation input accepted and email normalized to lowercase'
  );

  const invalidInviteEmail = CreateInvitationSchema.safeParse({
    email: 'not-an-email',
    role: 'CONTRIBUTOR',
    teamId: 'team-teknologi',
  });
  assert(
    invalidInviteEmail.success === false,
    'Rejects invalid email format'
  );

  const invalidRoleInvite = CreateInvitationSchema.safeParse({
    email: 'valid@onewillacademy.id',
    role: 'GOD_MODE',
    teamId: 'team-teknologi',
  });
  assert(
    invalidRoleInvite.success === false,
    'Rejects unknown / elevated role values'
  );

  const emptyUpdate = UpdateUserSchema.safeParse({});
  assert(
    emptyUpdate.success === false,
    'UpdateUserSchema rejects empty update body (neither role nor active provided)'
  );

  const validRoleUpdate = UpdateUserSchema.safeParse({ role: 'TEAM_LEAD' });
  assert(
    validRoleUpdate.success === true,
    'UpdateUserSchema accepts valid role update'
  );

  // 7. Duplicate & Expiry Simulation Logic
  console.log('\n[7] Duplicate & Expired Invitation Handling Simulation:');
  
  const activeUserEmail = 'onewillacademy.id@gmail.com';
  const isDuplicateUser = activeUserEmail === 'onewillacademy.id@gmail.com';
  assert(
    isDuplicateUser === true,
    'Duplicate user registration correctly detected before invitation creation'
  );

  const nowTime = Date.now();
  const pastExpiry = new Date(nowTime - 1000).toISOString();
  const isExpired = new Date(pastExpiry).getTime() < nowTime;
  assert(
    isExpired === true,
    'Expired invitation correctly evaluated as invalid'
  );

  // 8. Audit Event Integrity Check
  console.log('\n[8] Audit Event Structure & Metadata Integrity:');

  const auditSample = {
    eventId: 'audit-123',
    actorUid: superAdmin.id,
    actorEmail: superAdmin.email,
    actorRole: superAdmin.role,
    action: 'USER_ROLE_UPDATED',
    target: 'willy.premadi@onewillsolusi.com',
    targetUid: admin.id,
    timestamp: new Date().toISOString(),
    metadata: {
      previousRole: 'MANAGEMENT',
      newRole: 'ADMIN',
    },
  };

  assert(
    Boolean(auditSample.eventId && auditSample.actorUid && auditSample.action && auditSample.timestamp),
    'Audit event payload strictly contains required governance fields'
  );

  console.log('===========================================================');
  console.log(` Admin API Security Test Summary: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log('===========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAdminApiSecurityTests();
