import { requireServerAuth } from '@/lib/auth/protected-route-guard';

/**
 * Shared Protected Route Server Layout.
 * Enforces server-side session verification via Firebase Admin SDK & Firestore active user registry
 * for all enclosed routes (/dashboard, /reports, /reports/*, /reviews, /admin/*).
 * Anonymous, uninvited, and disabled sessions are redirected to /login before any component content renders.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireServerAuth();
  return <>{children}</>;
}
