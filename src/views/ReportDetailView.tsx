'use client';

/**
 * ReportDetailView Component
 * Read-only view for inspected or approved reports.
 * Features:
 * - Authentic 2x2 matrix layout
 * - Immutability for approved versions
 * - "Buat Amendemen" action to create next revision
 * - Audit log / revision timeline
 * - Review action modal for managers/leads (No self-approval enforced)
 * - Drive archive snapshot simulation with error separation
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  Archive, 
  FileCheck, 
  FileText, 
  History, 
  UserCheck, 
  AlertOctagon,
  Copy,
  ExternalLink
} from 'lucide-react';
import { WeeklyReport } from '../types';
import { reportRepository } from '../services/reportRepository';
import { FourTableGrid } from '../components/FourTableGrid';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTimeIndonesian } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface ReportDetailViewProps {
  reportId: string;
  onBack: () => void;
  onEdit: (reportId: string) => void;
}

export const ReportDetailView: React.FC<ReportDetailViewProps> = ({
  reportId,
  onBack,
  onEdit,
}) => {
  const { currentUser, canApprove, canEdit, canArchive } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Review dialog state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNote, setReviewNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Archive modal state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [simulateArchiveFailure, setSimulateArchiveFailure] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await reportRepository.getReportById(reportId);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approvalCheck = report ? canApprove(report) : { allowed: false };
  const userCanEdit = report ? canEdit(report) : false;
  const userCanArchive = report ? canArchive(report) : false;

  const handleExecuteReview = async () => {
    if (!report) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      if (reviewAction === 'APPROVE') {
        await reportRepository.approveReport(
          report.id,
          currentUser.id,
          currentUser.name,
          reviewNote || 'Disetujui tanpa catatan khusus.'
        );
      } else {
        if (!reviewNote.trim()) {
          setActionError('Alasan penolakan / catatan revisi wajib diisi.');
          setIsProcessing(false);
          return;
        }
        await reportRepository.requestRevision(
          report.id,
          currentUser.id,
          currentUser.name,
          reviewNote
        );
      }
      setIsReviewModalOpen(false);
      await loadReport();
    } catch (err: any) {
      setActionError(err.message || 'Gagal memproses tinjauan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateAmendment = async () => {
    if (!report) return;
    const confirm = window.confirm(
      `Buat amendemen baru untuk Laporan ini? Revisi akan ditingkatkan menjadi #${report.revision + 1} dan status kembali ke Draf untuk diedit.`
    );
    if (!confirm) return;

    try {
      const updated = await reportRepository.createAmendment(
        report.id,
        currentUser.id,
        currentUser.name
      );
      setReport(updated);
      onEdit(updated.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArchiveSimulation = async () => {
    if (!report) return;
    setIsProcessing(true);
    try {
      await reportRepository.archiveReport(report.id, simulateArchiveFailure);
      setIsArchiveModalOpen(false);
      await loadReport();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !report) {
    return <div className="p-8 text-center text-xs text-slate-500">Memuat rincian laporan...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#35115A]">{report.title}</h1>
                <StatusBadge type="report" value={report.status} />
                <span className="text-xs text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-100">
                  Revisi #{report.revision}
                </span>
                {report.archiveStatus === 'ARCHIVED' && (
                  <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Snapshot Drive
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Divisi: {report.teamName} • Penulis: {report.authorName} ({report.authorEmail})
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* If approved, show "Buat Amendemen" */}
            {report.status === 'APPROVED' && (
              <button
                type="button"
                onClick={handleCreateAmendment}
                className="px-3.5 py-2 text-xs font-semibold text-[#6C2AA6] bg-[#F4EFFA] hover:bg-[#ebdcf9] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                title="Buka kembali laporan sebagai revisi baru"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Buat Amendemen (Rev #{report.revision + 1})</span>
              </button>
            )}

            {/* If Draft or Needs Revision and editable */}
            {userCanEdit && report.status !== 'APPROVED' && (
              <button
                type="button"
                onClick={() => onEdit(report.id)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Laporan</span>
              </button>
            )}

            {/* Review button if SUBMITTED */}
            {report.status === 'SUBMITTED' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  disabled={!approvalCheck.allowed}
                  title={!approvalCheck.allowed ? approvalCheck.reason : 'Tinjau dan beri keputusan'}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    approvalCheck.allowed
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Tinjau Laporan</span>
                </button>
              </div>
            )}

            {/* Archive button simulation */}
            {userCanArchive && report.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5 text-[#6C2AA6]" />
                <span>Arsipkan ke Drive (Simulasi)</span>
              </button>
            )}
          </div>
        </div>

        {/* Self-approval blocking notice */}
        {report.status === 'SUBMITTED' && !approvalCheck.allowed && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Pemberitahuan Hak Akses:</span> {approvalCheck.reason}
              <p className="text-[11px] text-amber-800 mt-0.5">
                Gunakan menu <em>"Ganti Persona Pengguna"</em> di kanan atas untuk masuk sebagai peran reviewer lain (misal: Budi Santoso / Manajemen) guna menguji persetujuan.
              </p>
            </div>
          </div>
        )}

        {/* Review feedback if any */}
        {report.reviewNotes && (
          <div className={`mt-4 p-3 rounded-lg text-xs border ${
            report.status === 'NEEDS_REVISION'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <span className="font-bold">
              Catatan Peninjauan ({report.reviewerName || 'Peninjau'}):
            </span>
            <p className="mt-0.5">{report.reviewNotes}</p>
          </div>
        )}

        {/* Archive Error (if simulated failure occurred) */}
        {report.archiveError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            <span className="font-bold">Status Arsip Drive: </span>
            <span>{report.archiveError} (Status persetujuan laporan tetap sah).</span>
          </div>
        )}
      </div>

      {/* The 4-Table 2x2 Grid (Read-Only) */}
      <FourTableGrid
        sections={report.sections}
        onChange={() => {}}
        readOnly={true}
      />

      {/* Revision & Audit History Timeline */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-[#6C2AA6]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Jejak Audit & Riwayat Revisi Laporan
          </h2>
        </div>

        <div className="space-y-3">
          {report.revisionsHistory.map((rev, index) => (
            <div key={index} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-3 py-1">
              <div className="w-2 h-2 rounded-full bg-[#6C2AA6] -ml-[17px] mt-1.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">
                    Revisi #{rev.revisionNumber}: {rev.action}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{rev.updatedByName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 tabular-nums text-[11px]">
                    {formatDateTimeIndonesian(rev.updatedAt)}
                  </span>
                </div>
                {rev.notes && <p className="text-slate-600 mt-1 text-[11px]">{rev.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Dialog Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Peninjauan Laporan Mingguan</h3>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Keputusan Peninjau:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVE')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Setujui Laporan
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECT')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer ${
                      reviewAction === 'REJECT'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Minta Revisi
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Catatan untuk Penulis {reviewAction === 'REJECT' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVE'
                      ? 'Catatan apresiasi atau instruksi lanjutan (opsional)...'
                      : 'Jelaskan butir mana yang perlu diperbaiki oleh penulis...'
                  }
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                />
              </div>

              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReview}
                  disabled={isProcessing}
                  className="px-4 py-1.5 font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-lg transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Memproses...' : 'Simpan Keputusan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drive Archive Simulation Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Simulasi Pengarsipan Google Drive</h3>
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Fitur ini mensimulasikan pembuatan snapshot PDF terenkripsi dan pengunggahan ke Google Drive korporat Onewill Academy (Direncanakan pada Tahap 3).
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={simulateArchiveFailure}
                    onChange={(e) => setSimulateArchiveFailure(e.target.checked)}
                    className="rounded text-[#6C2AA6]"
                  />
                  <span>Simulasikan Kegagalan Pengunggahan Drive</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  Untuk menguji bahwa status persetujuan laporan tetap sah meskipun pengunggahan arsip Drive mengalami kendala.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleArchiveSimulation}
                  disabled={isProcessing}
                  className="px-4 py-1.5 font-semibold text-white bg-[#35115A] hover:bg-[#6C2AA6] rounded-lg transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Mengarsipkan...' : 'Jalankan Arsip Simulasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
