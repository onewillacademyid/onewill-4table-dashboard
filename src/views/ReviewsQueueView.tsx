'use client';

/**
 * ReviewsQueueView Component
 * Queue of submitted reports awaiting managerial or lead review.
 * Features:
 * - Workflow: DRAFT → SUBMITTED → (NEEDS_REVISION → SUBMITTED)* → APPROVED → ARCHIVED
 * - Strict enforcement of "No self-approval" (Prinsip Segregasi Tugas)
 * - Approve and Request Revision interactive modals
 * - Explicit simulation disclaimer
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

interface ReviewsQueueViewProps {
  onOpenReport: (reportId: string) => void;
}

export const ReviewsQueueView: React.FC<ReviewsQueueViewProps> = ({ onOpenReport }) => {
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
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const allReports = await reportRepository.listReports({ status: 'SUBMITTED' });
      setSubmittedReports(allReports);
    } catch (err) {
      console.error(err);
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

    try {
      if (decisionType === 'APPROVE') {
        await reportRepository.approveReport(
          selectedReport.id,
          currentUser.id,
          currentUser.name,
          reviewNote
        );
      } else {
        if (!reviewNote.trim()) {
          setErrorMsg('Catatan revisi wajib diisi agar penulis memahami apa yang harus diperbaiki.');
          setIsProcessing(false);
          return;
        }
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
      setErrorMsg(err.message || 'Gagal menyimpan keputusan peninjauan.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#35115A]">
                Antrean Tinjauan Laporan Mingguan
              </h1>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-xs tabular-nums">
                {submittedReports.length} Menunggu
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Alur persetujuan manajerial berjenjang (Team Lead, Manajemen, Admin)
            </p>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#6C2AA6]" />
            <div>
              <span className="text-slate-500">Peninjau Aktif: </span>
              <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
            </div>
            <button
              onClick={openLoginModal}
              className="text-[#6C2AA6] underline ml-2 cursor-pointer font-medium"
            >
              Ubah
            </button>
          </div>
        </div>

        {/* Regulatory Governance Rule Notice */}
        <div className="mt-4 p-3 bg-[#F4EFFA] border border-[#ebdcf9] rounded-lg text-xs text-[#35115A] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#6C2AA6] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Prinsip Segregasi Tugas (No Self-Approval):</strong>{' '}
            Penulis laporan tidak dapat menyetujui laporannya sendiri. Jika laporan dibuat oleh Anda, tombol persetujuan dinonaktifkan secara otomatis. Versi yang disetujui akan terkunci (read-only).
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Daftar Laporan yang Diajukan ({submittedReports.length})
          </span>
          <span className="text-slate-500">
            Status: SUBMITTED
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Memuat antrean...</div>
        ) : submittedReports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="font-bold text-slate-800 text-sm">Semua Laporan Telah Selesai Ditinjau</p>
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
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded">
                          Laporan Anda Sendiri
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
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>Capaian: {report.sections.achievements.items.length} item</span>
                      <span>Kendala: {report.sections.issues.items.length} item</span>
                      <span>Sasaran: {report.sections.objectives.items.length} item</span>
                      <span>Dukungan: {report.sections.support.items.length} item</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onOpenReport(report.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat 4 Tabel</span>
                    </button>

                    <button
                      onClick={() => handleOpenReview(report, 'REVISE')}
                      disabled={!check.allowed}
                      title={!check.allowed ? check.reason : 'Minta penulis melakukan revisi'}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Minta Revisi
                    </button>

                    <button
                      onClick={() => handleOpenReview(report, 'APPROVE')}
                      disabled={!check.allowed}
                      title={!check.allowed ? check.reason : 'Setujui laporan ini secara resmi'}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-2xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {decisionType === 'APPROVE' ? 'Setujui Laporan Mingguan' : 'Minta Perbaikan / Revisi'}
                </h3>
                <p className="text-[11px] text-[#ebdcf9]">
                  {selectedReport.title} (Revisi #{selectedReport.revision})
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {decisionType === 'APPROVE' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                  <p className="font-semibold">Konfirmasi Persetujuan Laporan</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Laporan yang disetujui akan berstatus <strong>APPROVED</strong> dan bersifat permanen. Penulis tidak dapat mengubah isi tanpa membuat tiket amendemen resmi baru.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs">
                  <p className="font-semibold">Permintaan Perbaikan / Revisi</p>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    Laporan akan dikembalikan kepada <strong>{selectedReport.authorName}</strong> dengan status <strong>NEEDS_REVISION</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Catatan untuk Penulis {decisionType === 'REVISE' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    decisionType === 'APPROVE'
                      ? 'Catatan apresiasi atau tindak lanjut (opsional)...'
                      : 'Contoh: Metrik CPL belum dipisahkan antara Meta Ads dan LinkedIn Ads...'
                  }
                  rows={3}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDecision}
                  disabled={isProcessing}
                  className={`px-4 py-1.5 font-semibold text-white rounded-lg transition-colors cursor-pointer ${
                    decisionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessing
                    ? 'Menyimpan...'
                    : decisionType === 'APPROVE'
                    ? 'Ya, Sahkan Persetujuan'
                    : 'Kirim Permintaan Revisi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
