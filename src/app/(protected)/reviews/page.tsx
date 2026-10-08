'use client';

import { useRouter } from 'next/navigation';
import { ReviewsQueueView } from '@/views/ReviewsQueueView';

export default function ReviewsPage() {
  const router = useRouter();

  return (
    <ReviewsQueueView
      onOpenReport={(reportId) => router.push(`/reports/${reportId}`)}
    />
  );
}
