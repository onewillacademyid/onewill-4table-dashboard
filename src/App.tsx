/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Main Application Shell & View Routing
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { DemoAuthModal } from './components/DemoAuthModal';
import { DashboardView } from './views/DashboardView';
import { ReportEditorView } from './views/ReportEditorView';
import { ReportDetailView } from './views/ReportDetailView';
import { ReportsListView } from './views/ReportsListView';
import { ReviewsQueueView } from './views/ReviewsQueueView';
import { AdminUsersView } from './views/AdminUsersView';
import { AdminIntegrationsView } from './views/AdminIntegrationsView';

type NavigationRoute = 
  | { view: 'dashboard' }
  | { view: 'reports' }
  | { view: 'editor'; reportId?: string | null }
  | { view: 'detail'; reportId: string }
  | { view: 'reviews' }
  | { view: 'users' }
  | { view: 'integrations' };

const AppContent: React.FC = () => {
  const [route, setRoute] = useState<NavigationRoute>({ view: 'dashboard' });

  const handleNavigate = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        setRoute({ view: 'dashboard' });
        break;
      case 'reports':
        setRoute({ view: 'reports' });
        break;
      case 'reviews':
        setRoute({ view: 'reviews' });
        break;
      case 'users':
        setRoute({ view: 'users' });
        break;
      case 'integrations':
        setRoute({ view: 'integrations' });
        break;
      default:
        setRoute({ view: 'dashboard' });
    }
  };

  const handleOpenReport = (reportId: string) => {
    setRoute({ view: 'detail', reportId });
  };

  const handleNewReport = () => {
    setRoute({ view: 'editor', reportId: null });
  };

  const handleEditReport = (reportId: string) => {
    setRoute({ view: 'editor', reportId });
  };

  const getCurrentTabId = (): string => {
    if (route.view === 'detail' || route.view === 'editor') return 'reports';
    return route.view;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-[#242038]">
      {/* Top Header conforming to Top Bar Contract */}
      <Header
        currentTab={getCurrentTabId()}
        onNavigate={handleNavigate}
        onNewReport={handleNewReport}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {route.view === 'dashboard' && (
          <DashboardView
            onOpenReport={handleOpenReport}
            onNewReport={handleNewReport}
            onNavigateToReviews={() => setRoute({ view: 'reviews' })}
          />
        )}

        {route.view === 'reports' && (
          <ReportsListView
            onOpenReport={handleOpenReport}
            onNewReport={handleNewReport}
          />
        )}

        {route.view === 'editor' && (
          <ReportEditorView
            reportId={route.reportId}
            onBack={() => setRoute({ view: 'reports' })}
            onSaved={(savedId) => setRoute({ view: 'detail', reportId: savedId })}
          />
        )}

        {route.view === 'detail' && (
          <ReportDetailView
            reportId={route.reportId}
            onBack={() => setRoute({ view: 'reports' })}
            onEdit={handleEditReport}
          />
        )}

        {route.view === 'reviews' && (
          <ReviewsQueueView onOpenReport={handleOpenReport} />
        )}

        {route.view === 'users' && <AdminUsersView />}

        {route.view === 'integrations' && <AdminIntegrationsView />}
      </main>

      {/* Corporate Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#35115A]">Onewill Academy</span>
            <span>·</span>
            <span>The 4 Table Weekly Progress Dashboard</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Palet Warna: Usulan Resmi Onewill</span>
            <span>·</span>
            <span>Zona Waktu: Asia/Jakarta (WIB)</span>
            <span>·</span>
            <span className="font-medium text-slate-600">Prototipe UI Mode Demo</span>
          </div>
        </div>
      </footer>

      {/* Simulated Google Sign-In & Persona Switcher Modal */}
      <DemoAuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
