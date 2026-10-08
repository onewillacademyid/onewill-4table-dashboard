'use client';

import { useRouter } from 'next/navigation';
import { ReportsListView } from '@/views/ReportsListView';

export default function ReportsPage() {
  const router = useRouter();

  return (
    <ReportsListView
      onOpenReport={(reportId) => router.push(`/reports/${reportId}`)}
      onNewReport={() => router.push('/reports/new')}
    />
  );
}
