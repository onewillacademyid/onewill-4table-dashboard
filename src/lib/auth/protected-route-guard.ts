import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyServerSession } from '@/lib/auth/server-auth';
import { UserRole, User } from '@/types';

/**
 * Server-side route guard for Next.js Server Components and Layouts.
 * Verifies HttpOnly session cookie with Firebase Admin SDK and Firestore user registry.
 * - Redirects unauthenticated browser sessions to /login.
 * - Redirects unauthorized roles (e.g. non-admin accessing /admin) to /dashboard.
 */
export async function requireServerAuth(allowedRoles?: UserRole[]): Promise<User> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value || '';

  const authResult = await verifyServerSession(sessionCookie);

  if (!authResult.authenticated || !authResult.user) {
    redirect('/login');
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(authResult.user.role)) {
      redirect('/dashboard');
    }
  }

  return authResult.user;
}
