'use client';

/**
 * DesignPreviewClient Component
 * Local-Development-Only interactive UI preview studio for inspecting all authenticated
 * dashboard screens, 4-Table reporting grids, and admin views using synthetic mock data.
 * All actions are simulated locally without side effects or backend API calls.
 */

import React, { useState, useEffect } from 'react';
import { DashboardView } from '@/views/DashboardView';
import { ReportsListView } from '@/views/ReportsListView';
import { ReportDetailView } from '@/views/ReportDetailView';
import { ReportEditorView } from '@/views/ReportEditorView';
import { ReviewsQueueView } from '@/views/ReviewsQueueView';
import { AdminUsersView } from '@/views/AdminUsersView';
import { AdminIntegrationsView } from '@/views/AdminIntegrationsView';
import { FourTableGrid } from '@/components/FourTableGrid';
import { reportRepository } from '@/services/reportRepository';
import { WeeklyReport } from '@/types';
import { ShieldAlert, Monitor, Smartphone, Tablet, Layers, Sparkles } from 'lucide-react';

type PreviewScreen = 
  | 'dashboard'
  | 'four-table'
  | 'reports-list'
  | 'report-detail'
  | 'report-editor'
  | 'reviews-queue'
  | 'admin-users'
  | 'admin-integrations';

type ViewportMode = 'responsive' | 'desktop' | 'tablet' | 'mobile';

export function DesignPreviewClient() {
  const [activeScreen, setActiveScreen] = useState<PreviewScreen>('dashboard');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('responsive');
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-2026-w40-akd');
  const [sampleReport, setSampleReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    async function loadSample() {
      const reports = await reportRepository.listReports();
      const found = reports.find(r => r.id === selectedReportId) || reports[0];
      setSampleReport(found || null);
    }
    loadSample();
  }, [selectedReportId]);

  const getViewportWidthClass = () => {
    switch (viewportMode) {
      case 'desktop': return 'max-w-[1440px] mx-auto border-x border-slate-300 shadow-2xl';
      case 'tablet': return 'max-w-[768px] mx-auto border-x border-slate-300 shadow-2xl';
      case 'mobile': return 'max-w-[390px] mx-auto border-x border-slate-300 shadow-2xl';
      default: return 'w-full';
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Banner: Local Development Preview Indicator */}
      <div className="bg-gradient-to-r from-amber-600 via-purple-700 to-[#35115A] text-white text-xs px-4 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-[11px]">
            DEVELOPMENT PREVIEW STUDIO • LOCAL DEV ONLY
          </span>
          <span className="hidden sm:inline text-amber-200/80">• Data Simulasi Terisolasi (Tanpa Efek Samping API)</span>
        </div>
        <div className="flex items-center space-x-1 text-[11px] font-mono text-amber-100/90">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Swiss + Bento UI Redesign Preview</span>
        </div>
      </div>

      {/* Control Bar: Screen Tabs & Viewport Switcher */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 px-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Mobile Dropdown Navigation Selector */}
        <div className="block md:hidden">
          <label htmlFor="preview-screen-select" className="sr-only">Pilih Layar Pratinjau</label>
          <select
            id="preview-screen-select"
            value={activeScreen}
            onChange={(e) => setActiveScreen(e.target.value as PreviewScreen)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl min-h-[44px] cursor-pointer"
          >
            <option value="dashboard">📊 Dashboard Utama</option>
            <option value="four-table">📋 Grid 4-Tabel Bento</option>
            <option value="reports-list">📂 Daftar Laporan</option>
            <option value="report-detail">🔍 Rincian Laporan</option>
            <option value="report-editor">✏-[#] Editor Laporan</option>
            <option value="reviews-queue">⏳ Antrean Tinjauan</option>
            <option value="admin-users">👥 Kelola Pengguna</option>
            <option value="admin-integrations">🔗 Integrasi Drive</option>
          </select>
        </div>

        {/* Desktop & Tablet Pill Navigation */}
        <div className="hidden md:flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'four-table', label: '📋 Grid 4-Tabel' },
            { id: 'reports-list', label: '📂 Daftar Laporan' },
            { id: 'report-detail', label: '🔍 Rincian' },
            { id: 'report-editor', label: '✏️ Editor' },
            { id: 'reviews-queue', label: '⏳ Antrean Tinjauan' },
            { id: 'admin-users', label: '👥 Kelola Pengguna' },
            { id: 'admin-integrations', label: '🔗 Integrasi Drive' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveScreen(tab.id as PreviewScreen)}
              className={`px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer min-h-[38px] flex items-center ${
                activeScreen === tab.id
                  ? 'bg-[#6C2AA6] text-white shadow-xs'
                  : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Viewport Width Controls */}
        <div className="flex items-center justify-between sm:justify-end space-x-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700">
          <span className="text-[11px] text-slate-400 font-semibold px-2">Lebar layar:</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewportMode('responsive')}
              title="Responsif Penuh"
              className={`p-2 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                viewportMode === 'responsive' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('desktop')}
              title="Desktop 1440px"
              className={`p-2 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                viewportMode === 'desktop' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              title="Tablet 768px"
              className={`p-2 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                viewportMode === 'tablet' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              title="Mobile 390px"
              className={`p-2 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                viewportMode === 'mobile' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Screen Render Container */}
      <div className="flex-1 p-4 sm:p-6 bg-slate-950 overflow-y-auto">
        <div className={`transition-all duration-300 bg-slate-50 text-slate-900 rounded-2xl min-h-[85vh] ${getViewportWidthClass()}`}>
          {activeScreen === 'dashboard' && (
            <DashboardView
              onOpenReport={(id) => { setSelectedReportId(id); setActiveScreen('report-detail'); }}
              onNewReport={() => setActiveScreen('report-editor')}
              onNavigateToReviews={() => setActiveScreen('reviews-queue')}
            />
          )}

          {activeScreen === 'four-table' && sampleReport && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-black text-[#35115A]">Pratinjau Komponen Grid 4-Tabel (Bento Grid)</h2>
                <p className="text-xs text-slate-500 font-medium">Capaian, Kendala, Sasaran, dan Dukungan dalam Tata Letak 2x2 Bento Grid.</p>
              </div>
              <FourTableGrid
                sections={sampleReport.sections}
                onChange={() => {}}
                readOnly={true}
              />
            </div>
          )}

          {activeScreen === 'reports-list' && (
            <ReportsListView
              onOpenReport={(id) => { setSelectedReportId(id); setActiveScreen('report-detail'); }}
              onNewReport={() => setActiveScreen('report-editor')}
            />
          )}

          {activeScreen === 'report-detail' && (
            <ReportDetailView
              reportId={selectedReportId}
              onBack={() => setActiveScreen('reports-list')}
              onEdit={() => setActiveScreen('report-editor')}
            />
          )}

          {activeScreen === 'report-editor' && (
            <ReportEditorView
              reportId={selectedReportId}
              onBack={() => setActiveScreen('reports-list')}
              onSaved={() => setActiveScreen('report-detail')}
            />
          )}

          {activeScreen === 'reviews-queue' && (
            <ReviewsQueueView
              onOpenReport={(id) => { setSelectedReportId(id); setActiveScreen('report-detail'); }}
            />
          )}

          {activeScreen === 'admin-users' && (
            <AdminUsersView />
          )}

          {activeScreen === 'admin-integrations' && (
            <AdminIntegrationsView />
          )}
        </div>
      </div>
    </div>
  );
}
