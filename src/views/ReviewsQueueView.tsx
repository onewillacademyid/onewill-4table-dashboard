'use client';

/**
 * ReviewsQueueView Component
 * Queue of submitted reports awaiting managerial or lead review.
 * Features:
 * - Workflow: DRAFT → SUBMITTED → (NEEDS_REVISION → SUBMITTED)* → APPROVED → ARCHIVED
 * - Strict enforcement of "No self-approval" (Prinsip Segregasi Tugas)
 * - Approve and Request Revision interactive modals
 * - 44px touch target compliance on mobile
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  ChevronRight, 
  Eye, 
  MessageSquare,
  Info
} from 'lucide-react';
import { WeeklyReport } from '../types';
import { reportRepository } from '../services/reportRepository';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTimeIndonesian } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

export interface ReviewsQueueViewProps {
  onOpenReport: (reportId: string) => void;
  isDesignPreview?: boolean;
  apiEndpoint?: string;
}

export const ReviewsQueueView: React.FC<ReviewsQueueViewProps> = ({
  onOpenReport,
  isDesignPreview = false,
  apiEndpoint,
}) => {
  const { currentUser, canApprove, openLoginModal } = useAuth();
  const [submittedReports, setSubmittedReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVE' | 'REVISE'>('APPROVE');
  const [reviewNote, setReviewNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [isDesignPreview, apiEndpoint]);

  const loadQueue = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (isDesignPreview) {
        const allReports = await reportRepository.listReports({ status: 'SUBMITTED' });
        setSubmittedReports(allReports);
      } else {
        const fetchUrl = apiEndpoint
          ? `${apiEndpoint}?status=SUBMITTED`
          : '/api/reports?status=SUBMITTED';

        const res = await fetch(fetchUrl, {
          credentials: 'same-origin',
        });
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success && data.data?.reports) {
          setSubmittedReports(data.data.reports);
        } else {
          setSubmittedReports([]);
          if (!res.ok) {
            setErrorMsg(data?.error || 'Gagal memuat antrean peninjauan dari server.');
          }
        }
      }
    } catch (err) {
      console.error('Error loading review queue:', err);
      setErrorMsg('Gagal terhubung ke server saat memuat antrean laporan.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (report: WeeklyReport, decision: 'APPROVE' | 'REVISE') => {
    setSelectedReport(report);
    setDecisionType(decision);
    setReviewNote(decision === 'APPROVE' ? 'Disetujui. Capaian dan mitigasi telah sesuai standar Onewill.' : '');
    setErrorMsg(null);
  };

  const handleExecuteDecision = async () => {
    if (!selectedReport) return;
    setIsProcessing(true);
    setErrorMsg(null);

    // Enforce minimum 10 characters for Request Revision notes
    if (decisionType === 'REVISE') {
      const trimmedNotes = reviewNote.trim();
      if (trimmedNotes.length < 10) {
        setErrorMsg('Catatan revisi wajib diisi minimal 10 karakter agar instruksi perbaikan jelas.');
        setIsProcessing(false);
        return;
      }
    }

    // Design Preview isolated path
    if (isDesignPreview) {
      try {
        if (decisionType === 'APPROVE') {
          await reportRepository.approveReport(
            selectedReport.id,
            currentUser.id,
            currentUser.name,
            reviewNote
          );
        } else {
          await reportRepository.requestRevision(
            selectedReport.id,
            currentUser.id,
            currentUser.name,
            reviewNote
          );
        }
        setSelectedReport(null);
        await loadQueue();
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memproses keputusan peninjauan.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Live Mode Server API Execution
    try {
      const baseApi = apiEndpoint ? apiEndpoint.replace(/\?.*$/, '') : '/api/reports';
      const actionPath = decisionType === 'APPROVE' ? 'approve' : 'request-revision';
      const url = `${baseApi}/${encodeURIComponent(selectedReport.id)}/${actionPath}`;

      const currentVersion = selectedReport.version || 1;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-expected-version': String(currentVersion),
        },
        body: JSON.stringify({
          expectedVersion: currentVersion,
          expectedRevision: selectedReport.revision,
          reviewNotes: reviewNote.trim() || undefined,
        }),
      });

      const resData = await res.json().catch(() => null);

      if (res.ok && resData?.success) {
        setSelectedReport(null);
        await loadQueue();
        return;
      }

      // Handle specific error codes
      if (res.status === 409) {
        setErrorMsg(
          'Terjadi konflik versi (Stale Revision Conflict): Laporan ini telah diperbarui atau disetujui sebelumnya oleh pihak lain. Silakan muat ulang antrean.'
        );
      } else if (res.status === 403) {
        if (resData?.code === 'SELF_APPROVAL_PROHIBITED') {
          setErrorMsg('Akses ditolak (Segregasi Tugas): Anda adalah penyusun laporan ini dan tidak dapat menyetujuinya sendiri.');
        } else if (resData?.code === 'CROSS_TEAM_FORBIDDEN') {
          setErrorMsg('Akses ditolak: Anda tidak memiliki wewenang meninjau laporan dari divisi lain.');
        } else {
          setErrorMsg(resData?.error || 'Akses ditolak: Anda tidak memiliki izin untuk tindakan ini.');
        }
      } else if (res.status === 400) {
        setErrorMsg(resData?.error || 'Permintaan peninjauan tidak valid.');
      } else {
        setErrorMsg(resData?.error || 'Gagal memproses peninjauan laporan.');
      }
    } catch (err) {
      console.error('Fetch error executing review decision:', err);
      setErrorMsg('Koneksi terputus saat mengirim keputusan ke server.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentUser || currentUser.role === 'CONTRIBUTOR') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Akses Ditolak</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Peran Kontributor tidak memiliki hak akses persetujuan manajerial atau peninjauan laporan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#35115A]">
                Antrean tinjauan laporan mingguan
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs tabular-nums">
                {submittedReports.length} menunggu
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Alur persetujuan manajerial berjenjang (Team Lead, Manajemen, Admin).
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-slate-500">Peninjau aktif: </span>
              <strong className="text-slate-900 font-semibold">{currentUser?.name || ''}</strong> ({currentUser?.role || ''})
            </div>
            <button
              onClick={openLoginModal}
              className="text-[#6C2AA6] underline cursor-pointer font-semibold min-h-[44px] flex items-center"
            >
              Ubah
            </button>
          </div>
        </div>

        {/* Regulatory Governance Rule Notice */}
        <div className="mt-4 p-3.5 bg-[#F4EFFA] border border-[#ebdcf9] rounded-xl text-xs text-[#35115A] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#6C2AA6] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Prinsip Segregasi Tugas (No Self-Approval):</strong>{' '}
            Penulis laporan tidak dapat menyetujui laporannya sendiri. Jika laporan dibuat oleh Anda, tombol persetujuan dinonaktifkan secara otomatis. Versi yang disetujui akan bersifat permanen.
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Daftar laporan yang diajukan ({submittedReports.length})
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            SUBMITTED
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Memuat antrean...</div>
        ) : submittedReports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="font-bold text-slate-800 text-sm">Semua laporan telah selesai ditinjau</p>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              Tidak ada laporan dalam status SUBMITTED pada pekan ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submittedReports.map((report) => {
              const check = canApprove(report);
              const isAuthor = report.authorId === currentUser.id;

              return (
                <div
                  key={report.id}
                  data-testid={`review-card-${report.id}`}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => onOpenReport(report.id)}
                        className="text-sm font-bold text-slate-900 hover:text-[#6C2AA6] cursor-pointer transition-colors"
                      >
                        {report.title}
                      </h3>
                      <StatusBadge type="report" value={report.status} size="sm" />
                      <span className="text-[11px] text-slate-500 font-mono">
                        Revisi #{report.revision}
                      </span>
                      {isAuthor && (
                        <span
                          data-testid={`self-approval-badge-${report.id}`}
                          className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded"
                        >
                          Laporan Anda sendiri
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span>
                        <strong>Divisi:</strong> {report.teamName}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>Penulis:</strong> {report.authorName} ({report.authorEmail})
                      </span>
                      <span>·</span>
                      <span className="text-slate-500 tabular-nums">
                        Diajukan: {formatDateTimeIndonesian(report.submittedAt || report.updatedAt)}
                      </span>
                    </div>

                    {/* Section metrics glance */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                      <span>Capaian: {report.sections.achievements.items.length} item</span>
                      <span>Kendala: {report.sections.issues.items.length} item</span>
                      <span>Sasaran: {report.sections.objectives.items.length} item</span>
                      <span>Dukungan: {report.sections.support.items.length} item</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => onOpenReport(report.id)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Lihat 4 Tabel</span>
                    </button>

                    <button
                      onClick={() => handleOpenReview(report, 'REVISE')}
                      data-testid={`request-revision-btn-${report.id}`}
                      disabled={!check.allowed}
                      title={!check.allowed ? check.reason : 'Minta penulis melakukan revisi'}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-200 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                    >
                      Minta Revisi
                    </button>

                    <button
                      onClick={() => handleOpenReview(report, 'APPROVE')}
                      data-testid={`approve-report-btn-${report.id}`}
                      disabled={!check.allowed}
                      title={!check.allowed ? check.reason : 'Setujui laporan ini secara resmi'}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-2xs min-h-[44px]"
                    >
                      Setujui
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Decision Modal */}
      {selectedReport && (
        <div
          data-testid="review-decision-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {decisionType === 'APPROVE' ? 'Setujui laporan mingguan' : 'Minta perbaikan / revisi'}
                </h3>
                <p className="text-[11px] text-[#ebdcf9]">
                  {selectedReport.title} (Revisi #{selectedReport.revision})
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                data-testid="close-review-modal-btn"
                className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {decisionType === 'APPROVE' ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                  <p className="font-semibold">Konfirmasi persetujuan laporan</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Laporan yang disetujui akan berstatus <strong>APPROVED</strong> dan snapshot permanen disimpan di subcollection <code>versions/v{selectedReport.revision}</code>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
                  <p className="font-semibold">Permintaan perbaikan / revisi</p>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    Laporan akan dikembalikan kepada <strong>{selectedReport.authorName}</strong> dengan status <strong>NEEDS_REVISION</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Catatan untuk penulis {decisionType === 'REVISE' && <span className="text-rose-500">*</span>}
                  {decisionType === 'REVISE' && (
                    <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                      ({reviewNote.trim().length} / min. 10 karakter)
                    </span>
                  )}
                </label>
                <textarea
                  data-testid="review-notes-textarea"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    decisionType === 'APPROVE'
                      ? 'Catatan apresiasi atau tindak lanjut (opsional)...'
                      : 'Contoh: Metrik CPL belum dipisahkan antara Meta Ads dan LinkedIn Ads...'
                  }
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden text-xs"
                />
              </div>

              {errorMsg && (
                <div
                  data-testid="review-modal-error"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl"
                >
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  data-testid="cancel-review-button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  data-testid="confirm-review-button"
                  onClick={handleExecuteDecision}
                  disabled={isProcessing}
                  className={`px-4 py-2.5 font-semibold text-white rounded-xl transition-colors cursor-pointer min-h-[44px] ${
                    decisionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessing
                    ? 'Menyimpan...'
                    : decisionType === 'APPROVE'
                    ? 'Ya, sahkan persetujuan'
                    : 'Kirim permintaan revisi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
