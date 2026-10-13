/**
 * Onewill Academy | Report Submission API Route
 * POST /api/reports/[id]/submit — Submit or Resubmit Report
 *
 * Strictly server-side. Enforces session cookie verification, CSRF origin validation,
 * Zod schema validation, optimistic concurrency tokens, and atomic state transitions.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyServerSession, validateCsrfOrigin } from '@/lib/auth/server-auth';
import { getReportRepository } from '@/lib/repos/report-repository-factory';
import { SubmitReportSchema, resolveExpectedVersion } from '@/lib/validation/workflow';

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

export async function POST(
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

    // 3. Parse JSON Body (optional for submit)
    let body: unknown = {};
    const text = await request.text();
    if (text && text.trim().length > 0) {
      try {
        body = JSON.parse(text);
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
    }

    // 4. Validate Input Schema with Zod
    const validation = SubmitReportSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Data pengajuan laporan tidak valid.';
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: firstError,
        },
        { status: 400 }
      );
    }

    // 5. Extract & Strictly Validate expectedVersion concurrency token
    const tokenResolution = resolveExpectedVersion(
      validation.data.expectedVersion,
      request.headers.get('x-expected-version')
    );
    if (!tokenResolution.valid || tokenResolution.expectedVersion === undefined) {
      return NextResponse.json(
        {
          success: false,
          code: tokenResolution.code,
          error: tokenResolution.error,
        },
        { status: 400 }
      );
    }
    const expectedVersion = tokenResolution.expectedVersion;
    const expectedRevision = validation.data.expectedRevision;

    // 6. Execute Repository Operation
    const repo = getReportRepository();
    const repoResult = await repo.submitReport({
      user,
      reportId,
      comments: validation.data.comments,
      expectedVersion,
      expectedRevision,
    });

    if (!repoResult.success) {
      if (repoResult.code === 'MUTATION_DISABLED') {
        return NextResponse.json(
          {
            success: false,
            code: 'MUTATION_DISABLED',
            error: repoResult.error,
          },
          { status: 403 }
        );
      }
      if (repoResult.code === 'REPORT_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            code: 'REPORT_NOT_FOUND',
            error: repoResult.error,
          },
          { status: 404 }
        );
      }
      if (
        repoResult.code === 'UNAUTHORIZED_ROLE' ||
        repoResult.code === 'CROSS_TEAM_FORBIDDEN' ||
        repoResult.code === 'ACCOUNT_DISABLED'
      ) {
        return NextResponse.json(
          {
            success: false,
            code: repoResult.code,
            error: repoResult.error,
          },
          { status: 403 }
        );
      }
      if (repoResult.code === 'STALE_REVISION_CONFLICT') {
        return NextResponse.json(
          {
            success: false,
            code: 'STALE_REVISION_CONFLICT',
            error: repoResult.error,
          },
          { status: 409 }
        );
      }
      if (
        repoResult.code === 'INVALID_STATE_TRANSITION' ||
        repoResult.code === 'INCOMPLETE_SECTIONS'
      ) {
        return NextResponse.json(
          {
            success: false,
            code: repoResult.code,
            error: repoResult.error,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          code: repoResult.code || 'INTERNAL_ERROR',
          error: repoResult.error || 'Gagal mengajukan laporan.',
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
    console.error('CRITICAL UNHANDLED ERROR in POST /api/reports/[id]/submit:', err);
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
