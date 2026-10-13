'use client';

/**
 * Isolated Development/Testing Harness for Workflow UI (Client Component).
 * STRICT SECURITY BOUNDARY:
 * Only imported and rendered by the server-side TestEditorHarnessPage when NODE_ENV !== 'production'.
 */

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportEditorView } from '@/views/ReportEditorView';
import { ReportDetailView } from '@/views/ReportDetailView';
import { ReviewsQueueView } from '@/views/ReviewsQueueView';
import { AuthContext } from '@/context/AuthContext';
import { User, UserRole, WeeklyReport } from '@/types';
import { canApproveReport, canEditReport } from '@/lib/auth/rbac-policy';

function TestHarnessContent() {
  const searchParams = useSearchParams();
  const roleParam = (searchParams.get('role') || 'CONTRIBUTOR').toUpperCase() as UserRole;
  const isAuthParam = searchParams.get('auth') !== 'false';
  const isActiveParam = searchParams.get('active') !== 'false';
  const isPreviewParam = searchParams.get('preview') === 'true';
  const viewParam = searchParams.get('view') || 'editor';
  const reportIdParam = searchParams.get('reportId') || null;
  const userIdParam = searchParams.get('userId') || 'test-user-id-adhi';
  const teamIdParam = searchParams.get('teamId') || 'team-operasional';
  const teamNameParam = searchParams.get('teamName') || 'Operasional & SDM';
  const apiEndpointParam = searchParams.get('apiEndpoint') || '/api/test-harness/reports';

  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  const testUser: User = {
    id: userIdParam,
    name: userIdParam === 'test-user-id-lead' ? 'Budi Santoso (Lead)' : 'Adhi Monow (Test)',
    email: `${userIdParam}@onewill.test`,
    role: roleParam,
    teamId: teamIdParam,
    teamName: teamNameParam,
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
    canApprove: (report: WeeklyReport) => {
      if (!isAuthParam || !testUser) return { allowed: false, reason: 'Pengguna belum terotentikasi.' };
      return canApproveReport(testUser, report);
    },
    canEdit: (report: WeeklyReport) => {
      if (!isAuthParam || !testUser) return false;
      return canEditReport(testUser, report).allowed;
    },
    canSubmit: (_report: WeeklyReport) => isAuthParam && isActiveParam,
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

        {viewParam === 'detail' ? (
          <ReportDetailView
            reportId={reportIdParam || 'rep_test_001'}
            isDesignPreview={isPreviewParam}
            apiEndpoint={apiEndpointParam}
            onBack={() => setNavigationTarget('/reports')}
            onEdit={(id) => setNavigationTarget(`/reports/${id}/edit`)}
          />
        ) : viewParam === 'reviews' ? (
          <ReviewsQueueView
            isDesignPreview={isPreviewParam}
            apiEndpoint={apiEndpointParam}
            onOpenReport={(id) => setNavigationTarget(`/reports/${id}`)}
          />
        ) : (
          <ReportEditorView
            reportId={reportIdParam}
            isDesignPreview={isPreviewParam}
            apiEndpoint={apiEndpointParam}
            onBack={() => setNavigationTarget('/reports')}
            onSaved={(id) => setNavigationTarget(`/reports/${id}`)}
          />
        )}
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
