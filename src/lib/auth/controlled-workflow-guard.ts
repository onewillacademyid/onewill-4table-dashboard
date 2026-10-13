/**
 * Onewill Academy | M4.2-F Server-Side Controlled Workflow Guard
 * PRD v1.1 & Phase F Controlled Write Specification.
 *
 * Provides a fail-closed, exact-target authorization constraint for controlled M4.2-F testing.
 * Strictly binds:
 *  - Firebase Project: onewill-academy-weekly-report
 *  - Deterministic Target Report ID: rep_2026_w42_team-operasional
 *  - Verified Contributor UID: lT7wNY1do3XOJ4cT5F7hTLT3SOe2 (adhimonow@gmail.com)
 *  - Verified Reviewer UID: u21yIYrhHBOTyIuDJs3CTnxoBVY2 (onewillacademy.id@gmail.com)
 *  - Allowed Operations: 'SAVE_DRAFT' | 'SUBMIT' | 'REQUEST_REVISION' | 'APPROVE'
 *  - Explicit Operation Budget: Maximum 6 discrete workflow transitions
 *
 * Requirements:
 *  - Server-only execution.
 *  - Disabled by default (fails closed unless CONTROLLED_WORKFLOW_TEST_ENABLED === 'true').
 *  - Never trusts client-supplied authorId, role, or docId.
 *  - Does NOT alter existing RBAC policies.
 */

import { User } from '@/types';
import { isReportWorkflowWriteEnabled } from '@/lib/config/feature-flags';
import { getAdminDb } from '@/lib/firebase/admin';

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Controlled workflow guard imported on client side!');
}

export const CONTROLLED_WORKFLOW_BOUND_VALUES = {
  projectId: 'onewill-academy-weekly-report',
  reportId: 'rep_2026_w42_team-operasional',
  contributorUid: 'lT7wNY1do3XOJ4cT5F7hTLT3SOe2',
  contributorEmail: 'adhimonow@gmail.com',
  reviewerUid: 'u21yIYrhHBOTyIuDJs3CTnxoBVY2',
  reviewerEmail: 'onewillacademy.id@gmail.com',
  allowedOperations: ['SAVE_DRAFT', 'SUBMIT', 'REQUEST_REVISION', 'APPROVE'] as const,
  maxOperationBudget: 6,
};

export type ControlledWorkflowOperation = 'SAVE_DRAFT' | 'SUBMIT' | 'REQUEST_REVISION' | 'APPROVE';

export type ControlledWorkflowErrorCode =
  | 'MUTATION_DISABLED'
  | 'CONTROLLED_WORKFLOW_GUARD_DISABLED'
  | 'CONTROLLED_WORKFLOW_GUARD_REJECTED'
  | 'CONTROLLED_WORKFLOW_BUDGET_EXHAUSTED';

export interface ControlledWorkflowGuardResult {
  allowed: boolean;
  code?: ControlledWorkflowErrorCode;
  error?: string;
}

export interface ControlledWorkflowVerificationOptions {
  user: User;
  reportId: string;
  operation: ControlledWorkflowOperation;
  projectId?: string;
}

// In-memory operation counter for the 6-operation budget enforcement
let operationCounter = 0;

// Test override support (strictly isolated to test/development)
export interface ControlledWorkflowTestConfig {
  enabled?: boolean;
  workflowWriteEnabled?: boolean;
  enforceOnMockRepo?: boolean;
  targetOverride?: {
    projectId?: string;
    reportId?: string;
    contributorUid?: string;
    reviewerUid?: string;
    maxOperationBudget?: number;
  };
}

let testConfigOverride: ControlledWorkflowTestConfig | null = null;

/**
 * Checks whether the test-only controlled workflow guard is enabled.
 * Environment variable: CONTROLLED_WORKFLOW_TEST_ENABLED (default: false).
 */
export function isControlledWorkflowGuardEnabled(): boolean {
  if (testConfigOverride && typeof testConfigOverride.enabled === 'boolean') {
    return testConfigOverride.enabled;
  }
  return process.env.CONTROLLED_WORKFLOW_TEST_ENABLED === 'true';
}

/**
 * Checks whether controlled workflow guard enforcement is forced on mock repositories during testing.
 */
export function isControlledWorkflowGuardEnforcedOnMockRepo(): boolean {
  return Boolean(testConfigOverride?.enforceOnMockRepo);
}

/**
 * Test harness override for unit tests and security regressions.
 * Prohibited in production.
 */
export function setControlledWorkflowGuardForTesting(config: ControlledWorkflowTestConfig | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY ERROR: Controlled workflow guard test overrides are prohibited in production!');
  }
  testConfigOverride = config;
  operationCounter = 0;
}

/**
 * Resets test overrides and operation budget counter.
 */
export function resetControlledWorkflowGuardForTesting(): void {
  if (process.env.NODE_ENV === 'production') return;
  testConfigOverride = null;
  operationCounter = 0;
}

/**
 * Returns current consumed operation count.
 */
export function getControlledWorkflowOperationCount(): number {
  return operationCounter;
}

/**
 * Evaluates all fail-closed bindings for the controlled workflow guard.
 *
 * Checks:
 *  1. Workflow write gates (REPORTS_FIRESTORE_WRITES_ENABLED && REPORT_WORKFLOW_WRITES_ENABLED)
 *  2. Controlled workflow guard gate (CONTROLLED_WORKFLOW_TEST_ENABLED)
 *  3. Firebase Project ID binding ('onewill-academy-weekly-report')
 *  4. Report Document ID binding ('rep_2026_w42_team-operasional')
 *  5. Allowed Operation check ('SAVE_DRAFT' | 'SUBMIT' | 'REQUEST_REVISION' | 'APPROVE')
 *  6. Actor Identity binding (Contributor for SAVE_DRAFT/SUBMIT; Reviewer for REQUEST_REVISION/APPROVE)
 *  7. Operation budget limit (max 6 operations)
 */
export function verifyControlledWorkflowGuard(
  options: ControlledWorkflowVerificationOptions
): ControlledWorkflowGuardResult {
  const { user, reportId, operation } = options;

  // Gate 1: Both workflow write flags must be enabled
  const workflowWriteActive =
    testConfigOverride && typeof testConfigOverride.workflowWriteEnabled === 'boolean'
      ? testConfigOverride.workflowWriteEnabled
      : isReportWorkflowWriteEnabled();

  if (!workflowWriteActive) {
    return {
      allowed: false,
      code: 'MUTATION_DISABLED',
      error: 'Feature Gate: Workflow writes are disabled on the server (REPORT_WORKFLOW_WRITES_ENABLED=false).',
    };
  }

  // Gate 2: Controlled workflow guard must be enabled
  if (!isControlledWorkflowGuardEnabled()) {
    return {
      allowed: false,
      code: 'CONTROLLED_WORKFLOW_GUARD_DISABLED',
      error: 'Security Guard: Controlled workflow guard is disabled on the server (CONTROLLED_WORKFLOW_TEST_ENABLED=false).',
    };
  }

  const expected = {
    ...CONTROLLED_WORKFLOW_BOUND_VALUES,
    ...(testConfigOverride?.targetOverride || {}),
  };

  // Binding 3: Firebase Project ID check
  let currentProjectId = options.projectId;
  if (!currentProjectId) {
    try {
      currentProjectId = (getAdminDb() as any).projectId || process.env.FIREBASE_PROJECT_ID;
    } catch {
      currentProjectId = process.env.FIREBASE_PROJECT_ID;
    }
  }

  if (currentProjectId && currentProjectId !== expected.projectId) {
    return {
      allowed: false,
      code: 'CONTROLLED_WORKFLOW_GUARD_REJECTED',
      error: `Akses ditolak: Firebase Project ID '${currentProjectId}' tidak cocok dengan target uji alur terkontrol (${expected.projectId}).`,
    };
  }

  // Binding 4: Exact Report Document ID binding
  if (reportId !== expected.reportId) {
    return {
      allowed: false,
      code: 'CONTROLLED_WORKFLOW_GUARD_REJECTED',
      error: `Akses ditolak: Report ID '${reportId}' tidak diizinkan. Hanya laporan '${expected.reportId}' yang diizinkan pada uji alur terkontrol M4.2-F.`,
    };
  }

  // Binding 5: Allowed Operations
  if (!expected.allowedOperations.includes(operation)) {
    return {
      allowed: false,
      code: 'CONTROLLED_WORKFLOW_GUARD_REJECTED',
      error: `Akses ditolak: Operasi '${operation}' tidak diizinkan pada uji alur terkontrol.`,
    };
  }

  // Binding 6: Exact Actor Role & UID binding
  if (!user || !user.id) {
    return {
      allowed: false,
      code: 'CONTROLLED_WORKFLOW_GUARD_REJECTED',
      error: 'Akses ditolak: Identitas aktor tidak valid atau sesi belum terverifikasi.',
    };
  }

  if (operation === 'SAVE_DRAFT' || operation === 'SUBMIT') {
    // Must be verified existing author/contributor
    if (user.id !== expected.contributorUid) {
      return {
        allowed: false,
        code: 'CONTROLLED_WORKFLOW_GUARD_REJECTED',
        error: `Akses ditolak: Pengguna '${user.id}' (${user.email}) bukan penyusun terotorisasi (${expected.contributorUid}) untuk operasi ${operation}.`,
      };
    }
  } else if (operation === 'REQUEST_REVISION' || operation === 'APPROVE') {
    // Must be verified existing Super Admin reviewer
    if (user.id !== expected.reviewerUid) {
      return {
        allowed: false,
        code: 'CONTROLLED_WORKFLOW_GUARD_REJECTED',
        error: `Akses ditolak: Pengguna '${user.id}' (${user.email}) bukan peninjau terotorisasi (${expected.reviewerUid}) untuk operasi ${operation}.`,
      };
    }
  }

  // Binding 7: Explicit 6-Operation Budget Limit
  if (operationCounter >= expected.maxOperationBudget) {
    return {
      allowed: false,
      code: 'CONTROLLED_WORKFLOW_BUDGET_EXHAUSTED',
      error: `Batas kuota operasi pengujian tercapai (${operationCounter} / ${expected.maxOperationBudget}). Tidak ada mutasi lebih lanjut yang diizinkan.`,
    };
  }

  // Increment consumed operation budget on successful authorization
  operationCounter++;

  return {
    allowed: true,
  };
}
