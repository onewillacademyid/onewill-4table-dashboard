import { notFound } from 'next/navigation';
import { DesignPreviewClient } from '@/components/DesignPreviewClient';

/**
 * Local-Development-Only Design Preview Route.
 * Provides a safe preview of all authenticated dashboard views and UI components
 * using isolated synthetic demo data.
 * STRICTLY UNAVAILABLE IN PRODUCTION: Returns 404 Not Found in production builds.
 */
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  return <DesignPreviewClient />;
}
