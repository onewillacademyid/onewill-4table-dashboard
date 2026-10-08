'use client';

import { useRouter } from 'next/navigation';
import { DashboardView } from '@/views/DashboardView';

export function HomePageClient() {
  const router = useRouter();

  return (
    <DashboardView
      onOpenReport={(reportId) => router.push(`/reports/${reportId}`)}
      onNewReport={() => router.push('/reports/new')}
      onNavigateToReviews={() => router.push('/reviews')}
    />
  );
}
