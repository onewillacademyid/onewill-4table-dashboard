/**
 * Onewill Academy | M4.1-E2-B1 Server-Side Exact-Target Write Guard
 * PRD v1.1 & Phase E2 Controlled Write Specification.
 *
 * Provides a fail-closed, exact-target authorization constraint for controlled E2-B testing.
 * Binds all of:
 *  - Verified Firebase Auth UID: lT7wNY1do3XOJ4cT5F7hTLT3SOe2 (adhimonow@gmail.com)
 *  - Team ID: team-operasional
 *  - ISO Year: 2026
 *  - ISO Week: 42
 *  - Deterministic Document ID: rep_2026_w42_team-operasional
 *  - Operation: CREATE_DRAFT only
 *
 * Requirements:
 *  - Both REPORTS_FIRESTORE_WRITES_ENABLED and CONTROLLED_WRITE_E2B_ENABLED must permit the operation.
 *  - Default state is strictly disabled (fails closed).
 *  - Server-only execution.
 *  - Never trusts client-supplied authorId, teamId, role, or docId.
 */

import { User } from '@/types';
import { deriveReportDocId } from '@/lib/validation/report';
import { isReportWriteEnabled } from '@/lib/config/feature-flags';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Exact-target write guard imported on client side!');
}

export interface ExactTargetBoundValues {
  uid: string;
  email: string;
  teamId: string;
  year: number;
  weekNumber: number;
  docId: string;
  operation: string;
}

export const EXACT_TARGET_BOUND_VALUES: ExactTargetBoundValues = {
  uid: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
  email: 'adhimonow@gmail.com',
  teamId: 'team-operasional',
  year: 2026,
  weekNumber: 42,
  docId: 'rep_2026_w42_team-operasional',
  operation: 'CREATE_DRAFT',
};

export type ExactTargetErrorCode =
  | 'MUTATIONS_DISABLED'
  | 'EXACT_TARGET_GUARD_DISABLED'
  | 'EXACT_TARGET_GUARD_REJECTED';

export interface ExactTargetGuardResult {
  allowed: boolean;
  code?: ExactTargetErrorCode;
  error?: string;
  derivedDocId?: string;
}

export interface ExactTargetVerificationOptions {
  author: User;
  input: {
    year: number;
    weekNumber: number;
    [key: string]: unknown;
  };
  operation?: string;
}

// Test override support (strictly isolated to test/development)
export interface ExactTargetTestConfig {
  enabled?: boolean;
  normalWriteEnabled?: boolean;
  enforceOnMockRepo?: boolean;
  targetOverride?: Partial<ExactTargetBoundValues>;
}

let testConfigOverride: ExactTargetTestConfig | null = null;

/**
 * Checks whether the test-only exact-target guard is enabled.
 * Environment variable: CONTROLLED_WRITE_E2B_ENABLED (default: false).
 */
export function isExactTargetGuardEnabled(): boolean {
  if (testConfigOverride && typeof testConfigOverride.enabled === 'boolean') {
    return testConfigOverride.enabled;
  }
  return process.env.CONTROLLED_WRITE_E2B_ENABLED === 'true';
}

/**
 * Checks whether exact-target guard enforcement is forced on mock repositories during testing.
 */
export function isExactTargetEnforcedOnMockRepo(): boolean {
  return Boolean(testConfigOverride?.enforceOnMockRepo);
}

/**
 * Test harness override for unit tests and security regressions.
 * Prohibited in production.
 */
export function setExactTargetGuardForTesting(config: ExactTargetTestConfig | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY ERROR: Exact-target guard test overrides are prohibited in production!');
  }
  testConfigOverride = config;
}

/**
 * Resets test overrides.
 */
export function resetExactTargetGuardForTesting(): void {
  if (process.env.NODE_ENV === 'production') return;
  testConfigOverride = null;
}

/**
 * Evaluates all fail-closed bindings for the exact-target guard.
 *
 * Returns:
 *  - { allowed: true, derivedDocId } if all bindings match and both gates permit the write.
 *  - { allowed: false, code, error } if any binding fails or any gate is disabled.
 */
export function verifyExactTargetGuard(options: ExactTargetVerificationOptions): ExactTargetGuardResult {
  const { author, input, operation = 'CREATE_DRAFT' } = options;

  // Gate 1: Normal write flag must be enabled
  const normalWriteActive =
    testConfigOverride && typeof testConfigOverride.normalWriteEnabled === 'boolean'
      ? testConfigOverride.normalWriteEnabled
      : isReportWriteEnabled();

  if (!normalWriteActive) {
    return {
      allowed: false,
      code: 'MUTATIONS_DISABLED',
      error: 'Feature Gate: Firestore report writes are currently disabled on the server (REPORTS_FIRESTORE_WRITES_ENABLED=false).',
    };
  }

  // Gate 2: Test-only exact-target guard must be enabled
  if (!isExactTargetGuardEnabled()) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_DISABLED',
      error: 'Security Guard: Controlled write E2-B exact-target guard is disabled on the server (CONTROLLED_WRITE_E2B_ENABLED=false).',
    };
  }

  const expected = {
    ...EXACT_TARGET_BOUND_VALUES,
    ...(testConfigOverride?.targetOverride || {}),
  };

  // Binding 1: Operation must be CREATE_DRAFT
  if (operation !== expected.operation) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: Operasi '${operation}' tidak diizinkan. Hanya operasi '${expected.operation}' yang diizinkan pada pengujian E2-B.`,
    };
  }

  // Binding 2: Verified Firebase Auth UID
  if (!author || author.id !== expected.uid) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: User ID '${author?.id || 'unknown'}' tidak cocok dengan target otorisasi E2-B (${expected.uid}).`,
    };
  }

  // Binding 3: Team ID (derived from verified server session)
  if (author.teamId !== expected.teamId) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: Team ID '${author?.teamId || 'unknown'}' tidak cocok dengan target otorisasi E2-B (${expected.teamId}).`,
    };
  }

  // Binding 4: ISO Year
  if (input.year !== expected.year) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: Tahun ISO '${input.year}' tidak cocok dengan target otorisasi E2-B (${expected.year}).`,
    };
  }

  // Binding 5: ISO Week
  if (input.weekNumber !== expected.weekNumber) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: Pekan ISO '${input.weekNumber}' tidak cocok dengan target otorisasi E2-B (${expected.weekNumber}).`,
    };
  }

  // Binding 6: Deterministic Document ID derived from canonical validated input
  let derivedDocId: string;
  try {
    derivedDocId = deriveReportDocId(author.teamId, input.year, input.weekNumber);
  } catch (err: any) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: Gagal menderivasi ID dokumen: ${err.message}`,
    };
  }

  if (derivedDocId !== expected.docId) {
    return {
      allowed: false,
      code: 'EXACT_TARGET_GUARD_REJECTED',
      error: `Akses ditolak: Document ID '${derivedDocId}' tidak cocok dengan target otorisasi E2-B (${expected.docId}).`,
    };
  }

  return {
    allowed: true,
    derivedDocId,
  };
}
