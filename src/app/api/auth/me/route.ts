import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyServerSession } from '@/lib/auth/server-auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value || '';

    const authResult = await verifyServerSession(sessionCookie);

    if (!authResult.authenticated) {
      const status = authResult.code === 'UNINVITED' || authResult.code === 'DISABLED' ? 403 : 401;
      return NextResponse.json(
        {
          authenticated: false,
          error: authResult.error || 'Pengguna belum terotentikasi.',
          code: authResult.code,
        },
        { status }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: authResult.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: 'Kesalahan internal server saat verifikasi sesi.' },
      { status: 500 }
    );
  }
}
