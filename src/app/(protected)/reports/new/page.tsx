'use client';

import { useRouter } from 'next/navigation';
import { ReportEditorView } from '@/views/ReportEditorView';

export default function NewReportPage() {
  const router = useRouter();

  return (
    <ReportEditorView
      reportId={null}
      onBack={() => router.push('/reports')}
      onSaved={(savedId) => router.push(`/reports/${savedId}`)}
    />
  );
}
