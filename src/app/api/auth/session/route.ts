import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { syncOrVerifyUserRegistry, validateCsrfOrigin } from '@/lib/auth/server-auth';
import { mapFirestoreUserToDomainUser } from '@/lib/firebase/auth-foundation';

export async function POST(request: Request) {
  // CSRF Origin verification against trusted hosts
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { error: 'Validasi CSRF gagal: Permintaan dari sumber origin tidak dikenal.' },
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
    const { uid, email, name, picture, email_verified, auth_time } = decodedToken;

    // P0 Requirement 3: Enforce email_verified claim
    if (!email_verified) {
      return NextResponse.json(
        { error: 'Akses ditolak: Alamat email belum terverifikasi oleh penyedia otentikasi.' },
        { status: 403 }
      );
    }

    // P0 Requirement 3: Validate authentication freshness (auth_time)
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAuthAgeSeconds = 5 * 60; // 5 minutes (300s)

    if (
      !auth_time ||
      typeof auth_time !== 'number' ||
      auth_time > currentTime + 60 || // Future timestamp buffer
      currentTime - auth_time > maxAuthAgeSeconds
    ) {
      return NextResponse.json(
        { error: 'Akses ditolak: Otentikasi telah kadaluarsa (auth_time > 5 menit). Silakan masuk kembali.' },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Akun Firebase tidak memiliki email terverifikasi.' },
        { status: 400 }
      );
    }

    // Check user registry & single-use invitations in Firestore via atomic transaction
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
      { error: 'Gagal mengotentikasi sesi backend: Token tidak valid atau kadaluarsa.' },
      { status: 401 }
    );
  }
}
