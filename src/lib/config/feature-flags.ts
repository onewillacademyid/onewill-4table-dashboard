/**
 * Onewill Academy | Server-Only Feature Gate Safeguards
 * PRD v1.1 & Governance Guidelines Compliant.
 */

// Strict runtime safeguard against client-side execution/bundling
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Feature flags module imported on client side!');
}

/**
 * Evaluates whether Admin mutations (invitations, user role changes, deactivation) are enabled on the server.
 * Environment variable: ADMIN_MUTATIONS_ENABLED (default: false).
 */
export function isAdminMutationEnabled(): boolean {
  return process.env.ADMIN_MUTATIONS_ENABLED === 'true';
}

/**
 * Evaluates whether live Firestore report writes (creation, updates, status transitions) are enabled on the server.
 * Environment variable: REPORTS_FIRESTORE_WRITES_ENABLED (default: false).
 * STRICT RULE: Disabled (false) during Phase C1.
 */
export function isReportWriteEnabled(): boolean {
  return process.env.REPORTS_FIRESTORE_WRITES_ENABLED === 'true';
}
