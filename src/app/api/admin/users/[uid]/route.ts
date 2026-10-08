/**
 * PATCH /api/admin/users/[uid]
 * Secure Route Handler for updating user role and active status in Firestore.
 * Requires verified ADMIN or SUPER_ADMIN session, CSRF origin check, Zod input validation,
 * RBAC safeguard checks (self-edit block, ADMIN vs SUPER_ADMIN block, last active SUPER_ADMIN lock),
 * concurrency-safe Firestore transactions, and atomic audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyApiServerUser } from '@/lib/auth/rbac-server';
import { validateCsrfOrigin } from '@/lib/auth/server-auth';
import { UpdateUserSchema } from '@/lib/auth/rbac-schemas';
import { canManageUserAccount } from '@/lib/auth/rbac-policy';
import { FirestoreUserDocument } from '@/types/firestore';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> | { uid: string } }
) {
  // Extract route parameters
  const rawParams = await context.params;
  const targetUid = rawParams?.uid;

  if (!targetUid) {
    return NextResponse.json(
      { error: 'ID Pengguna (UID) tidak ditemukan dalam parameter Rute.', code: 'MISSING_UID' },
      { status: 400 }
    );
  }

  // 1. Session & Role Verification (Identity strictly derived from HttpOnly cookie)
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

  const parseResult = UpdateUserSchema.safeParse(body);
  if (!parseResult.success) {
    const issueMessages = parseResult.error.issues.map((i) => i.message).join(' ');
    return NextResponse.json(
      { error: `Data pembaruan tidak valid: ${issueMessages}`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const updates = parseResult.data;
  const db = getAdminDb();
  const now = new Date().toISOString();

  try {
    // 4. Concurrency-Safe Firestore Transaction
    const result = await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(targetUid);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) {
        return {
          success: false,
          status: 404,
          error: `Pengguna dengan UID ${targetUid} tidak ditemukan dalam database.`,
          code: 'USER_NOT_FOUND',
        };
      }

      const targetUserData = userSnap.data() as FirestoreUserDocument;

      // Count active Super Admins within transaction if target user is SUPER_ADMIN
      let activeSuperAdminCount = 1;
      if (targetUserData.role === 'SUPER_ADMIN') {
        const superAdminsSnap = await transaction.get(
          db.collection('users').where('role', '==', 'SUPER_ADMIN').where('active', '==', true)
        );
        activeSuperAdminCount = superAdminsSnap.size;
      }

      // 5. Evaluate Centralized RBAC Safeguards
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
        activeSuperAdminCount
      );

      if (!rbacDecision.allowed) {
        return {
          success: false,
          status: 403,
          error: rbacDecision.reason || 'Anda tidak memiliki hak akses untuk mengubah akun ini.',
          code: rbacDecision.code,
        };
      }

      // Prepare Update Data
      const patchData: Partial<FirestoreUserDocument> = {
        updatedAt: now,
      };

      if (updates.role !== undefined) {
        patchData.role = updates.role;
      }

      if (updates.active !== undefined) {
        patchData.active = updates.active;
      }

      transaction.update(userRef, patchData);

      // Determine Audit Action Type
      let auditAction = 'USER_ACCOUNT_UPDATED';
      if (updates.role !== undefined && updates.active !== undefined) {
        auditAction = 'USER_ROLE_AND_STATUS_UPDATED';
      } else if (updates.role !== undefined) {
        auditAction = 'USER_ROLE_UPDATED';
      } else if (updates.active !== undefined) {
        auditAction = 'USER_STATUS_TOGGLED';
      }

      // Record Audit Event Atomically in the SAME Transaction
      const auditRef = db.collection('audit_events').doc();
      const auditDoc = {
        eventId: auditRef.id,
        actorUid: caller!.id,
        actorEmail: caller!.email,
        actorRole: caller!.role,
        action: auditAction,
        target: targetUserData.email,
        targetUid: targetUserData.uid,
        timestamp: now,
        metadata: {
          previousRole: targetUserData.role,
          newRole: updates.role ?? targetUserData.role,
          previousActiveState: targetUserData.active,
          newActiveState: updates.active ?? targetUserData.active,
        },
      };

      transaction.set(auditRef, auditDoc);

      const updatedUser: FirestoreUserDocument = {
        ...targetUserData,
        ...patchData,
      };

      return {
        success: true,
        user: {
          uid: updatedUser.uid,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          photoURL: updatedUser.photoURL,
          role: updatedUser.role,
          teamId: updatedUser.teamId,
          active: updatedUser.active,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          lastLoginAt: updatedUser.lastLoginAt,
        },
      };
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (err: any) {
    console.error('Failed to update user account:', err);
    return NextResponse.json(
      { error: 'Gagal memperbarui data pengguna di database.', details: err.message },
      { status: 500 }
    );
  }
}
