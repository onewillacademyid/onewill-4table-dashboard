'use client';

import { useParams, useRouter } from 'next/navigation';
import { ReportDetailView } from '@/views/ReportDetailView';

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  if (!reportId) {
    return (
      <div className="py-12 text-center text-slate-500">
        Memuat detail laporan...
      </div>
    );
  }

  return (
    <ReportDetailView
      reportId={reportId}
      onBack={() => router.push('/reports')}
      onEdit={(id) => router.push(`/reports/${id}/edit`)}
    />
  );
}
