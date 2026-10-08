import { requireServerAuth } from '@/lib/auth/protected-route-guard';
import { AdminUsersView } from '@/views/AdminUsersView';

export default async function AdminUsersPage() {
  // Server-enforced role protection: Only ADMIN and SUPER_ADMIN allowed
  await requireServerAuth(['ADMIN', 'SUPER_ADMIN']);
  return <AdminUsersView />;
}
