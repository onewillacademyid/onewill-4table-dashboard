/**
 * Onewill Academy | Weekly Progress Report Detail API Route
 * GET /api/reports/[id] — Read Report Detail
 *
 * Strictly server-side. Enforces session cookie verification,
 * report existence check, and fine-grained RBAC authorization via canReadReport policy.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyServerSession } from '@/lib/auth/server-auth';
import { getReportRepository } from '@/lib/repos/report-repository-factory';

async function getSessionCookieFromRequest(request: Request): Promise<string> {
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session=([^;]*)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  try {
    const cookieStore = await cookies();
    return cookieStore.get('session')?.value || '';
  } catch {
    return '';
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;

    if (!reportId || reportId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'ID Laporan tidak valid.',
        },
        { status: 400 }
      );
    }

    // 1. Verify Server Session Cookie
    const sessionCookie = await getSessionCookieFromRequest(request);
    const authResult = await verifyServerSession(sessionCookie);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          code: authResult.code || 'UNAUTHENTICATED',
          error: authResult.error || 'Akses ditolak: Sesi Anda tidak valid atau telah berakhir.',
        },
        { status: 401 }
      );
    }

    const user = authResult.user;
    if (!user.active) {
      return NextResponse.json(
        {
          success: false,
          code: 'DISABLED',
          error: 'Akses ditolak: Akun Anda tidak aktif.',
        },
        { status: 403 }
      );
    }

    // 2. Execute Repository Operation (DI via Factory)
    const repo = getReportRepository();
    const repoResult = await repo.getReportById({
      user,
      reportId,
    });

    if (!repoResult.success) {
      if (repoResult.code === 'REPORT_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            code: 'REPORT_NOT_FOUND',
            error: repoResult.error || 'Laporan tidak ditemukan.',
          },
          { status: 404 }
        );
      }
      if (repoResult.code === 'CROSS_TEAM_FORBIDDEN') {
        return NextResponse.json(
          {
            success: false,
            code: 'CROSS_TEAM_FORBIDDEN',
            error: repoResult.error || 'Akses ditolak: Anda tidak memiliki hak akses membaca laporan ini.',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          code: repoResult.code || 'INTERNAL_ERROR',
          error: repoResult.error || 'Gagal membaca laporan.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: repoResult.data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('CRITICAL UNHANDLED ERROR in GET /api/reports/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        error: 'Terjadi kesalahan internal pada server.',
      },
      { status: 500 }
    );
  }
}
