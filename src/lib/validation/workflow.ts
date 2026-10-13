/**
 * Onewill Academy | Workflow Zod Validation Schemas
 * Milestone M4.2-B: Strict input schemas for reporting state transitions.
 *
 * Enforces:
 * 1. Strict separation of client-writable and server-owned fields.
 * 2. Rejection of client-injected authorId, teamId, actorUid, status, archiveStatus, etc.
 * 3. 4-table completeness validation for report submissions.
 * 4. Meaningful revision notes with minimum length 10 after trimming.
 */

import { z } from 'zod';
import { WeeklyReportSectionsSchema } from '@/lib/validation/report';
import { WeeklyReportSections } from '@/types';

// ==========================================
// 1. Update Report Draft Schema (PATCH /api/reports/:id)
// ==========================================
export const UpdateReportDraftSchema = z
  .object({
    title: z.string().max(300, 'Judul laporan maksimal 300 karakter.').optional(),
    sections: WeeklyReportSectionsSchema,
    expectedVersion: z.number().int().min(1).optional(),
    expectedRevision: z.number().int().min(1).optional(),
  })
  .strict();

export type UpdateReportDraftInput = z.infer<typeof UpdateReportDraftSchema>;

// ==========================================
// 2. Submit Report Schema (POST /api/reports/:id/submit)
// ==========================================
export const SubmitReportSchema = z
  .object({
    comments: z.string().max(1000, 'Catatan pengajuan maksimal 1000 karakter.').optional(),
    expectedVersion: z.number().int().min(1).optional(),
    expectedRevision: z.number().int().min(1).optional(),
  })
  .strict();

export type SubmitReportInput = z.infer<typeof SubmitReportSchema>;

// ==========================================
// 3. Approve Report Schema (POST /api/reports/:id/approve)
// ==========================================
export const ApproveReportSchema = z
  .object({
    reviewNotes: z.string().max(2000, 'Catatan persetujuan maksimal 2000 karakter.').optional(),
    expectedVersion: z.number().int().min(1).optional(),
    expectedRevision: z.number().int().min(1).optional(),
  })
  .strict();

export type ApproveReportInput = z.infer<typeof ApproveReportSchema>;

// ==========================================
// 4. Request Revision Schema (POST /api/reports/:id/request-revision)
// ==========================================
export const RequestRevisionSchema = z
  .object({
    reviewNotes: z
      .string()
      .trim()
      .min(10, 'Catatan revisi wajib diisi minimal 10 karakter.')
      .max(2000, 'Catatan revisi maksimal 2000 karakter.'),
    expectedVersion: z.number().int().min(1).optional(),
    expectedRevision: z.number().int().min(1).optional(),
  })
  .strict();

export type RequestRevisionInput = z.infer<typeof RequestRevisionSchema>;

// ==========================================
// 5. Four-Table Completeness Validator
// ==========================================
export interface FourTableCompletenessResult {
  complete: boolean;
  missingSections: ('achievements' | 'issues' | 'objectives' | 'support')[];
  reason?: string;
}

/**
 * Validates that all four sections in the 4-Table Weekly Progress Report
 * meet the completion standard for submission:
 * Each section must contain at least 1 item OR have noUpdates === true with a non-empty rationale.
 */
export function validateFourTableCompleteness(sections: WeeklyReportSections): FourTableCompletenessResult {
  const missingSections: ('achievements' | 'issues' | 'objectives' | 'support')[] = [];

  // 1. Achievements
  const hasAchievements =
    sections.achievements.items.length > 0 ||
    (sections.achievements.noUpdates && Boolean(sections.achievements.noUpdatesReason?.trim()));
  if (!hasAchievements) {
    missingSections.push('achievements');
  }

  // 2. Issues
  const hasIssues =
    sections.issues.items.length > 0 ||
    (sections.issues.noUpdates && Boolean(sections.issues.noUpdatesReason?.trim()));
  if (!hasIssues) {
    missingSections.push('issues');
  }

  // 3. Objectives
  const hasObjectives =
    sections.objectives.items.length > 0 ||
    (sections.objectives.noUpdates && Boolean(sections.objectives.noUpdatesReason?.trim()));
  if (!hasObjectives) {
    missingSections.push('objectives');
  }

  // 4. Support
  const hasSupport =
    sections.support.items.length > 0 ||
    (sections.support.noUpdates && Boolean(sections.support.noUpdatesReason?.trim()));
  if (!hasSupport) {
    missingSections.push('support');
  }

  if (missingSections.length > 0) {
    return {
      complete: false,
      missingSections,
      reason: `Tabel berikut belum lengkap atau belum memiliki alasan "Tidak Ada Pembaruan": ${missingSections.join(', ')}.`,
    };
  }

  return {
    complete: true,
    missingSections: [],
  };
}

// ==========================================
// 6. Concurrency Token Resolver & Validator
// ==========================================
export interface ConcurrencyTokenResolution {
  valid: boolean;
  expectedVersion?: number;
  code?: 'MISSING_CONCURRENCY_TOKEN' | 'INVALID_CONCURRENCY_TOKEN' | 'CONCURRENCY_TOKEN_MISMATCH';
  error?: string;
}

/**
 * Resolves and strictly validates the expectedVersion concurrency token.
 * Canonical API contract rules:
 * 1. Can be supplied via JSON body `expectedVersion` or HTTP header `x-expected-version`.
 * 2. If both are supplied: they MUST match; conflicting values are rejected with 400 CONCURRENCY_TOKEN_MISMATCH.
 * 3. Token must be an integer >= 1. Malformed values are rejected with 400 INVALID_CONCURRENCY_TOKEN.
 * 4. Missing token is rejected with 400 MISSING_CONCURRENCY_TOKEN before repository mutation.
 */
export function resolveExpectedVersion(
  bodyVersion: unknown,
  headerVersionStr: string | null | undefined
): ConcurrencyTokenResolution {
  let parsedHeaderVersion: number | undefined;

  if (headerVersionStr !== null && headerVersionStr !== undefined && headerVersionStr.trim().length > 0) {
    const trimmed = headerVersionStr.trim();
    if (!/^\d+$/.test(trimmed)) {
      return {
        valid: false,
        code: 'INVALID_CONCURRENCY_TOKEN',
        error: 'Header x-expected-version harus berupa bilangan bulat positif.',
      };
    }
    const val = parseInt(trimmed, 10);
    if (!Number.isSafeInteger(val) || val < 1) {
      return {
        valid: false,
        code: 'INVALID_CONCURRENCY_TOKEN',
        error: 'Header x-expected-version harus berupa bilangan bulat positif minimal 1.',
      };
    }
    parsedHeaderVersion = val;
  }

  let parsedBodyVersion: number | undefined;
  if (bodyVersion !== undefined && bodyVersion !== null) {
    if (typeof bodyVersion !== 'number' || !Number.isInteger(bodyVersion) || bodyVersion < 1) {
      return {
        valid: false,
        code: 'INVALID_CONCURRENCY_TOKEN',
        error: 'Field expectedVersion pada body harus berupa bilangan bulat positif minimal 1.',
      };
    }
    parsedBodyVersion = bodyVersion;
  }

  // Precedence and Conflict check:
  if (parsedHeaderVersion !== undefined && parsedBodyVersion !== undefined) {
    if (parsedHeaderVersion !== parsedBodyVersion) {
      return {
        valid: false,
        code: 'CONCURRENCY_TOKEN_MISMATCH',
        error: `Konflik token konkurensi: Nilai header x-expected-version (${parsedHeaderVersion}) dan body expectedVersion (${parsedBodyVersion}) tidak cocok.`,
      };
    }
    return { valid: true, expectedVersion: parsedBodyVersion };
  }

  if (parsedBodyVersion !== undefined) {
    return { valid: true, expectedVersion: parsedBodyVersion };
  }

  if (parsedHeaderVersion !== undefined) {
    return { valid: true, expectedVersion: parsedHeaderVersion };
  }

  return {
    valid: false,
    code: 'MISSING_CONCURRENCY_TOKEN',
    error: 'Token konkurensi (expectedVersion pada body atau header x-expected-version) wajib disertakan untuk melakukan mutasi.',
  };
}
