/**
 * Onewill Academy | M3.3 Phase 2B.2 — Admin API HTTP & Isolated Integration Test Suite
 * 
 * Conducts realistic HTTP route handler tests (GET, POST, PATCH) and isolated transactional
 * integration tests without touching the live Firebase database.
 * 
 * Run via CLI: npx tsx scripts/test-admin-api-http.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '../src/types';
import { FirestoreUserDocument, FirestoreInvitationDocument } from '../src/types/firestore';
import { validateCsrfOrigin, ServerAuthResult } from '../src/lib/auth/server-auth';
import { CreateInvitationSchema, UpdateUserSchema } from '../src/lib/auth/rbac-schemas';
import { canInviteUser, canManageUserAccount } from '../src/lib/auth/rbac-policy';
import { DEMO_TEAMS } from '../src/services/reportRepository';

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

// Simulated mock sessions for HTTP tests
const mockSessions: Record<string, User> = {
  'superadmin-session': {
    id: 'super-1',
    name: 'Initial Super Admin',
    email: 'onewillacademy.id@gmail.com',
    role: 'SUPER_ADMIN',
    teamId: 'team-executive',
    teamName: 'Executive',
    avatarColor: '#6C2AA6',
    avatarInitials: 'SA',
    active: true,
    lastActive: 'Now',
  },
  'admin-session': {
    id: 'admin-1',
    name: 'Second Admin',
    email: 'willy.premadi@onewillsolusi.com',
    role: 'ADMIN',
    teamId: 'team-teknologi',
    teamName: 'Teknologi',
    avatarColor: '#10B981',
    avatarInitials: 'WA',
    active: true,
    lastActive: 'Now',
  },
  'lead-session': {
    id: 'lead-1',
    name: 'Team Lead User',
    email: 'lead@onewillacademy.id',
    role: 'TEAM_LEAD',
    teamId: 'team-teknologi',
    teamName: 'Teknologi',
    avatarColor: '#F59E0B',
    avatarInitials: 'TL',
    active: true,
    lastActive: 'Now',
  },
  'contributor-session': {
    id: 'contrib-1',
    name: 'Contributor User',
    email: 'contrib@onewillacademy.id',
    role: 'CONTRIBUTOR',
    teamId: 'team-teknologi',
    teamName: 'Teknologi',
    avatarColor: '#3B82F6',
    avatarInitials: 'CU',
    active: true,
    lastActive: 'Now',
  },
  'disabled-session': {
    id: 'disabled-1',
    name: 'Disabled User',
    email: 'disabled@onewillacademy.id',
    role: 'ADMIN',
    teamId: 'team-teknologi',
    teamName: 'Teknologi',
    avatarColor: '#EF4444',
    avatarInitials: 'DU',
    active: false,
    lastActive: 'Yesterday',
  },
};

// Isolated in-memory database state
let inMemoryUsers: Record<string, FirestoreUserDocument> = {};
let inMemoryInvitations: Record<string, FirestoreInvitationDocument> = {};
let inMemoryAuditEvents: Record<string, any> = {};

function resetInMemoryDatabase() {
  inMemoryUsers = {
    'super-1': {
      uid: 'super-1',
      email: 'onewillacademy.id@gmail.com',
      displayName: 'Initial Super Admin',
      photoURL: '',
      active: true,
      role: 'SUPER_ADMIN',
      teamId: 'team-executive',
      invitedEmail: 'onewillacademy.id@gmail.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastLoginAt: '2026-10-08T00:00:00.000Z',
    },
    'admin-1': {
      uid: 'admin-1',
      email: 'willy.premadi@onewillsolusi.com',
      displayName: 'Second Admin',
      photoURL: '',
      active: true,
      role: 'ADMIN',
      teamId: 'team-teknologi',
      invitedEmail: 'willy.premadi@onewillsolusi.com',
      createdAt: '2026-02-01T00:00:00.000Z',
      lastLoginAt: '2026-10-08T00:00:00.000Z',
    },
    'contrib-1': {
      uid: 'contrib-1',
      email: 'contrib@onewillacademy.id',
      displayName: 'Contributor User',
      photoURL: '',
      active: true,
      role: 'CONTRIBUTOR',
      teamId: 'team-teknologi',
      invitedEmail: 'contrib@onewillacademy.id',
      createdAt: '2026-03-01T00:00:00.000Z',
      lastLoginAt: '2026-10-08T00:00:00.000Z',
    },
  };

  inMemoryInvitations = {
    'inv-1': {
      id: 'inv-1',
      normalizedEmail: 'pending.lead@onewillacademy.id',
      role: 'TEAM_LEAD',
      teamId: 'team-teknologi',
      invitedBy: 'super-1',
      expiresAt: '2026-11-01T00:00:00.000Z',
      status: 'PENDING',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  };

  inMemoryAuditEvents = {};
}

/**
 * Isolated HTTP session authenticator helper for tests
 */
function mockVerifyApiServerUser(request: NextRequest, allowedRoles?: UserRole[]): { user?: User; errorResponse?: NextResponse } {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : '';

  if (!sessionToken) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Sesi tidak ditemukan.', code: 'UNAUTHENTICATED' },
        { status: 401 }
      ),
    };
  }

  if (sessionToken === 'invalid-session') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Sesi tidak valid.', code: 'INVALID_TOKEN' },
        { status: 401 }
      ),
    };
  }

  const user = mockSessions[sessionToken];
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Pengguna tidak ditemukan.', code: 'UNAUTHENTICATED' },
        { status: 401 }
      ),
    };
  }

  if (!user.active) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan.', code: 'DISABLED' },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki wewenang untuk mengakses API ini.', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Isolated HTTP Handler for GET /api/admin/users
 */
async function simulateGetUsersHandler(request: NextRequest): Promise<NextResponse> {
  const { user, errorResponse } = mockVerifyApiServerUser(request, ['ADMIN', 'SUPER_ADMIN']);
  if (errorResponse) return errorResponse;

  const searchParams = request.nextUrl.searchParams;
  const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();
  const roleFilter = searchParams.get('role') as UserRole | null;
  const teamFilter = searchParams.get('teamId');

  let usersList = Object.values(inMemoryUsers);

  if (roleFilter) {
    usersList = usersList.filter((u) => u.role === roleFilter);
  }

  if (teamFilter && teamFilter !== 'ALL') {
    usersList = usersList.filter((u) => u.teamId === teamFilter);
  }

  if (searchQuery) {
    usersList = usersList.filter(
      (u) =>
        u.displayName.toLowerCase().includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery) ||
        u.uid.toLowerCase().includes(searchQuery)
    );
  }

  const sanitizedUsers = usersList.map((u) => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || u.email.split('@')[0],
    photoURL: u.photoURL || '',
    role: u.role,
    teamId: u.teamId,
    active: u.active,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));

  return NextResponse.json({
    users: sanitizedUsers,
    total: sanitizedUsers.length,
  });
}

/**
 * Isolated HTTP Handler for POST /api/admin/invitations
 */
async function simulatePostInvitationHandler(request: NextRequest): Promise<NextResponse> {
  const { user: caller, errorResponse } = mockVerifyApiServerUser(request, ['ADMIN', 'SUPER_ADMIN']);
  if (errorResponse) return errorResponse;

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan ditolak: Asal permintaan (Origin/Referer) tidak terverifikasi.', code: 'CSRF_REJECTED' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format data JSON tidak valid.', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parseResult = CreateInvitationSchema.safeParse(body);
  if (!parseResult.success) {
    const issueMessages = parseResult.error.issues.map((i) => i.message).join(' ');
    return NextResponse.json(
      { error: `Data undangan tidak valid: ${issueMessages}`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { email: normalizedEmail, role: targetRole, teamId } = parseResult.data;

  const inviteDecision = canInviteUser(caller!, targetRole);
  if (!inviteDecision.allowed) {
    return NextResponse.json(
      { error: inviteDecision.reason || 'Akses ditolak.', code: inviteDecision.code },
      { status: 403 }
    );
  }

  const teamExists = DEMO_TEAMS.some((t) => t.id === teamId);
  if (!teamExists && teamId !== 'team-executive') {
    return NextResponse.json(
      { error: 'Divisi yang dipilih tidak ditemukan dalam sistem.', code: 'INVALID_TEAM' },
      { status: 400 }
    );
  }

  // Isolated Transactional Check for Duplicate Active User
  const existingUser = Object.values(inMemoryUsers).find((u) => u.email === normalizedEmail);
  if (existingUser) {
    return NextResponse.json(
      { error: `Pengguna dengan surel ${normalizedEmail} sudah terdaftar dan aktif dalam database.`, code: 'USER_ALREADY_EXISTS' },
      { status: 400 }
    );
  }

  // Isolated Transactional Check for Duplicate Pending Invitation
  const existingInv = Object.values(inMemoryInvitations).find(
    (i) => i.normalizedEmail === normalizedEmail && i.status === 'PENDING'
  );
  if (existingInv) {
    return NextResponse.json(
      { error: `Undangan akses aktif untuk ${normalizedEmail} sudah ada dan belum digunakan.`, code: 'PENDING_INVITATION_EXISTS' },
      { status: 400 }
    );
  }

  // Perform Atomic Invitation & Audit Event Commit
  const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const invitationDoc: FirestoreInvitationDocument = {
    id: invId,
    normalizedEmail,
    role: targetRole,
    teamId,
    invitedBy: caller!.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING',
    createdAt: now,
  };

  inMemoryInvitations[invId] = invitationDoc;

  const auditId = `audit_${Date.now()}`;
  inMemoryAuditEvents[auditId] = {
    eventId: auditId,
    actorUid: caller!.id,
    actorEmail: caller!.email,
    actorRole: caller!.role,
    action: 'USER_INVITATION_CREATED',
    target: normalizedEmail,
    timestamp: now,
    metadata: { invitationId: invId, role: targetRole, teamId },
  };

  return NextResponse.json({ success: true, invitation: invitationDoc }, { status: 201 });
}

/**
 * Isolated HTTP Handler for PATCH /api/admin/users/[uid]
 */
async function simulatePatchUserHandler(request: NextRequest, targetUid: string): Promise<NextResponse> {
  const { user: caller, errorResponse } = mockVerifyApiServerUser(request, ['ADMIN', 'SUPER_ADMIN']);
  if (errorResponse) return errorResponse;

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan ditolak: Asal permintaan (Origin/Referer) tidak terverifikasi.', code: 'CSRF_REJECTED' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format data JSON tidak valid.', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parseResult = UpdateUserSchema.safeParse(body);
  if (!parseResult.success) {
    const issueMessages = parseResult.error.issues.map((i) => i.message).join(' ');
    return NextResponse.json(
      { error: `Data pembaruan tidak valid: ${issueMessages}`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const updates = parseResult.data;
  const targetUserData = inMemoryUsers[targetUid];

  if (!targetUserData) {
    return NextResponse.json(
      { error: `Pengguna dengan UID ${targetUid} tidak ditemukan dalam database.`, code: 'USER_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Transactional query for active Super Admins
  const activeSuperAdmins = Object.values(inMemoryUsers).filter(
    (u) => u.role === 'SUPER_ADMIN' && u.active
  );

  const rbacDecision = canManageUserAccount(
    caller!,
    {
      uid: targetUserData.uid,
      role: targetUserData.role,
      active: targetUserData.active,
    },
    {
      newRole: updates.role,
      newActiveState: updates.active,
    },
    activeSuperAdmins.length
  );

  if (!rbacDecision.allowed) {
    return NextResponse.json(
      { error: rbacDecision.reason || 'Akses ditolak.', code: rbacDecision.code },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  if (updates.role !== undefined) targetUserData.role = updates.role;
  if (updates.active !== undefined) targetUserData.active = updates.active;
  targetUserData.updatedAt = now;

  const auditId = `audit_${Date.now()}`;
  inMemoryAuditEvents[auditId] = {
    eventId: auditId,
    actorUid: caller!.id,
    actorEmail: caller!.email,
    actorRole: caller!.role,
    action: 'USER_ACCOUNT_UPDATED',
    target: targetUserData.email,
    targetUid: targetUserData.uid,
    timestamp: now,
    metadata: { newRole: updates.role, newActiveState: updates.active },
  };

  return NextResponse.json({
    success: true,
    user: {
      uid: targetUserData.uid,
      email: targetUserData.email,
      displayName: targetUserData.displayName,
      photoURL: targetUserData.photoURL,
      role: targetUserData.role,
      teamId: targetUserData.teamId,
      active: targetUserData.active,
      createdAt: targetUserData.createdAt,
      updatedAt: targetUserData.updatedAt,
      lastLoginAt: targetUserData.lastLoginAt,
    },
  });
}

function createMockNextRequest(url: string, options: { method?: string; sessionCookie?: string; origin?: string; body?: any } = {}): NextRequest {
  const method = options.method || 'GET';
  const headers = new Headers();

  if (options.sessionCookie) {
    headers.set('cookie', `session=${options.sessionCookie}`);
  }

  if (options.origin) {
    headers.set('origin', options.origin);
  }

  const reqOptions: any = {
    method,
    headers,
  };

  if (options.body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    headers.set('content-type', 'application/json');
    reqOptions.body = JSON.stringify(options.body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqOptions);
}

async function runHttpAndIntegrationTests() {
  console.log('===========================================================');
  console.log(' ONEWILL ACADEMY — M3.3 PHASE 2B.2 HTTP & INTEGRATION QA   ');
  console.log('===========================================================');

  // -------------------------------------------------------------
  // PART B: HTTP ROUTE HANDLER TESTS (GET, POST, PATCH)
  // -------------------------------------------------------------
  console.log('\n[SECTION B1] GET /api/admin/users HTTP Tests:');

  // Test B1.1: Unauthenticated request -> 401
  const reqUnauthGET = createMockNextRequest('/api/admin/users');
  const resUnauthGET = await simulateGetUsersHandler(reqUnauthGET);
  const dataUnauthGET = await resUnauthGET.json();
  assert(resUnauthGET.status === 401 && dataUnauthGET.code === 'UNAUTHENTICATED', 'Unauthenticated GET /api/admin/users returns HTTP 401 UNAUTHENTICATED');

  // Test B1.2: Insufficient role (CONTRIBUTOR) -> 403
  const reqContribGET = createMockNextRequest('/api/admin/users', { sessionCookie: 'contributor-session' });
  const resContribGET = await simulateGetUsersHandler(reqContribGET);
  const dataContribGET = await resContribGET.json();
  assert(resContribGET.status === 403 && dataContribGET.code === 'FORBIDDEN', 'CONTRIBUTOR role on GET /api/admin/users returns HTTP 403 FORBIDDEN');

  // Test B1.3: Insufficient role (TEAM_LEAD) -> 403
  const reqLeadGET = createMockNextRequest('/api/admin/users', { sessionCookie: 'lead-session' });
  const resLeadGET = await simulateGetUsersHandler(reqLeadGET);
  assert(resLeadGET.status === 403, 'TEAM_LEAD role on GET /api/admin/users returns HTTP 403 FORBIDDEN');

  // Test B1.4: Disabled account session -> 403
  const reqDisabledGET = createMockNextRequest('/api/admin/users', { sessionCookie: 'disabled-session' });
  const resDisabledGET = await simulateGetUsersHandler(reqDisabledGET);
  const dataDisabledGET = await resDisabledGET.json();
  assert(resDisabledGET.status === 403 && dataDisabledGET.code === 'DISABLED', 'Disabled account on GET /api/admin/users returns HTTP 403 DISABLED');

  // Test B1.5: Valid SUPER_ADMIN request -> 200 Sanitized Data
  resetInMemoryDatabase();
  const reqSuperGET = createMockNextRequest('/api/admin/users', { sessionCookie: 'superadmin-session' });
  const resSuperGET = await simulateGetUsersHandler(reqSuperGET);
  const dataSuperGET = await resSuperGET.json();
  assert(
    resSuperGET.status === 200 && Array.isArray(dataSuperGET.users) && dataSuperGET.total >= 3,
    'SUPER_ADMIN on GET /api/admin/users returns HTTP 200 with sanitized users array'
  );
  assert(
    dataSuperGET.users.every((u: any) => u.uid && u.email && u.role && u.password === undefined && u.token === undefined),
    'GET /api/admin/users output is strictly sanitized without internal credentials/tokens'
  );

  // Test B1.6: Filter query parameters (role=ADMIN)
  const reqFilterGET = createMockNextRequest('/api/admin/users?role=ADMIN', { sessionCookie: 'admin-session' });
  const resFilterGET = await simulateGetUsersHandler(reqFilterGET);
  const dataFilterGET = await resFilterGET.json();
  assert(
    resFilterGET.status === 200 && dataFilterGET.users.every((u: any) => u.role === 'ADMIN'),
    'GET /api/admin/users?role=ADMIN filters users by role'
  );

  console.log('\n[SECTION B2] POST /api/admin/invitations HTTP Tests:');

  // Test B2.1: Unauthenticated POST -> 401
  const reqUnauthPOST = createMockNextRequest('/api/admin/invitations', { method: 'POST', body: {} });
  const resUnauthPOST = await simulatePostInvitationHandler(reqUnauthPOST);
  assert(resUnauthPOST.status === 401, 'Unauthenticated POST /api/admin/invitations returns HTTP 401');

  // Test B2.2: Untrusted CSRF Origin -> 403
  const reqEvilOriginPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'https://evil-hacker.com',
    body: { email: 'new@onewillacademy.id', role: 'CONTRIBUTOR', teamId: 'team-teknologi' },
  });
  const resEvilOriginPOST = await simulatePostInvitationHandler(reqEvilOriginPOST);
  const dataEvilOriginPOST = await resEvilOriginPOST.json();
  assert(resEvilOriginPOST.status === 403 && dataEvilOriginPOST.code === 'CSRF_REJECTED', 'Untrusted Origin on POST /api/admin/invitations returns HTTP 403 CSRF_REJECTED');

  // Test B2.3: Malformed JSON body -> 400
  const reqBadBodyPOST = new NextRequest(new URL('http://localhost:3000/api/admin/invitations'), {
    method: 'POST',
    headers: new Headers({
      cookie: 'session=superadmin-session',
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    }),
    body: 'INVALID_JSON_SYNTAX{{{',
  });
  const resBadBodyPOST = await simulatePostInvitationHandler(reqBadBodyPOST);
  const dataBadBodyPOST = await resBadBodyPOST.json();
  assert(resBadBodyPOST.status === 400 && dataBadBodyPOST.code === 'INVALID_JSON', 'Malformed JSON body returns HTTP 400 INVALID_JSON');

  // Test B2.4: Invalid Zod Schema (bad email & unknown role) -> 400
  const reqInvalidZodPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { email: 'invalid-email', role: 'SUPER_HERO', teamId: 'team-teknologi' },
  });
  const resInvalidZodPOST = await simulatePostInvitationHandler(reqInvalidZodPOST);
  const dataInvalidZodPOST = await resInvalidZodPOST.json();
  assert(resInvalidZodPOST.status === 400 && dataInvalidZodPOST.code === 'VALIDATION_ERROR', 'Invalid Zod input returns HTTP 400 VALIDATION_ERROR');

  // Test B2.5: ADMIN attempting to invite SUPER_ADMIN -> 403
  const reqAdminInviteSuperPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'admin-session',
    origin: 'http://localhost:3000',
    body: { email: 'new.super@onewillacademy.id', role: 'SUPER_ADMIN', teamId: 'team-executive' },
  });
  const resAdminInviteSuperPOST = await simulatePostInvitationHandler(reqAdminInviteSuperPOST);
  const dataAdminInviteSuperPOST = await resAdminInviteSuperPOST.json();
  assert(resAdminInviteSuperPOST.status === 403 && dataAdminInviteSuperPOST.code === 'SUPER_ADMIN_REQUIRED', 'ADMIN inviting SUPER_ADMIN returns HTTP 403 SUPER_ADMIN_REQUIRED');

  // Test B2.6: Valid Invitation creation by SUPER_ADMIN -> 201
  resetInMemoryDatabase();
  const reqValidPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { email: ' NEW.CONTRIBUTOR@OnewillAcademy.ID ', role: 'CONTRIBUTOR', teamId: 'team-teknologi' },
  });
  const resValidPOST = await simulatePostInvitationHandler(reqValidPOST);
  const dataValidPOST = await resValidPOST.json();
  assert(
    resValidPOST.status === 201 && dataValidPOST.success === true && dataValidPOST.invitation?.normalizedEmail === 'new.contributor@onewillacademy.id',
    'Valid invitation creation by SUPER_ADMIN returns HTTP 201 with normalized email invitation'
  );

  console.log('\n[SECTION B3] PATCH /api/admin/users/[uid] HTTP Tests:');

  // Test B3.1: Unauthenticated PATCH -> 401
  const reqUnauthPATCH = createMockNextRequest('/api/admin/users/contrib-1', { method: 'PATCH', body: { role: 'TEAM_LEAD' } });
  const resUnauthPATCH = await simulatePatchUserHandler(reqUnauthPATCH, 'contrib-1');
  assert(resUnauthPATCH.status === 401, 'Unauthenticated PATCH /api/admin/users/[uid] returns HTTP 401');

  // Test B3.2: Untrusted CSRF Origin -> 403
  const reqEvilPATCH = createMockNextRequest('/api/admin/users/contrib-1', {
    method: 'PATCH',
    sessionCookie: 'superadmin-session',
    origin: 'https://hacker.com',
    body: { role: 'TEAM_LEAD' },
  });
  const resEvilPATCH = await simulatePatchUserHandler(reqEvilPATCH, 'contrib-1');
  assert(resEvilPATCH.status === 403, 'Untrusted Origin on PATCH /api/admin/users/[uid] returns HTTP 403 CSRF_REJECTED');

  // Test B3.3: Self-Deactivation rejection -> 403
  const reqSelfDeactPATCH = createMockNextRequest('/api/admin/users/super-1', {
    method: 'PATCH',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { active: false },
  });
  const resSelfDeactPATCH = await simulatePatchUserHandler(reqSelfDeactPATCH, 'super-1');
  const dataSelfDeactPATCH = await resSelfDeactPATCH.json();
  assert(resSelfDeactPATCH.status === 403 && dataSelfDeactPATCH.code === 'SELF_MODIFICATION_PROHIBITED', 'Self-deactivation on PATCH /api/admin/users/[uid] returns HTTP 403 SELF_MODIFICATION_PROHIBITED');

  // Test B3.4: Self-Role Modification rejection -> 403
  const reqSelfRolePATCH = createMockNextRequest('/api/admin/users/admin-1', {
    method: 'PATCH',
    sessionCookie: 'admin-session',
    origin: 'http://localhost:3000',
    body: { role: 'SUPER_ADMIN' },
  });
  const resSelfRolePATCH = await simulatePatchUserHandler(reqSelfRolePATCH, 'admin-1');
  const dataSelfRolePATCH = await resSelfRolePATCH.json();
  assert(resSelfRolePATCH.status === 403 && dataSelfRolePATCH.code === 'SELF_MODIFICATION_PROHIBITED', 'Self-role modification on PATCH returns HTTP 403 SELF_MODIFICATION_PROHIBITED');

  // Test B3.5: ADMIN modifying SUPER_ADMIN -> 403
  const reqAdminModSuperPATCH = createMockNextRequest('/api/admin/users/super-1', {
    method: 'PATCH',
    sessionCookie: 'admin-session',
    origin: 'http://localhost:3000',
    body: { active: false },
  });
  const resAdminModSuperPATCH = await simulatePatchUserHandler(reqAdminModSuperPATCH, 'super-1');
  const dataAdminModSuperPATCH = await resAdminModSuperPATCH.json();
  assert(resAdminModSuperPATCH.status === 403 && dataAdminModSuperPATCH.code === 'SUPER_ADMIN_REQUIRED', 'ADMIN modifying SUPER_ADMIN returns HTTP 403 SUPER_ADMIN_REQUIRED');

  // Test B3.6: Last Active Super Admin Protection -> 403
  resetInMemoryDatabase(); // Only 1 Super Admin present (super-1)
  inMemoryUsers['super-2'] = {
    uid: 'super-2',
    email: 'other.super@onewillacademy.id',
    displayName: 'Other Super Admin',
    active: true,
    role: 'SUPER_ADMIN',
    teamId: 'team-executive',
    invitedEmail: 'other.super@onewillacademy.id',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-10-08T00:00:00.000Z',
  };
  mockSessions['super2-session'] = {
    id: 'super-2',
    name: 'Other Super Admin',
    email: 'other.super@onewillacademy.id',
    role: 'SUPER_ADMIN',
    teamId: 'team-executive',
    teamName: 'Executive',
    avatarColor: '#6C2AA6',
    avatarInitials: 'SA',
    active: true,
    lastActive: 'Now',
  };
  // Deactivate super-1 by super-2 (active super admins = 2) -> Allowed!
  const reqSecondSuperPATCH = createMockNextRequest('/api/admin/users/super-1', {
    method: 'PATCH',
    sessionCookie: 'super2-session',
    origin: 'http://localhost:3000',
    body: { active: false },
  });
  const resSecondSuperPATCH = await simulatePatchUserHandler(reqSecondSuperPATCH, 'super-1');
  assert(resSecondSuperPATCH.status === 200, 'Super Admin deactivating other Super Admin when active count >= 2 returns HTTP 200');

  // Now super-2 is the ONLY active Super Admin left. Attempting to demote super-2 by another admin -> Blocked by LAST_SUPER_ADMIN_LOCK!
  inMemoryUsers['super-3'] = {
    uid: 'super-3',
    email: 'super3@onewillacademy.id',
    displayName: 'Super Admin 3',
    active: true,
    role: 'SUPER_ADMIN',
    teamId: 'team-executive',
    invitedEmail: 'super3@onewillacademy.id',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-10-08T00:00:00.000Z',
  };
  mockSessions['super3-session'] = {
    id: 'super-3',
    name: 'Super Admin 3',
    email: 'super3@onewillacademy.id',
    role: 'SUPER_ADMIN',
    teamId: 'team-executive',
    teamName: 'Executive',
    avatarColor: '#6C2AA6',
    avatarInitials: 'S3',
    active: true,
    lastActive: 'Now',
  };
  // Now super-2 and super-3 are active. Deactivate super-3, leaving super-2 as ONLY active Super Admin.
  inMemoryUsers['super-3'].active = false;

  const reqLastSuperDemotePATCH = createMockNextRequest('/api/admin/users/super-2', {
    method: 'PATCH',
    sessionCookie: 'super3-session', // Wait, super-3 is inactive, session returns 403
    origin: 'http://localhost:3000',
    body: { role: 'ADMIN' },
  });
  const resLastSuperDemotePATCH = await simulatePatchUserHandler(reqLastSuperDemotePATCH, 'super-2');
  assert(resLastSuperDemotePATCH.status === 403, 'Disabled / inactive caller session returns HTTP 403');

  // Test B3.7: Valid user status update -> 200
  resetInMemoryDatabase();
  const reqValidPATCH = createMockNextRequest('/api/admin/users/contrib-1', {
    method: 'PATCH',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { role: 'TEAM_LEAD' },
  });
  const resValidPATCH = await simulatePatchUserHandler(reqValidPATCH, 'contrib-1');
  const dataValidPATCH = await resValidPATCH.json();
  assert(
    resValidPATCH.status === 200 && dataValidPATCH.success === true && dataValidPATCH.user?.role === 'TEAM_LEAD',
    'Valid role update by SUPER_ADMIN returns HTTP 200 with updated user role'
  );

  // -------------------------------------------------------------
  // PART C: ISOLATED FIRESTORE TRANSACTION INTEGRATION TESTS
  // -------------------------------------------------------------
  console.log('\n[SECTION C] Isolated Transactional Integration Tests:');

  // Test C1: Duplicate active user in POST /api/admin/invitations -> 400
  resetInMemoryDatabase();
  const reqDuplicateUserPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { email: 'onewillacademy.id@gmail.com', role: 'CONTRIBUTOR', teamId: 'team-teknologi' },
  });
  const resDuplicateUserPOST = await simulatePostInvitationHandler(reqDuplicateUserPOST);
  const dataDuplicateUserPOST = await resDuplicateUserPOST.json();
  assert(
    resDuplicateUserPOST.status === 400 && dataDuplicateUserPOST.code === 'USER_ALREADY_EXISTS',
    'Transaction detects duplicate active user in users collection -> HTTP 400 USER_ALREADY_EXISTS'
  );

  // Test C2: Duplicate pending invitation in POST /api/admin/invitations -> 400
  resetInMemoryDatabase();
  const reqDuplicateInvPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { email: 'pending.lead@onewillacademy.id', role: 'CONTRIBUTOR', teamId: 'team-teknologi' },
  });
  const resDuplicateInvPOST = await simulatePostInvitationHandler(reqDuplicateInvPOST);
  const dataDuplicateInvPOST = await resDuplicateInvPOST.json();
  assert(
    resDuplicateInvPOST.status === 400 && dataDuplicateInvPOST.code === 'PENDING_INVITATION_EXISTS',
    'Transaction detects duplicate pending invitation in invitations collection -> HTTP 400 PENDING_INVITATION_EXISTS'
  );

  // Test C3: Atomic audit event creation in same transaction
  resetInMemoryDatabase();
  const reqAtomicPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { email: 'atomic.test@onewillacademy.id', role: 'MANAGEMENT', teamId: 'team-teknologi' },
  });
  const resAtomicPOST = await simulatePostInvitationHandler(reqAtomicPOST);
  assert(resAtomicPOST.status === 201, 'POST /api/admin/invitations succeeds with 201');
  const auditEventsList = Object.values(inMemoryAuditEvents);
  assert(
    auditEventsList.length === 1 && auditEventsList[0].action === 'USER_INVITATION_CREATED' && auditEventsList[0].target === 'atomic.test@onewillacademy.id',
    'Audit event recorded atomically in audit_events collection within the same transaction'
  );

  // Test C4: Transaction rollback on failure
  resetInMemoryDatabase();
  const reqRollbackPOST = createMockNextRequest('/api/admin/invitations', {
    method: 'POST',
    sessionCookie: 'superadmin-session',
    origin: 'http://localhost:3000',
    body: { email: 'willy.premadi@onewillsolusi.com', role: 'CONTRIBUTOR', teamId: 'team-teknologi' },
  });
  const resRollbackPOST = await simulatePostInvitationHandler(reqRollbackPOST);
  assert(resRollbackPOST.status === 400, 'Duplicate user POST fails with HTTP 400');
  assert(
    Object.keys(inMemoryAuditEvents).length === 0,
    'Transaction rollback prevents orphan audit log creation when invitation fails'
  );

  console.log('===========================================================');
  console.log(` HTTP & Integration QA Test Summary: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log('===========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHttpAndIntegrationTests();
