'use client';

/**
 * Isolated Development/Testing Harness for ReportEditorView (Client Component).
 * STRICT SECURITY BOUNDARY:
 * Only imported and rendered by the server-side TestEditorHarnessPage when NODE_ENV !== 'production'.
 */

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportEditorView } from '@/views/ReportEditorView';
import { AuthContext } from '@/context/AuthContext';
import { User, UserRole, WeeklyReport } from '@/types';

function TestHarnessContent() {
  const searchParams = useSearchParams();
  const roleParam = (searchParams.get('role') || 'CONTRIBUTOR').toUpperCase() as UserRole;
  const isAuthParam = searchParams.get('auth') !== 'false';
  const isActiveParam = searchParams.get('active') !== 'false';
  const isPreviewParam = searchParams.get('preview') === 'true';

  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  const testUser: User = {
    id: 'test-user-id-adhi',
    name: 'Adhi Monow (Test)',
    email: 'adhimonow@gmail.com',
    role: roleParam,
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    avatarColor: '#6C2AA6',
    avatarInitials: 'AM',
    active: isActiveParam,
    lastActive: '2026-10-11',
  };

  const mockAuthValue = {
    currentUser: isAuthParam ? testUser : null,
    allUsers: [testUser],
    isAuthenticated: isAuthParam,
    isLiveAuth: isAuthParam,
    isSessionLoading: false,
    switchUser: () => {},
    refreshSession: async () => {},
    logout: async () => {},
    canApprove: (_report: WeeklyReport) => ({ allowed: false }),
    canEdit: (_report: WeeklyReport) => true,
    canSubmit: (_report: WeeklyReport) => true,
    canArchive: (_report: WeeklyReport) => false,
    canManageUsers: roleParam === 'SUPER_ADMIN' || roleParam === 'ADMIN',
    isLoginModalOpen: false,
    openLoginModal: () => {},
    closeLoginModal: () => {},
  };

  return (
    <AuthContext.Provider value={mockAuthValue}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {navigationTarget && (
          <div 
            data-testid="test-navigation-indicator" 
            data-target={navigationTarget}
            className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 rounded-lg"
          >
            NAVIGATED_TO: {navigationTarget}
          </div>
        )}
        <ReportEditorView
          reportId={null}
          isDesignPreview={isPreviewParam}
          apiEndpoint="/api/test-harness/reports"
          onBack={() => setNavigationTarget('/reports')}
          onSaved={(id) => setNavigationTarget(`/reports/${id}`)}
        />
      </div>
    </AuthContext.Provider>
  );
}

export function TestEditorHarnessClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Memuat test harness...</div>}>
      <TestHarnessContent />
    </Suspense>
  );
}
