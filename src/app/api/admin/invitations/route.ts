/**
 * POST /api/admin/invitations
 * Secure Route Handler for creating user invitations in Firestore.
 * Requires verified ADMIN or SUPER_ADMIN session, CSRF origin check, Zod input validation,
 * RBAC role capability verification, duplicate checks, and atomic audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyApiServerUser } from '@/lib/auth/rbac-server';
import { validateCsrfOrigin } from '@/lib/auth/server-auth';
import { CreateInvitationSchema } from '@/lib/auth/rbac-schemas';
import { canInviteUser } from '@/lib/auth/rbac-policy';
import { FirestoreInvitationDocument } from '@/types/firestore';
import { DEMO_TEAMS } from '@/services/reportRepository';

export async function POST(request: NextRequest) {
  // 1. Session & Role Verification
  const { user: caller, errorResponse } = await verifyApiServerUser(['ADMIN', 'SUPER_ADMIN']);
  if (errorResponse) {
    return errorResponse;
  }

  // 2. CSRF / Origin Validation
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan ditolak: Asal permintaan (Origin/Referer) tidak terverifikasi.', code: 'CSRF_REJECTED' },
      { status: 403 }
    );
  }

  // 3. Body Parsing & Zod Validation
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

  // 4. RBAC Permission Check (e.g. Admin cannot invite Super Admin)
  const inviteDecision = canInviteUser(caller!, targetRole);
  if (!inviteDecision.allowed) {
    return NextResponse.json(
      { error: inviteDecision.reason || 'Anda tidak memiliki hak akses untuk membuat undangan peran ini.', code: inviteDecision.code },
      { status: 403 }
    );
  }

  // 5. Verify Team Exists
  const teamExists = DEMO_TEAMS.some((t) => t.id === teamId);
  if (!teamExists && teamId !== 'team-executive') {
    return NextResponse.json(
      { error: 'Divisi yang dipilih tidak ditemukan dalam sistem.', code: 'INVALID_TEAM' },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiration

  try {
    // 6. Atomic Firestore Transaction for Duplicate Checks & Invitation Creation + Audit Event
    const result = await db.runTransaction(async (transaction) => {
      // Check A: Duplicate active user in `users` collection
      const existingUserQuery = db.collection('users').where('email', '==', normalizedEmail).limit(1);
      const existingUserSnap = await transaction.get(existingUserQuery);

      if (!existingUserSnap.empty) {
        return {
          success: false,
          status: 400,
          error: `Pengguna dengan surel ${normalizedEmail} sudah terdaftar dan aktif dalam database.`,
          code: 'USER_ALREADY_EXISTS',
        };
      }

      // Check B: Duplicate pending invitation in `invitations` collection
      const existingInvQuery = db
        .collection('invitations')
        .where('normalizedEmail', '==', normalizedEmail)
        .where('status', '==', 'PENDING')
        .limit(1);
      const existingInvSnap = await transaction.get(existingInvQuery);

      if (!existingInvSnap.empty) {
        return {
          success: false,
          status: 400,
          error: `Undangan akses aktif untuk ${normalizedEmail} sudah ada dan belum digunakan.`,
          code: 'PENDING_INVITATION_EXISTS',
        };
      }

      // Create new invitation document
      const invitationRef = db.collection('invitations').doc();
      const invitationDoc: FirestoreInvitationDocument = {
        id: invitationRef.id,
        normalizedEmail,
        role: targetRole,
        teamId,
        invitedBy: caller!.id,
        expiresAt,
        status: 'PENDING',
        createdAt: now,
      };

      transaction.set(invitationRef, invitationDoc);

      // Record Audit Event in `audit_events` in the SAME transaction
      const auditRef = db.collection('audit_events').doc();
      const auditDoc = {
        eventId: auditRef.id,
        actorUid: caller!.id,
        actorEmail: caller!.email,
        actorRole: caller!.role,
        action: 'USER_INVITATION_CREATED',
        target: normalizedEmail,
        timestamp: now,
        metadata: {
          invitationId: invitationRef.id,
          role: targetRole,
          teamId,
          expiresAt,
        },
      };

      transaction.set(auditRef, auditDoc);

      return {
        success: true,
        invitation: invitationDoc,
      };
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { success: true, invitation: result.invitation },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Failed to create invitation:', err);
    return NextResponse.json(
      { error: 'Gagal membuat undangan pengguna di database.', details: err.message },
      { status: 500 }
    );
  }
}
