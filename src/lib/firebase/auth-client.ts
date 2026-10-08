/**
 * Onewill Academy | Client Firebase Auth Utilities
 * Handles Google Sign-In and Passwordless Email Link authentication via Firebase Client Web SDK,
 * followed by secure HttpOnly session exchange with Next.js backend API (/api/auth/session).
 */

import {
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ActionCodeSettings,
  UserCredential,
} from 'firebase/auth';
import { getClientAuth, getGoogleProvider } from './client';
import { User as DomainUser } from '@/types';

export interface ClientAuthResponse {
  success: boolean;
  user?: DomainUser;
  error?: string;
  code?: string;
}

/**
 * Initiates Google Sign-In popup and exchanges ID Token for backend session cookie.
 */
export async function signInWithGoogleClient(): Promise<ClientAuthResponse> {
  try {
    const auth = getClientAuth();
    const provider = getGoogleProvider();
    const result: UserCredential = await signInWithPopup(auth, provider);

    const idToken = await result.user.getIdToken();
    return await exchangeIdTokenForSession(idToken);
  } catch (err: any) {
    console.error('Google Sign-In Error:', err);
    return {
      success: false,
      error: err.message || 'Gagal melakukan masuk dengan Google.',
    };
  }
}

/**
 * Sends Firebase Passwordless Email Sign-In link to the requested email address.
 */
export async function sendPasswordlessEmailLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getClientAuth();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const actionCodeSettings: ActionCodeSettings = {
      url: `${origin}/login?finishEmailLink=true`,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('emailForSignIn', email);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Send Email Link Error:', err);
    return {
      success: false,
      error: err.message || 'Gagal mengirimkan tautan masuk ke email Anda.',
    };
  }
}

/**
 * Checks if current page URL is a Firebase Email Sign-In link.
 */
export function isEmailSignInLink(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const auth = getClientAuth();
    return isSignInWithEmailLink(auth, window.location.href);
  } catch {
    return false;
  }
}

/**
 * Completes Passwordless Email Link sign-in flow and exchanges ID Token for backend session cookie.
 */
export async function completePasswordlessEmailLink(providedEmail?: string): Promise<ClientAuthResponse> {
  try {
    const auth = getClientAuth();
    const href = window.location.href;

    if (!isSignInWithEmailLink(auth, href)) {
      return { success: false, error: 'Tautan bukan tautan otentikasi email yang valid.' };
    }

    let email = providedEmail;
    if (!email && typeof window !== 'undefined') {
      email = window.localStorage.getItem('emailForSignIn') || undefined;
    }

    if (!email) {
      return {
        success: false,
        code: 'EMAIL_REQUIRED',
        error: 'Silakan masukkan kembali alamat email Anda untuk mengonfirmasi login.',
      };
    }

    const result: UserCredential = await signInWithEmailLink(auth, email, href);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('emailForSignIn');
    }

    const idToken = await result.user.getIdToken();
    return await exchangeIdTokenForSession(idToken);
  } catch (err: any) {
    console.error('Complete Email Link Error:', err);
    return {
      success: false,
      error: err.message || 'Gagal mengonfirmasi login email link.',
    };
  }
}

/**
 * Helper to exchange Firebase ID token with Next.js backend API /api/auth/session.
 */
async function exchangeIdTokenForSession(idToken: string): Promise<ClientAuthResponse> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Akses ditolak oleh sistem keamanan backend.',
        code: data.code,
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Terjadi kesalahan jaringan saat bertukar sesi dengan server.',
    };
  }
}

/**
 * Revokes backend session cookie and logs out user.
 */
export async function logoutClient(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Kesalahan jaringan saat keluar.' };
  }
}

/**
 * Fetches current authenticated user session from backend API /api/auth/me.
 */
export async function fetchServerSession(): Promise<ClientAuthResponse> {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
    });
    const data = await res.json();

    if (!res.ok || !data.authenticated) {
      return {
        success: false,
        error: data.error || 'Sesi tidak aktif.',
        code: data.code,
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch {
    return { success: false, error: 'Gagal mengambil data sesi.' };
  }
}
