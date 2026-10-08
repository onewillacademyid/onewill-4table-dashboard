/**
 * Onewill Academy | Server Auth & Session Verification Utilities
 * Strictly server-only. Handles Firebase ID token exchange, HttpOnly session cookie verification,
 * CSRF validation against explicitly configured trusted origins, and trusted Firestore User Registry authorization.
 */

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { FirestoreUserDocument, FirestoreInvitationDocument } from '@/types/firestore';
import { User, UserRole } from '@/types';
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
 * Validates request origin/referer header against EXPLICITLY CONFIGURED trusted application origins.
 * NEVER adds arbitrary request Host or X-Forwarded-Host headers to the allowlist.
 * Fails closed if origins do not match configured trusted origins.
 */
export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Must have either Origin or Referer for state-changing POST requests
  if (!origin && !referer) {
    return false;
  }

  const trustedOrigins = new Set<string>();

  // Explicitly configured APP_URL
  if (process.env.APP_URL) {
    try {
      const parsed = new URL(process.env.APP_URL);
      trustedOrigins.add(parsed.origin.toLowerCase());
    } catch {
      // Invalid APP_URL format
    }
  }

  // Explicitly configured Vercel deployment URL
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    try {
      const formatted = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
      const parsed = new URL(formatted);
      trustedOrigins.add(parsed.origin.toLowerCase());
    } catch {
      // Invalid VERCEL_URL format
    }
  }

  // Trusted local development origins
  trustedOrigins.add('http://localhost:3000');
  trustedOrigins.add('http://127.0.0.1:3000');
  trustedOrigins.add('http://0.0.0.0:3000');

  const isTrustedOriginUrl = (urlStr: string | null): boolean => {
    if (!urlStr) return false;
    try {
      const parsedOrigin = new URL(urlStr).origin.toLowerCase();
      return trustedOrigins.has(parsedOrigin);
    } catch {
      return false;
    }
  };

  if (origin && !isTrustedOriginUrl(origin)) {
    return false;
  }

  if (referer && !isTrustedOriginUrl(referer)) {
    return false;
  }

  return true;
}

/**
 * Atomically verifies or provisions user record in Firestore users/{uid} using db.runTransaction().
 * - Locks user record and pending invitation queries inside the transaction.
 * - Single-use invitation matching prevents race conditions under concurrent requests.
 * - Role & team are strictly derived from invitation record (NEVER client input).
 * - PROHIBITED: Automatic Super Admin assignment.
 */
export async function syncOrVerifyUserRegistry(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<{ userDoc?: FirestoreUserDocument; error?: string; code?: 'UNINVITED' | 'DISABLED' }> {
  const db = getAdminDb();
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail) {
    return {
      error: 'Email pengguna tidak valid.',
      code: 'UNINVITED',
    };
  }

  return await db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await transaction.get(userRef);
    const now = new Date().toISOString();

    if (userSnap.exists) {
      const userData = userSnap.data() as FirestoreUserDocument;

      if (!userData.active) {
        return {
          error: 'Akun Anda tidak aktif atau telah dinonaktifkan oleh administrator.',
          code: 'DISABLED',
        };
      }

      transaction.update(userRef, {
        lastLoginAt: now,
        displayName: displayName || userData.displayName,
        ...(photoURL ? { photoURL } : {}),
      });

      return { userDoc: { ...userData, lastLoginAt: now } };
    }

    // Perform transactional query for pending invitation matching email
    const invitationsRef = db.collection('invitations');
    const invitationQuery = invitationsRef
      .where('normalizedEmail', '==', normalizedEmail)
      .where('status', '==', 'PENDING')
      .limit(1);

    const invitationQuerySnap = await transaction.get(invitationQuery);

    if (invitationQuerySnap.empty) {
      return {
        error: 'Email Anda belum terdaftar dalam undangan akses Onewill Academy.',
        code: 'UNINVITED',
      };
    }

    const invitationDoc = invitationQuerySnap.docs[0];
    const invitation = invitationDoc.data() as FirestoreInvitationDocument;

    if (invitation.status !== 'PENDING') {
      return {
        error: 'Undangan akses ini telah digunakan atau tidak lagi berlaku.',
        code: 'UNINVITED',
      };
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      transaction.update(invitationDoc.ref, { status: 'EXPIRED' });
      return {
        error: 'Undangan akses Anda telah kadaluarsa. Silakan minta undangan baru dari Admin.',
        code: 'UNINVITED',
      };
    }

    // Role & team strictly derived from verified invitation (Never from browser input)
    const assignedRole: UserRole = invitation.role;

    const newUserDoc: FirestoreUserDocument = {
      uid,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0],
      photoURL: photoURL || '',
      active: true,
      role: assignedRole,
      teamId: invitation.teamId || 'team-1',
      invitedEmail: normalizedEmail,
      createdAt: now,
      lastLoginAt: now,
    };

    transaction.set(userRef, newUserDoc);
    transaction.update(invitationDoc.ref, {
      status: 'ACCEPTED',
      acceptedAt: now,
      acceptedByUid: uid,
    });

    return { userDoc: newUserDoc };
  });
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
    // Enforce checkRevoked = true to reject revoked sessions
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
