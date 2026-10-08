import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { syncOrVerifyUserRegistry, validateCsrfOrigin } from '@/lib/auth/server-auth';
import { mapFirestoreUserToDomainUser } from '@/lib/firebase/auth-foundation';

export async function POST(request: Request) {
  // CSRF Origin verification
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { error: 'Validasi CSRF gagal: Permintaan dari sumber tidak valid.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'ID Token tidak ditemukan dalam permintaan.' },
        { status: 400 }
      );
    }

    // Verify Firebase ID token
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: 'Akun Firebase tidak memiliki email terverifikasi.' },
        { status: 400 }
      );
    }

    // Check user registry & invitations in Firestore
    const registryResult = await syncOrVerifyUserRegistry(
      uid,
      email,
      name || email.split('@')[0],
      picture
    );

    if (registryResult.error || !registryResult.userDoc) {
      return NextResponse.json(
        { error: registryResult.error || 'Akses ditolak.' },
        { status: 403 }
      );
    }

    const domainUser = mapFirestoreUserToDomainUser(registryResult.userDoc);

    // Create session cookie valid for 5 days (432,000,000 ms)
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      user: domainUser,
    });
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Gagal mengotentikasi sesi backend: ' + (error.message || 'Error tidak diketahui') },
      { status: 401 }
    );
  }
}
