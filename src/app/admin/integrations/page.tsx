import { requireServerAuth } from '@/lib/auth/protected-route-guard';
import { AdminIntegrationsView } from '@/views/AdminIntegrationsView';

export default async function AdminIntegrationsPage() {
  // Server-enforced role protection: Only ADMIN and SUPER_ADMIN allowed
  await requireServerAuth(['ADMIN', 'SUPER_ADMIN']);
  return <AdminIntegrationsView />;
}
