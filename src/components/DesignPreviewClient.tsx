'use client';

/**
 * DesignPreviewClient Component
 * Local-Development-Only interactive UI preview studio for inspecting all authenticated
 * dashboard screens, 4-Table reporting grids, and admin views using synthetic mock data.
 * All actions are simulated locally without side effects or backend API calls.
 * Uses isolated iframe viewport rendering for accurate device media query simulation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Isolated Iframe Viewport Simulator
 * Ensures @media (min-width) queries respond to the target device width, not the outer window.
 */
function IframeViewport({ 
  children, 
  width, 
  className 
}: { 
  children: React.ReactNode; 
  width: string; 
  className?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body class="bg-slate-50 text-slate-900 font-sans antialiased m-0 p-4 sm:p-6 overflow-y-auto">
          <div id="preview-root"></div>
        </body>
      </html>
    `);
    doc.close();

    // Copy all style elements from host document into iframe
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    styleElements.forEach((el) => {
      doc.head.appendChild(el.cloneNode(true));
    });

    const root = doc.getElementById('preview-root');
    setMountNode(root);
  }, [width]);

  return (
    <div className="w-full flex justify-center overflow-x-auto py-4">
      <iframe
        ref={iframeRef}
        style={{ width, height: '85vh' }}
        className={`border border-slate-700/60 rounded-2xl shadow-2xl bg-slate-50 transition-all duration-300 ${className || ''}`}
        title="Design Preview Viewport"
      >
        {mountNode && createPortal(children, mountNode)}
      </iframe>
    </div>
  );
}

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

  const renderActiveScreenContent = () => (
    <>
      {activeScreen === 'dashboard' && (
        <DashboardView
          onOpenReport={(id) => { setSelectedReportId(id); setActiveScreen('report-detail'); }}
          onNewReport={() => setActiveScreen('report-editor')}
          onNavigateToReviews={() => setActiveScreen('reviews-queue')}
        />
      )}

      {activeScreen === 'four-table' && sampleReport && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-[#35115A]">Matriks pelaporan 4-tabel (Bento Grid)</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Tata letak 2x2 desktop dan 1 kolom bertumpuk pada mobile.</p>
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
    </>
  );

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Studio Header Banner: Compact & Professional */}
      <div className="bg-slate-950 border-b border-slate-800 text-xs px-4 py-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="font-bold tracking-wide text-amber-200 text-[11px]">
            PREVIEW STUDIO • LOKAL DEV ONLY
          </span>
          <span className="hidden sm:inline text-slate-400 text-[11px]">• Data Simulasi Terisolasi</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Swiss + Bento Redesign</span>
        </div>
      </div>

      {/* Control Bar: Compact Screen Tabs & Viewport Switcher */}
      <div className="bg-slate-800/90 border-b border-slate-700/80 p-2.5 px-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs">
        {/* Mobile Dropdown Navigation Selector */}
        <div className="block md:hidden">
          <label htmlFor="preview-screen-select" className="sr-only">Pilih Layar Pratinjau</label>
          <select
            id="preview-screen-select"
            value={activeScreen}
            onChange={(e) => setActiveScreen(e.target.value as PreviewScreen)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl min-h-[44px] cursor-pointer"
          >
            <option value="dashboard">📊 Dashboard Utama</option>
            <option value="four-table">📋 Grid 4-Tabel Bento</option>
            <option value="reports-list">📂 Daftar Laporan</option>
            <option value="report-detail">🔍 Rincian Laporan</option>
            <option value="report-editor">✏️ Editor Laporan</option>
            <option value="reviews-queue">⏳ Antrean Tinjauan</option>
            <option value="admin-users">👥 Kelola Pengguna</option>
            <option value="admin-integrations">🔗 Integrasi Drive</option>
          </select>
        </div>

        {/* Desktop & Tablet Pill Navigation */}
        <div className="hidden md:flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
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
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer text-xs ${
                activeScreen === tab.id
                  ? 'bg-[#6C2AA6] text-white font-semibold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Viewport Width Controls */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700/80">
          <span className="text-[11px] text-slate-400 font-medium px-1">Simulasi Layar:</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewportMode('responsive')}
              title="Responsif Penuh"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1 min-h-[36px] ${
                viewportMode === 'responsive' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Penuh</span>
            </button>
            <button
              onClick={() => setViewportMode('desktop')}
              title="Desktop 1440px"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1 min-h-[36px] ${
                viewportMode === 'desktop' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>1440px</span>
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              title="Tablet 768px"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1 min-h-[36px] ${
                viewportMode === 'tablet' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>768px</span>
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              title="Mobile 390px"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1 min-h-[36px] ${
                viewportMode === 'mobile' ? 'bg-[#6C2AA6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>390px</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screen Render Container */}
      <div className="flex-1 p-4 sm:p-6 bg-slate-950 overflow-y-auto">
        {viewportMode === 'responsive' ? (
          <div className="w-full bg-slate-50 text-slate-900 rounded-2xl min-h-[85vh] p-4 sm:p-6">
            {renderActiveScreenContent()}
          </div>
        ) : (
          <IframeViewport
            width={
              viewportMode === 'desktop'
                ? '1440px'
                : viewportMode === 'tablet'
                ? '768px'
                : '390px'
            }
          >
            {renderActiveScreenContent()}
          </IframeViewport>
        )}
      </div>
    </div>
  );
}
