/**
 * Onewill Academy | Weekly Progress Reports API Route
 * POST /api/reports — Create Report Draft
 * GET /api/reports — List Authorized Reports
 *
 * Strictly server-side. Enforces session cookie verification, CSRF origin validation,
 * Zod schema parsing, and fine-grained RBAC policies.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyServerSession, validateCsrfOrigin } from '@/lib/auth/server-auth';
import { CreateReportInputSchema, ListReportsQuerySchema } from '@/lib/validation/report';
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

export async function POST(request: Request) {
  try {
    // 1. Verify CSRF Origin
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          code: 'CSRF_REJECTED',
          error: 'Akses ditolak: Permintaan tidak berasal dari origin terpercaya.',
        },
        { status: 403 }
      );
    }

    // 2. Verify Server Session Cookie
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

    // 3. Parse JSON Body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_JSON',
          error: 'Format body JSON tidak valid.',
        },
        { status: 400 }
      );
    }

    // 4. Validate Input Schema with Zod
    const validation = CreateReportInputSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Data laporan tidak valid.';
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: firstError,
        },
        { status: 400 }
      );
    }

    // 5. Execute Repository Operation (DI via Factory)
    const repo = getReportRepository();
    const repoResult = await repo.createReport({
      input: validation.data,
      author: user,
    });

    if (!repoResult.success) {
      if (repoResult.code === 'MUTATION_DISABLED') {
        return NextResponse.json(
          {
            success: false,
            code: 'MUTATIONS_DISABLED',
            error: repoResult.error,
          },
          { status: 403 }
        );
      }
      if (repoResult.code === 'REPORT_ALREADY_EXISTS') {
        return NextResponse.json(
          {
            success: false,
            code: 'REPORT_ALREADY_EXISTS',
            error: repoResult.error,
          },
          { status: 409 }
        );
      }
      if (repoResult.code === 'UNAUTHORIZED_ROLE') {
        return NextResponse.json(
          {
            success: false,
            code: 'UNAUTHORIZED_ROLE',
            error: repoResult.error,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          code: repoResult.code || 'INTERNAL_ERROR',
          error: repoResult.error || 'Gagal menyimpan laporan.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: repoResult.data,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('CRITICAL UNHANDLED ERROR in POST /api/reports:', err);
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

export async function GET(request: Request) {
  try {
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

    // 2. Parse Query Parameters
    const url = new URL(request.url);
    const queryParams = {
      teamId: url.searchParams.get('teamId') || undefined,
      status: url.searchParams.get('status') || undefined,
      weekNumber: url.searchParams.get('weekNumber') || undefined,
      year: url.searchParams.get('year') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
    };

    const validation = ListReportsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Parameter pencarian tidak valid.';
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: firstError,
        },
        { status: 400 }
      );
    }

    const queryData = validation.data;

    // 3. Execute Repository Operation (DI via Factory)
    const repo = getReportRepository();
    const repoResult = await repo.listReports({
      user,
      filters: {
        teamId: queryData.teamId,
        status: queryData.status,
        weekNumber: queryData.weekNumber,
        year: queryData.year,
      },
      limit: queryData.limit,
      cursor: queryData.cursor,
    });

    if (!repoResult.success) {
      return NextResponse.json(
        {
          success: false,
          code: repoResult.code || 'INTERNAL_ERROR',
          error: repoResult.error || 'Gagal mengambil daftar laporan.',
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
    console.error('CRITICAL UNHANDLED ERROR in GET /api/reports:', err);
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
