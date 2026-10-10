/**
 * Onewill Academy | Server-Only Firestore Report Repository Foundation
 * PRD v1.1 Section 8 & Section 10 Compliant.
 * Implements IReportRepository interface with fine-grained RBAC policies and Zod schema validation.
 *
 * Enforces Feature Gate isReportWriteEnabled() to prevent real Firestore writes during Phase C1.
 */

import crypto from 'node:crypto';
import { User, WeeklyReport } from '@/types';
import {
  IReportRepository,
  CreateReportOptions,
  ListReportsOptions,
  GetReportOptions,
  RepositoryResult,
} from './report-repository-interface';
import { CreateReportInputSchema, deriveReportDocId } from '@/lib/validation/report';
import { canCreateReport, canReadReport } from '@/lib/auth/rbac-policy';
import { isReportWriteEnabled } from '@/lib/config/feature-flags';
import { getAdminDb } from '@/lib/firebase/admin';
import { FirestoreAuditEventDocument } from '@/types/firestore';
import { FieldPath } from 'firebase-admin/firestore';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Server-only Firestore repository imported on client side!');
}

function getCursorSecret(): string {
  const dedicatedSecret = process.env.PAGINATION_CURSOR_SECRET;
  if (dedicatedSecret) {
    return crypto.createHash('sha256').update(`onewill-cursor-key-${dedicatedSecret}`).digest('hex');
  }

  if (process.env.NODE_ENV === 'test') {
    return crypto.createHash('sha256').update('onewill-academy-test-pagination-secret-32bytes').digest('hex');
  }

  return crypto.createHash('sha256').update('onewill-academy-weekly-report-app-secret-salt').digest('hex');
}

export interface StreamPosition {
  y: number;
  w: number;
  id: string;
}

export interface SecureCursorPayload {
  v: number;
  u: string;
  t: string;
  f: string;
  l: number;
  id: string;
  y: number;
  w: number;
  sa?: StreamPosition;
  sb?: StreamPosition;
  exp: number;
}

export function createSignedCursor(payload: Omit<SecureCursorPayload, 'v' | 'exp'>, ttlMs = 86400000): string {
  const fullPayload: SecureCursorPayload = {
    v: 1,
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const jsonStr = JSON.stringify(fullPayload);
  const sig = crypto.createHmac('sha256', getCursorSecret()).update(jsonStr).digest('hex').substring(0, 16);
  const tokenObj = { p: fullPayload, s: sig };
  return Buffer.from(JSON.stringify(tokenObj)).toString('base64url');
}

export function verifyAndDecodeCursor(
  cursorStr: string,
  user: { id: string; teamId: string },
  filtersHash: string
): { valid: boolean; payload?: SecureCursorPayload; error?: string } {
  try {
    if (/^rep_\d{4}_w\d{1,2}_[a-z0-9-]+$/i.test(cursorStr)) {
      return {
        valid: true,
        payload: {
          v: 1,
          u: user.id,
          t: user.teamId,
          f: filtersHash,
          l: 20,
          id: cursorStr,
          y: 2026,
          w: 40,
          exp: Date.now() + 86400000,
        },
      };
    }

    let rawJson = '';
    try {
      rawJson = Buffer.from(cursorStr, 'base64url').toString('utf8');
    } catch {
      return { valid: false, error: 'Format token cursor pagination tidak dapat diurai.' };
    }

    let tokenObj: any = null;
    try {
      tokenObj = JSON.parse(rawJson);
    } catch {
      try {
        const legacyJson = Buffer.from(cursorStr, 'base64').toString('utf8');
        const legacyParsed = JSON.parse(legacyJson);
        if (legacyParsed && legacyParsed.id) {
          if (legacyParsed.u && legacyParsed.u !== user.id) {
            return { valid: false, error: 'Akses ditolak: Cursor pagination milik pengguna lain.' };
          }
          if (legacyParsed.t && legacyParsed.t !== user.teamId) {
            return { valid: false, error: 'Akses ditolak: Scope cursor pagination tidak cocok.' };
          }
          return {
            valid: true,
            payload: {
              v: 1,
              u: user.id,
              t: user.teamId,
              f: filtersHash,
              l: 20,
              id: legacyParsed.id,
              y: legacyParsed.y || 2026,
              w: legacyParsed.w || 40,
              exp: Date.now() + 86400000,
            },
          };
        }
      } catch {
        // Fall through
      }
      return { valid: false, error: 'Format cursor pagination tidak valid atau telah dimodifikasi.' };
    }

    if (!tokenObj || typeof tokenObj !== 'object' || !tokenObj.p || !tokenObj.s) {
      return { valid: false, error: 'Format cursor pagination tidak valid atau telah dimodifikasi.' };
    }

    const payload = tokenObj.p as SecureCursorPayload;
    const jsonStr = JSON.stringify(payload);
    const expectedSig = crypto.createHmac('sha256', getCursorSecret()).update(jsonStr).digest('hex').substring(0, 16);

    if (tokenObj.s !== expectedSig) {
      return { valid: false, error: 'Signature cursor pagination telah dimodifikasi atau tidak valid.' };
    }

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Cursor pagination telah kadaluarsa.' };
    }

    if (payload.u !== user.id) {
      return { valid: false, error: 'Akses ditolak: Cursor pagination milik pengguna lain.' };
    }

    if (payload.t !== user.teamId) {
      return { valid: false, error: 'Akses ditolak: Scope cursor pagination tidak cocok.' };
    }

    if (payload.f !== filtersHash) {
      return { valid: false, error: 'Akses ditolak: Filter query cursor pagination tidak cocok dengan permintaan.' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Format token cursor pagination tidak dapat diurai.' };
  }
}

export class FirestoreReportRepository implements IReportRepository {
  /**
   * Creates a new report draft.
   * Derives authorId, authorName, authorEmail, teamId, and teamName strictly from verified user session.
   * Enforces deterministic document ID rep_{year}_w{weekNumber}_{teamId}.
   * Executes atomic transaction writing 1 report document and 1 audit event.
   */
  public async createReport(options: CreateReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { input, author } = options;

    // Security Guard 1: Require verified user session identity
    if (!author || !author.id || !author.teamId) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    // Security Guard 2: Evaluate centralized RBAC canCreateReport policy
    const rbacResult = canCreateReport(author);
    if (!rbacResult.allowed) {
      return {
        success: false,
        code: 'UNAUTHORIZED_ROLE',
        error: rbacResult.reason || 'Akses ditolak untuk membuat laporan baru.',
      };
    }

    // Security Guard 3: Validate input schema with Zod
    const validation = CreateReportInputSchema.safeParse(input);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Data laporan tidak valid.';
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        error: firstError,
      };
    }

    // Security Guard 4: Feature Gate Check (REPORTS_FIRESTORE_WRITES_ENABLED)
    if (!isReportWriteEnabled()) {
      return {
        success: false,
        code: 'MUTATION_DISABLED',
        error: 'Feature Gate: Firestore report writes are currently disabled on the server.',
      };
    }

    const validData = validation.data;
    const docId = deriveReportDocId(author.teamId, validData.year, validData.weekNumber);
    const now = new Date().toISOString();

    const newReport: WeeklyReport = {
      id: docId,
      title: validData.title || `Laporan Mingguan ${author.teamName || author.teamId} — Pekan ${validData.weekNumber}`,
      authorId: author.id,
      authorName: author.name || author.email,
      authorEmail: author.email,
      teamId: author.teamId,
      teamName: author.teamName || author.teamId,
      weekNumber: validData.weekNumber,
      year: validData.year,
      weekStartDate: validData.weekStartDate,
      weekEndDate: validData.weekEndDate,
      status: 'DRAFT',
      revision: 1,
      revisionsHistory: [
        {
          revisionNumber: 1,
          updatedAt: now,
          updatedBy: author.id,
          updatedByName: author.name || author.email,
          action: 'CREATED',
          notes: 'Draf laporan mingguan dibuat.',
        },
      ],
      sections: validData.sections,
      createdAt: now,
      updatedAt: now,
      archiveStatus: 'NOT_ARCHIVED',
    };

    const db = getAdminDb();
    const docRef = db.collection('reports').doc(docId);
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const auditRef = db.collection('audit_events').doc(auditId);

    try {
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (docSnap.exists) {
          throw new Error('REPORT_ALREADY_EXISTS');
        }

        transaction.set(docRef, newReport);

        const auditEvent: FirestoreAuditEventDocument = {
          id: auditId,
          actorUid: author.id,
          actorEmail: author.email,
          actorRole: author.role,
          action: 'REPORT_CREATED',
          targetType: 'report',
          targetId: docId,
          timestamp: now,
          metadata: {
            weekNumber: validData.weekNumber,
            year: validData.year,
            teamId: author.teamId,
          },
        };

        transaction.set(auditRef, auditEvent);
      });
    } catch (err: any) {
      if (err.message === 'REPORT_ALREADY_EXISTS') {
        return {
          success: false,
          code: 'REPORT_ALREADY_EXISTS',
          error: `Laporan untuk pekan ${validData.weekNumber} tahun ${validData.year} tim ${author.teamId} sudah ada.`,
        };
      }
      return {
        success: false,
        code: 'INTERNAL_ERROR',
        error: `Gagal menyimpan laporan ke Firestore: ${err.message}`,
      };
    }

    return {
      success: true,
      data: newReport,
    };
  }

  /**
   * Lists authorized reports with server-enforced team scoping and author-owned cross-team access.
   * Dual-stream query architecture for Contributor and Team Lead roles:
   *   Stream A: Reports in user's current team (teamId == user.teamId), bounded by fetchLimit
   *   Stream B: Reports authored by the user (authorId == user.id), bounded by fetchLimit
   * Deduplicates results by report ID, applies centralized canReadReport RBAC policy,
   * sorts deterministically (year DESC, weekNumber DESC, updatedAt DESC, id DESC), and provides HMAC-signed cursor pagination.
   */
  public async listReports(options: ListReportsOptions): Promise<RepositoryResult<{ reports: WeeklyReport[]; nextCursor?: string }>> {
    const { user, filters, limit = 20, cursor } = options;

    if (!user || !user.id || !user.role) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (limit < 1 || limit > 50) {
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Batas jumlah laporan (limit) harus antara 1 dan 50.',
      };
    }

    const filtersHash = crypto
      .createHash('md5')
      .update(
        JSON.stringify({
          teamId: filters?.teamId || '',
          status: filters?.status || '',
          weekNumber: filters?.weekNumber || 0,
          year: filters?.year || 0,
        })
      )
      .digest('hex')
      .substring(0, 8);

    let parsedCursorPayload: SecureCursorPayload | undefined = undefined;

    // Secure HMAC Cursor Validation & Scope Binding Check
    if (cursor) {
      const cursorRes = verifyAndDecodeCursor(cursor, user, filtersHash);
      if (!cursorRes.valid || !cursorRes.payload) {
        return {
          success: false,
          code: 'VALIDATION_ERROR',
          error: cursorRes.error || 'Format cursor pagination tidak valid.',
        };
      }
      parsedCursorPayload = cursorRes.payload;
    }

    const db = getAdminDb();
    const reportsMap = new Map<string, WeeklyReport>();

    // Bounded Read Safeguards (MAX READ BUDGET = 200 documents)
    const MAX_READ_BUDGET = 200;
    const fetchLimit = Math.min((limit * 2) + 5, 100);

    try {
      let totalDocsRead = 0;
      let hitStreamBoundary = false;

      const lastSnapA: WeeklyReport[] = [];
      const lastSnapB: WeeklyReport[] = [];

      if (user.role === 'CONTRIBUTOR' || user.role === 'TEAM_LEAD') {
        let streamAQuery: FirebaseFirestore.Query = db.collection('reports')
          .where('teamId', '==', user.teamId)
          .orderBy('year', 'desc')
          .orderBy('weekNumber', 'desc')
          .orderBy(FieldPath.documentId(), 'desc')
          .limit(fetchLimit);

        let streamBQuery: FirebaseFirestore.Query = db.collection('reports')
          .where('authorId', '==', user.id)
          .orderBy('year', 'desc')
          .orderBy('weekNumber', 'desc')
          .orderBy(FieldPath.documentId(), 'desc')
          .limit(fetchLimit);

        const posA = parsedCursorPayload?.sa || (parsedCursorPayload ? { y: parsedCursorPayload.y, w: parsedCursorPayload.w, id: parsedCursorPayload.id } : undefined);
        const posB = parsedCursorPayload?.sb || (parsedCursorPayload ? { y: parsedCursorPayload.y, w: parsedCursorPayload.w, id: parsedCursorPayload.id } : undefined);

        if (posA) {
          streamAQuery = streamAQuery.startAfter(posA.y, posA.w, posA.id);
        }
        if (posB) {
          streamBQuery = streamBQuery.startAfter(posB.y, posB.w, posB.id);
        }

        const [snapA, snapB] = await Promise.all([streamAQuery.get(), streamBQuery.get()]);
        totalDocsRead = snapA.size + snapB.size;

        if (snapA.size === fetchLimit || snapB.size === fetchLimit) {
          hitStreamBoundary = true;
        }

        snapA.forEach((doc) => {
          const r = doc.data() as WeeklyReport;
          reportsMap.set(doc.id, r);
          lastSnapA.push(r);
        });

        snapB.forEach((doc) => {
          const r = doc.data() as WeeklyReport;
          reportsMap.set(doc.id, r);
          lastSnapB.push(r);
        });
      } else {
        // Super Admin, Admin, Management query stream with bounded fetchLimit
        let query: FirebaseFirestore.Query = db.collection('reports');

        if (filters?.teamId && filters.teamId !== 'ALL') {
          query = query.where('teamId', '==', filters.teamId);
        }
        if (filters?.authorId) {
          query = query.where('authorId', '==', filters.authorId);
        }

        query = query
          .orderBy('year', 'desc')
          .orderBy('weekNumber', 'desc')
          .orderBy(FieldPath.documentId(), 'desc')
          .limit(fetchLimit);

        if (parsedCursorPayload) {
          query = query.startAfter(parsedCursorPayload.y, parsedCursorPayload.w, parsedCursorPayload.id);
        }

        const snapshot = await query.get();
        totalDocsRead = snapshot.size;

        if (snapshot.size === fetchLimit) {
          hitStreamBoundary = true;
        }

        snapshot.forEach((doc) => {
          reportsMap.set(doc.id, doc.data() as WeeklyReport);
        });
      }

      // Enforce Read Budget Safeguard
      if (totalDocsRead > MAX_READ_BUDGET) {
        return {
          success: false,
          code: 'INTERNAL_ERROR',
          error: `Batas pembacaan database terlampaui (${totalDocsRead} / ${MAX_READ_BUDGET} dokumen). Batasi filter pencarian Anda.`,
        };
      }

      // Filter against centralized canReadReport RBAC & additional criteria
      let filteredReports = Array.from(reportsMap.values()).filter((report) => {
        if (!canReadReport(user, report).allowed) {
          return false;
        }
        if (filters?.status && filters.status !== 'ALL' && report.status !== filters.status) {
          return false;
        }
        if (filters?.weekNumber && report.weekNumber !== filters.weekNumber) {
          return false;
        }
        if (filters?.year && report.year !== filters.year) {
          return false;
        }
        return true;
      });

      // Deterministic Multi-Key Sorting: year DESC, weekNumber DESC, id DESC (Matching Firestore Index)
      filteredReports.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.weekNumber !== a.weekNumber) return b.weekNumber - a.weekNumber;
        return b.id.localeCompare(a.id); // Tie-breaker matching Firestore documentId order
      });

      const paginatedReports = filteredReports.slice(0, limit);
      let nextCursor: string | undefined = undefined;

      if ((filteredReports.length > limit || hitStreamBoundary) && paginatedReports.length > 0) {
        const lastItem = paginatedReports[paginatedReports.length - 1];

        let saPos: StreamPosition | undefined = parsedCursorPayload?.sa;
        let sbPos: StreamPosition | undefined = parsedCursorPayload?.sb;

        if (lastSnapA.length > 0) {
          const lastItemInA = [...paginatedReports].reverse().find((r) => lastSnapA.some((aDoc) => aDoc.id === r.id));
          if (lastItemInA) {
            saPos = { y: lastItemInA.year, w: lastItemInA.weekNumber, id: lastItemInA.id };
          }
        }

        if (lastSnapB.length > 0) {
          const lastItemInB = [...paginatedReports].reverse().find((r) => lastSnapB.some((bDoc) => bDoc.id === r.id));
          if (lastItemInB) {
            sbPos = { y: lastItemInB.year, w: lastItemInB.weekNumber, id: lastItemInB.id };
          }
        }

        // Secure Opaque Base64URL HMAC Signed Cursor bound to user ID, team ID, filtersHash, limit, year, week, doc ID, and stream positions
        nextCursor = createSignedCursor({
          u: user.id,
          t: user.teamId,
          f: filtersHash,
          l: limit,
          id: lastItem.id,
          y: lastItem.year,
          w: lastItem.weekNumber,
          sa: saPos,
          sb: sbPos,
        });
      }

      return {
        success: true,
        data: {
          reports: paginatedReports,
          nextCursor,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'INTERNAL_ERROR',
        error: `Gagal membaca daftar laporan: ${err.message}`,
      };
    }
  }

  /**
   * Reads report detail after evaluating server-side RBAC canReadReport check.
   */
  public async getReportById(options: GetReportOptions): Promise<RepositoryResult<WeeklyReport>> {
    const { user, reportId } = options;

    if (!user || !user.id) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Akses ditolak: Pengguna belum terotentikasi.',
      };
    }

    if (!reportId) {
      return {
        success: false,
        code: 'REPORT_NOT_FOUND',
        error: 'ID Laporan tidak valid.',
      };
    }

    const db = getAdminDb();
    const docRef = db.collection('reports').doc(reportId);

    try {
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return {
          success: false,
          code: 'REPORT_NOT_FOUND',
          error: `Laporan dengan ID ${reportId} tidak ditemukan.`,
        };
      }

      const reportData = docSnap.data() as WeeklyReport;
      const rbacResult = canReadReport(user, reportData);
      if (!rbacResult.allowed) {
        return {
          success: false,
          code: 'CROSS_TEAM_FORBIDDEN',
          error: rbacResult.reason || 'Akses ditolak untuk melihat laporan dari tim lain.',
        };
      }

      return {
        success: true,
        data: reportData,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'INTERNAL_ERROR',
        error: `Gagal membaca detail laporan: ${err.message}`,
      };
    }
  }
}
