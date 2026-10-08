'use client';

import { useParams, useRouter } from 'next/navigation';
import { ReportEditorView } from '@/views/ReportEditorView';

export default function EditReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  if (!reportId) {
    return (
      <div className="py-12 text-center text-slate-500">
        Memuat editor laporan...
      </div>
    );
  }

  return (
    <ReportEditorView
      reportId={reportId}
      onBack={() => router.push(`/reports/${reportId}`)}
      onSaved={(savedId) => router.push(`/reports/${savedId}`)}
    />
  );
}
