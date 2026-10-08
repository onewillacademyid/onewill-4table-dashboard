import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { validateCsrfOrigin } from '@/lib/auth/server-auth';

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { error: 'Validasi CSRF gagal: Permintaan dari sumber tidak valid.' },
      { status: 403 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (sessionCookie) {
      try {
        const auth = getAdminAuth();
        const decoded = await auth.verifySessionCookie(sessionCookie, false);
        await auth.revokeRefreshTokens(decoded.sub);
      } catch {
        // Session cookie might already be expired; proceed to clear cookie
      }
    }

    cookieStore.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal melakukan kelar (logout): ' + (error.message || 'Error tidak diketahui') },
      { status: 500 }
    );
  }
}
