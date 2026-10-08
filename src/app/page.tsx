import { requireServerAuth } from '@/lib/auth/protected-route-guard';
import { HomePageClient } from '@/components/HomePageClient';

export default async function HomePage() {
  // Server-enforced session verification for home route
  await requireServerAuth();
  return <HomePageClient />;
}
