import { notFound } from 'next/navigation';
import { TestEditorHarnessClient } from './TestEditorHarnessClient';

/**
 * Server Component Gatekeeper for Test Editor Harness.
 * STRICT SECURITY BOUNDARY:
 * Exclusively accessible when:
 * 1. process.env.NODE_ENV === 'development'
 * 2. process.env.ENABLE_TEST_HARNESS === 'true'
 *
 * In all other circumstances (production, staging, CI, or dev without explicit flag),
 * calls notFound() at the server layer, returning HTTP 404 with zero client bundle exposure.
 */
export default function TestEditorHarnessPage() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isHarnessExplicitlyEnabled = process.env.ENABLE_TEST_HARNESS === 'true';

  if (!isDevelopment || !isHarnessExplicitlyEnabled) {
    notFound();
  }

  return <TestEditorHarnessClient />;
}
