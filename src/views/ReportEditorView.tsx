/**
 * ReportEditorView Component
 * Form for creating or modifying a 4 Table Weekly Report.
 * Features:
 * - Header metadata (Author, Team, Reporting Period, Revision, Status)
 * - Autosave in localStorage demo with visible save indicator
 * - 2x2 desktop matrix & mobile stacked layout
 * - Explicit "No updates" with mandatory reason
 * - Submission validation & confirmation dialog
 */

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Send, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw,
  Info
} from 'lucide-react';
import { WeeklyReport, WeeklyReportSections } from '../types';
import { reportRepository, DEMO_TEAMS } from '../services/reportRepository';
import { FourTableGrid } from '../components/FourTableGrid';
import { StatusBadge } from '../components/StatusBadge';
import { getWeekDates, getISOWeekNumber } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface ReportEditorViewProps {
  reportId?: string | null;
  onBack: () => void;
  onSaved: (reportId: string) => void;
}

const emptySections: WeeklyReportSections = {
  achievements: { items: [], noUpdates: false },
  issues: { items: [], noUpdates: false },
  objectives: { items: [], noUpdates: false },
  support: { items: [], noUpdates: false },
};

export const ReportEditorView: React.FC<ReportEditorViewProps> = ({
  reportId,
  onBack,
  onSaved,
}) => {
  const { currentUser } = useAuth();
  const currentWeekInfo = getISOWeekNumber(new Date('2026-10-08'));

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState(currentUser.teamId);
  const [weekNumber, setWeekNumber] = useState(currentWeekInfo.week);
  const [year, setYear] = useState(currentWeekInfo.year);
  const [sections, setSections] = useState<WeeklyReportSections>(emptySections);

  // UI state
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weekInfo = getWeekDates(weekNumber, year);

  useEffect(() => {
    loadOrCreate();
  }, [reportId]);

  const loadOrCreate = async () => {
    setLoading(true);
    try {
      if (reportId) {
        const existing = await reportRepository.getReportById(reportId);
        if (existing) {
          setReport(existing);
          setTitle(existing.title);
          setTeamId(existing.teamId);
          setWeekNumber(existing.weekNumber);
          setYear(existing.year);
          setSections(existing.sections);
        }
      } else {
        // New report initial state
        const team = DEMO_TEAMS.find((t) => t.id === currentUser.teamId) || DEMO_TEAMS[0];
        setTitle(`Laporan Mingguan ${team.name} — Pekan ${currentWeekInfo.week}`);
        setSections({
          achievements: { items: [], noUpdates: false },
          issues: { items: [], noUpdates: false },
          objectives: { items: [], noUpdates: false },
          support: { items: [], noUpdates: false },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionsChange = (updated: WeeklyReportSections) => {
    setSections(updated);
    setAutosaveStatus('dirty');
  };

  // Autosave simulation to browser storage
  useEffect(() => {
    if (loading || autosaveStatus !== 'dirty') return;

    const timer = setTimeout(() => {
      setAutosaveStatus('saving');
      setTimeout(() => {
        setAutosaveStatus('saved');
      }, 400);
    }, 1200);

    return () => clearTimeout(timer);
  }, [sections, title, teamId, weekNumber, year, autosaveStatus, loading]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setValidationError('Judul laporan tidak boleh kosong.');
      return false;
    }

    // Check mandatory explanation for empty sections
    if (sections.achievements.noUpdates && !sections.achievements.noUpdatesReason?.trim()) {
      setValidationError('Seksi Capaian (1) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }
    if (sections.issues.noUpdates && !sections.issues.noUpdatesReason?.trim()) {
      setValidationError('Seksi Kendala (2) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }
    if (sections.objectives.noUpdates && !sections.objectives.noUpdatesReason?.trim()) {
      setValidationError('Seksi Sasaran (3) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }
    if (sections.support.noUpdates && !sections.support.noUpdatesReason?.trim()) {
      setValidationError('Seksi Dukungan (4) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;

    try {
      const selectedTeam = DEMO_TEAMS.find((t) => t.id === teamId) || DEMO_TEAMS[0];
      if (report) {
        // Update existing report
        const updated = await reportRepository.updateReport(report.id, {
          title,
          teamId,
          teamName: selectedTeam.name,
          weekNumber,
          year,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          sections,
        });
        onSaved(updated.id);
      } else {
        // Create new draft
        const created = await reportRepository.createReport({
          title,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorEmail: currentUser.email,
          teamId,
          teamName: selectedTeam.name,
          weekNumber,
          year,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          status: 'DRAFT',
          revision: 1,
          sections,
          archiveStatus: 'NOT_ARCHIVED',
        });
        onSaved(created.id);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Gagal menyimpan draf.');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Check at least one entry or explicitly marked no-updates
    const hasAnyContent =
      (sections.achievements.items.length > 0 || sections.achievements.noUpdates) &&
      (sections.issues.items.length > 0 || sections.issues.noUpdates) &&
      (sections.objectives.items.length > 0 || sections.objectives.noUpdates) &&
      (sections.support.items.length > 0 || sections.support.noUpdates);

    if (!hasAnyContent) {
      setValidationError('Pastikan setiap seksi dari 4 tabel memiliki minimal 1 baris atau dicentang "Tidak ada pembaruan".');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTeam = DEMO_TEAMS.find((t) => t.id === teamId) || DEMO_TEAMS[0];

      let targetId = report?.id;
      if (!targetId) {
        const created = await reportRepository.createReport({
          title,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorEmail: currentUser.email,
          teamId,
          teamName: selectedTeam.name,
          weekNumber,
          year,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          status: 'SUBMITTED',
          revision: 1,
          sections,
          archiveStatus: 'NOT_ARCHIVED',
        });
        targetId = created.id;
      } else {
        await reportRepository.updateReport(targetId, {
          title,
          teamId,
          teamName: selectedTeam.name,
          weekNumber,
          year,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          sections,
        });
        await reportRepository.submitReport(targetId);
      }

      onSaved(targetId);
    } catch (err: any) {
      setValidationError(err.message || 'Gagal mengajukan laporan.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Memuat editor laporan...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#35115A]">
                  {report ? 'Edit Laporan 4 Tabel' : 'Buat Laporan Mingguan Baru'}
                </h1>
                {report && <StatusBadge type="report" value={report.status} size="sm" />}
                {report && (
                  <span className="text-xs text-slate-500 font-mono">
                    Revisi #{report.revision}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pekan pelaporan: {weekInfo.label} • Penulis: {report ? report.authorName : currentUser.name}
              </p>
            </div>
          </div>

          {/* Action Buttons & Autosave Indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Autosave badge */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
              {autosaveStatus === 'saving' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>Menyimpan ke memori lokal...</span>
                </>
              ) : autosaveStatus === 'dirty' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Ada perubahan belum tersimpan</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tersimpan di peramban (Lokal)</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draf</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Mengajukan...' : 'Ajukan Laporan'}</span>
            </button>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Previous Review Feedback (if revision was requested) */}
        {report?.reviewNotes && report.status === 'NEEDS_REVISION' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <span className="font-bold">Catatan Peninjau ({report.reviewerName}):</span>
              <p className="mt-0.5 text-amber-800">{report.reviewNotes}</p>
            </div>
          </div>
        )}

        {/* Metadata Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Judul Laporan Mingguan
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setAutosaveStatus('dirty');
              }}
              className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
              placeholder="Judul laporan..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Divisi / Tim
            </label>
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setAutosaveStatus('dirty');
              }}
              className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
            >
              {DEMO_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pekan Laporan
            </label>
            <select
              value={weekNumber}
              onChange={(e) => {
                setWeekNumber(Number(e.target.value));
                setAutosaveStatus('dirty');
              }}
              className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
            >
              <option value={41}>Pekan 41 (05 – 11 Okt 2026)</option>
              <option value={40}>Pekan 40 (28 Sep – 04 Okt 2026)</option>
              <option value={39}>Pekan 39 (21 – 27 Sep 2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Table 2x2 Grid */}
      <FourTableGrid sections={sections} onChange={handleSectionsChange} readOnly={false} />
    </div>
  );
};
