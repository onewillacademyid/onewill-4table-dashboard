/**
 * GET /api/admin/users
 * Secure Route Handler for listing registered users in Firestore user registry.
 * Strictly requires verified ADMIN or SUPER_ADMIN server session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyApiServerUser } from '@/lib/auth/rbac-server';
import { FirestoreUserDocument } from '@/types/firestore';
import { UserRole } from '@/types';
import { isAdminMutationEnabled } from '@/lib/auth/rbac-policy';

export async function GET(request: NextRequest) {
  // 1. Session & Role Verification
  const { user, errorResponse } = await verifyApiServerUser(['ADMIN', 'SUPER_ADMIN']);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();
    const roleFilter = searchParams.get('role') as UserRole | null;
    const teamFilter = searchParams.get('teamId');

    const db = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection('users');

    if (roleFilter) {
      query = query.where('role', '==', roleFilter);
    }

    if (teamFilter && teamFilter !== 'ALL') {
      query = query.where('teamId', '==', teamFilter);
    }

    const snapshot = await query.get();
    let usersList: FirestoreUserDocument[] = snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);

    // Apply search filtering in memory if query present
    if (searchQuery) {
      usersList = usersList.filter(
        (u) =>
          u.displayName.toLowerCase().includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery) ||
          u.uid.toLowerCase().includes(searchQuery)
      );
    }

    // Sort by createdAt descending
    usersList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Sanitize user items for JSON response
    const sanitizedUsers = usersList.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email.split('@')[0],
      photoURL: u.photoURL || '',
      role: u.role,
      teamId: u.teamId,
      active: u.active,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    return NextResponse.json({
      users: sanitizedUsers,
      total: sanitizedUsers.length,
      mutationsEnabled: isAdminMutationEnabled(),
    });
  } catch (err: any) {
    console.error('Failed to fetch user registry:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar pengguna dari database.' },
      { status: 500 }
    );
  }
}
