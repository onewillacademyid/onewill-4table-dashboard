import { requireServerAuth } from '@/lib/auth/protected-route-guard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DemoAuthModal } from '@/components/DemoAuthModal';

/**
 * Shared Protected Route Server Layout.
 * Enforces server-side session verification via Firebase Admin SDK & Firestore active user registry
 * for all enclosed routes (/dashboard, /reports, /reports/*, /reviews, /admin/*).
 * Anonymous, uninvited, and disabled sessions are redirected to /login before any component content renders.
 * Renders main application Header, Footer, and DemoAuthModal.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireServerAuth();

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <Footer />
      <DemoAuthModal />
    </>
  );
}
