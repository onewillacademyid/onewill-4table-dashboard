/**
 * Onewill Academy | Server Auth & Session Verification Utilities
 * Strictly server-only. Handles Firebase ID token exchange, HttpOnly session cookie verification,
 * CSRF validation, and trusted Firestore User Registry authorization.
 */

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FirestoreUserDocument, FirestoreInvitationDocument } from '@/types/firestore';
import { User } from '@/types';
import { mapFirestoreUserToDomainUser } from '@/lib/firebase/auth-foundation';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Server auth utilities imported on client side!');
}

export interface ServerAuthResult {
  authenticated: boolean;
  user?: User;
  error?: string;
  code?: 'UNAUTHENTICATED' | 'UNINVITED' | 'DISABLED' | 'EXPIRED' | 'INVALID_TOKEN';
}

/**
 * Validates request origin/referer header against host to mitigate CSRF attacks.
 */
export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!host) return false;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Verifies or provisions user record in Firestore users/{uid}.
 * If user does not exist in users/{uid}, checks invitations/{id} for a pending invitation matching the email.
 * Binds accepted invitation to UID and creates active user document.
 * PROHIBITED: Automatic Super Admin assignment.
 */
export async function syncOrVerifyUserRegistry(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<{ userDoc?: FirestoreUserDocument; error?: string; code?: 'UNINVITED' | 'DISABLED' }> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  const now = new Date().toISOString();

  if (userSnap.exists) {
    const userData = userSnap.data() as FirestoreUserDocument;

    if (!userData.active) {
      return {
        error: 'Akun Anda tidak aktif atau telah dinonaktifkan oleh administrator.',
        code: 'DISABLED',
      };
    }

    await userRef.update({
      lastLoginAt: now,
      displayName: displayName || userData.displayName,
      ...(photoURL ? { photoURL } : {}),
    });

    return { userDoc: { ...userData, lastLoginAt: now } };
  }

  // Search for pending invitation matching email
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return {
      error: 'Email pengguna tidak valid.',
      code: 'UNINVITED',
    };
  }

  const invitationsRef = db.collection('invitations');
  const invitationQuery = await invitationsRef
    .where('normalizedEmail', '==', normalizedEmail)
    .where('status', '==', 'PENDING')
    .limit(1)
    .get();

  if (invitationQuery.empty) {
    return {
      error: 'Email Anda belum terdaftar dalam undangan akses Onewill Academy.',
      code: 'UNINVITED',
    };
  }

  const invitationDoc = invitationQuery.docs[0];
  const invitation = invitationDoc.data() as FirestoreInvitationDocument;

  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    await invitationDoc.ref.update({ status: 'EXPIRED' });
    return {
      error: 'Undangan akses Anda telah kadaluarsa. Silakan minta undangan baru dari Admin.',
      code: 'UNINVITED',
    };
  }

  // Create user document bound to invitation role and team
  const newUserDoc: FirestoreUserDocument = {
    uid,
    email: normalizedEmail,
    displayName: displayName || normalizedEmail.split('@')[0],
    photoURL: photoURL || '',
    active: true,
    role: invitation.role,
    teamId: invitation.teamId || 'team-1',
    invitedEmail: normalizedEmail,
    createdAt: now,
    lastLoginAt: now,
  };

  const batch = db.batch();
  batch.set(userRef, newUserDoc);
  batch.update(invitationDoc.ref, {
    status: 'ACCEPTED',
    acceptedAt: now,
    acceptedByUid: uid,
  });

  await batch.commit();

  return { userDoc: newUserDoc };
}

/**
 * Verifies a session cookie using Firebase Admin SDK and returns active user domain profile.
 */
export async function verifyServerSession(sessionCookie: string): Promise<ServerAuthResult> {
  if (!sessionCookie) {
    return { authenticated: false, code: 'UNAUTHENTICATED', error: 'Sesi tidak ditemukan.' };
  }

  try {
    const auth = getAdminAuth();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(decodedClaims.sub).get();

    if (!userSnap.exists) {
      return {
        authenticated: false,
        code: 'UNINVITED',
        error: 'Profil pengguna tidak terdaftar di database.',
      };
    }

    const userDoc = userSnap.data() as FirestoreUserDocument;
    if (!userDoc.active) {
      return {
        authenticated: false,
        code: 'DISABLED',
        error: 'Akun Anda telah dinonaktifkan.',
      };
    }

    const domainUser = mapFirestoreUserToDomainUser(userDoc);
    return {
      authenticated: true,
      user: domainUser,
    };
  } catch {
    return {
      authenticated: false,
      code: 'INVALID_TOKEN',
      error: 'Sesi tidak valid atau telah kadaluarsa.',
    };
  }
}
