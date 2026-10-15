'use client';

/**
 * ReportEditorView Component
 * Form for creating or modifying a 4 Table Weekly Report.
 * Features:
 * - Header metadata (Author, Team, Reporting Period, Revision, Status)
 * - Live server session integration (POST /api/reports) with canonical Zod validation
 * - Preserves isolated synthetic preview in Design Preview Studio
 * - 2x2 desktop matrix & mobile stacked layout (Swiss Editorial + Bento)
 * - Explicit "No updates" with mandatory reason
 * - Submission UX: Double submission prevention, Indonesian error feedback, safe retry guidance
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Info,
  LogIn
} from 'lucide-react';
import {
  WeeklyReport,
  WeeklyReportSections,
  AchievementItem,
  IssueItem,
  ObjectiveItem,
  SupportItem
} from '../types';
import { reportRepository, DEMO_TEAMS } from '../services/reportRepository';
import { FourTableGrid } from '../components/FourTableGrid';
import { StatusBadge } from '../components/StatusBadge';
import { getWeekDates, getISOWeekNumber } from '../utils/dateUtils';
import { getCanonicalTeamName } from '@/lib/firebase/auth-foundation';
import { useAuth } from '../context/AuthContext';
import {
  CreateReportInputSchema,
  CreateReportInput,
  WeeklyReportSectionsInput,
  AchievementItemInput,
  IssueItemInput,
  ObjectiveItemInput,
  SupportItemInput
} from '@/lib/validation/report';
import { canCreateReport } from '@/lib/auth/rbac-policy';

export interface ReportEditorViewProps {
  reportId?: string | null;
  onBack: () => void;
  onSaved: (reportId: string) => void;
  isDesignPreview?: boolean;
  apiEndpoint?: string;
}

const emptySections: WeeklyReportSections = {
  achievements: { items: [], noUpdates: false },
  issues: { items: [], noUpdates: false },
  objectives: { items: [], noUpdates: false },
  support: { items: [], noUpdates: false },
};

function cleanAchievementItem(item: AchievementItem): AchievementItemInput {
  const cleaned: AchievementItemInput = {
    id: String(item.id || `ach-${Date.now()}`),
    description: (item.description || '').trim(),
    project: (item.project || '').trim(),
    result: (item.result || '').trim(),
  };
  if (typeof item.targetValue === 'number' && !isNaN(item.targetValue)) {
    cleaned.targetValue = item.targetValue;
  }
  if (typeof item.actualValue === 'number' && !isNaN(item.actualValue)) {
    cleaned.actualValue = item.actualValue;
  }
  if (item.unit && item.unit.trim()) {
    cleaned.unit = item.unit.trim();
  }
  if (item.evidenceUrl && item.evidenceUrl.trim()) {
    cleaned.evidenceUrl = item.evidenceUrl.trim();
  }
  if (item.linkedObjectiveId && item.linkedObjectiveId.trim()) {
    cleaned.linkedObjectiveId = item.linkedObjectiveId.trim();
  }
  return cleaned;
}

function cleanIssueItem(item: IssueItem): IssueItemInput {
  return {
    id: String(item.id || `iss-${Date.now()}`),
    title: (item.title || '').trim(),
    businessImpact: (item.businessImpact || '').trim(),
    severity: item.severity || 'medium',
    owner: (item.owner || '').trim(),
    mitigation: (item.mitigation || '').trim(),
    targetResolutionDate: item.targetResolutionDate || new Date().toISOString().split('T')[0],
    state: item.state || 'open',
  };
}

function cleanObjectiveItem(item: ObjectiveItem): ObjectiveItemInput {
  const cleaned: ObjectiveItemInput = {
    id: String(item.id || `obj-${Date.now()}`),
    objective: (item.objective || '').trim(),
    measurableOutcome: (item.measurableOutcome || '').trim(),
    assignee: (item.assignee || '').trim(),
    dueDate: item.dueDate || new Date().toISOString().split('T')[0],
    priority: item.priority || 'medium',
  };
  if (item.linkedIssueId && item.linkedIssueId.trim()) {
    cleaned.linkedIssueId = item.linkedIssueId.trim();
  }
  return cleaned;
}

function cleanSupportItem(item: SupportItem): SupportItemInput {
  const cleaned: SupportItemInput = {
    id: String(item.id || `sup-${Date.now()}`),
    request: (item.request || '').trim(),
    type: item.type || 'decision',
    requestedFrom: (item.requestedFrom || '').trim(),
    neededBy: item.neededBy || new Date().toISOString().split('T')[0],
    businessConsequence: (item.businessConsequence || '').trim(),
    status: item.status || 'pending',
  };
  if (typeof item.amount === 'number' && !isNaN(item.amount) && item.amount >= 0) {
    cleaned.amount = item.amount;
  }
  return cleaned;
}

export const ReportEditorView: React.FC<ReportEditorViewProps> = ({
  reportId,
  onBack,
  onSaved,
  isDesignPreview = false,
  apiEndpoint,
}) => {
  const { currentUser, isSessionLoading } = useAuth();

  // Dynamic ISO week calculation based on system clock (evaluates to W42 in 2026)
  const currentWeekInfo = useMemo(() => {
    return getISOWeekNumber(new Date());
  }, []);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [teamId, setTeamId] = useState(currentUser?.teamId || 'team-operasional');
  const [weekNumber, setWeekNumber] = useState(currentWeekInfo.week);
  const [year, setYear] = useState(currentWeekInfo.year);
  const [sections, setSections] = useState<WeeklyReportSections>(emptySections);

  // Compute canonical display name for team (resolves team-operasional to 'Operasional & SDM')
  const effectiveTeamName = useMemo(() => {
    if (isDesignPreview) {
      return DEMO_TEAMS.find((t) => t.id === teamId)?.name || 'Operasional & SDM';
    }
    if (currentUser?.teamName && currentUser.teamName !== 'General Team') {
      return currentUser.teamName;
    }
    return getCanonicalTeamName(currentUser?.teamId);
  }, [isDesignPreview, teamId, currentUser]);

  // Dynamically compute selectable reporting weeks: current week down through previous cycles
  const availableWeeks = useMemo(() => {
    const baseWeek = currentWeekInfo.week;
    const list = [42, 41, 40, 39];
    if (baseWeek && !list.includes(baseWeek)) {
      list.unshift(baseWeek);
    }
    return Array.from(new Set(list)).sort((a, b) => b - a);
  }, [currentWeekInfo.week]);

  // UI state
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'failed'>('saved');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  const weekInfo = useMemo(() => getWeekDates(weekNumber, year), [weekNumber, year]);

  // Check centralized RBAC permissions
  const rbacPermission = useMemo(() => {
    if (isDesignPreview) {
      return { allowed: true };
    }
    if (!currentUser) {
      return { allowed: false, reason: 'Sesi belum terotentikasi.' };
    }
    return canCreateReport(currentUser);
  }, [currentUser, isDesignPreview]);

  useEffect(() => {
    loadOrCreate();
  }, [reportId, isDesignPreview]);

  const loadOrCreate = async () => {
    setLoading(true);
    setValidationError(null);
    setSuccessMessage(null);
    try {
      if (reportId) {
        if (isDesignPreview) {
          const existing = await reportRepository.getReportById(reportId);
          if (existing) {
            setReport(existing);
            setTitle(existing.title);
            setIsTitleManuallyEdited(true);
            setTeamId(existing.teamId);
            setWeekNumber(existing.weekNumber);
            setYear(existing.year);
            setSections(existing.sections);
          }
        } else {
          // Live API Detail fetch
          const fetchUrl = apiEndpoint
            ? `${apiEndpoint}/${encodeURIComponent(reportId)}`
            : `/api/reports/${encodeURIComponent(reportId)}`;
          const res = await fetch(fetchUrl, {
            credentials: 'same-origin',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              const existing: WeeklyReport = data.data;
              if (existing.version === undefined) {
                existing.version = 1;
              }
              setReport(existing);
              setTitle(existing.title);
              setIsTitleManuallyEdited(true);
              setTeamId(existing.teamId);
              setWeekNumber(existing.weekNumber);
              setYear(existing.year);
              setSections(existing.sections);
            }
          }
        }
      } else {
        // New report initial state
        const initialWeek = currentWeekInfo.week;
        const initialYear = currentWeekInfo.year;
        setWeekNumber(initialWeek);
        setYear(initialYear);
        setTitle(`Laporan Mingguan ${effectiveTeamName} — Pekan ${initialWeek}`);
        setIsTitleManuallyEdited(false);
        setSections({
          achievements: { items: [], noUpdates: false },
          issues: { items: [], noUpdates: false },
          objectives: { items: [], noUpdates: false },
          support: { items: [], noUpdates: false },
        });
        if (currentUser?.teamId) {
          setTeamId(currentUser.teamId);
        }
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize initial default title & team once currentUser finishes loading
  useEffect(() => {
    if (!reportId && !isTitleManuallyEdited && currentUser) {
      setTitle(`Laporan Mingguan ${effectiveTeamName} — Pekan ${weekNumber}`);
      if (currentUser.teamId) {
        setTeamId(currentUser.teamId);
      }
    }
  }, [currentUser, effectiveTeamName, reportId, isTitleManuallyEdited, weekNumber]);

  const handleSectionsChange = (updated: WeeklyReportSections) => {
    setSections(updated);
    setAutosaveStatus('dirty');
    setValidationError(null);
  };

  // Autosave simulation to browser storage strictly in Preview Mode
  useEffect(() => {
    if (!isDesignPreview || loading || autosaveStatus !== 'dirty') return;

    const timer = setTimeout(() => {
      setAutosaveStatus('saving');
      setTimeout(() => {
        setAutosaveStatus('saved');
      }, 400);
    }, 1200);

    return () => clearTimeout(timer);
  }, [sections, title, teamId, weekNumber, year, autosaveStatus, loading, isDesignPreview]);

  // Client-side quick check
  const validateForm = (): boolean => {
    if (!title.trim()) {
      setValidationError('Judul laporan tidak boleh kosong.');
      return false;
    }

    if (sections.achievements.noUpdates && !sections.achievements.noUpdatesReason?.trim()) {
      setValidationError('Seksi Capaian Pekan Lalu (1) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }
    if (sections.issues.noUpdates && !sections.issues.noUpdatesReason?.trim()) {
      setValidationError('Seksi Kendala & Hambatan (2) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }
    if (sections.objectives.noUpdates && !sections.objectives.noUpdatesReason?.trim()) {
      setValidationError('Seksi Sasaran Pekan Depan (3) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }
    if (sections.support.noUpdates && !sections.support.noUpdatesReason?.trim()) {
      setValidationError('Seksi Dukungan yang Dibutuhkan (4) dicentang "Tidak ada pembaruan", alasan wajib diisi.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const validateCompleteness = (): { valid: boolean; error?: string } => {
    if (!title.trim()) {
      return { valid: false, error: 'Judul laporan tidak boleh kosong.' };
    }
    // Seksi 1: Capaian Pekan Lalu
    if (sections.achievements.items.length === 0) {
      if (!sections.achievements.noUpdates) {
        return { valid: false, error: 'Seksi Capaian Pekan Lalu (1) belum diisi. Tambahkan minimal 1 baris capaian atau centang "Tidak ada pembaruan".' };
      }
      if (!sections.achievements.noUpdatesReason || sections.achievements.noUpdatesReason.trim().length < 5) {
        return { valid: false, error: 'Alasan tidak adanya pembaruan pada Seksi Capaian Pekan Lalu (1) wajib diisi minimal 5 karakter.' };
      }
    }
    // Seksi 2: Kendala & Hambatan
    if (sections.issues.items.length === 0) {
      if (!sections.issues.noUpdates) {
        return { valid: false, error: 'Seksi Kendala & Hambatan (2) belum diisi. Tambahkan minimal 1 baris kendala atau centang "Tidak ada pembaruan".' };
      }
      if (!sections.issues.noUpdatesReason || sections.issues.noUpdatesReason.trim().length < 5) {
        return { valid: false, error: 'Alasan tidak adanya pembaruan pada Seksi Kendala & Hambatan (2) wajib diisi minimal 5 karakter.' };
      }
    }
    // Seksi 3: Sasaran Pekan Depan
    if (sections.objectives.items.length === 0) {
      if (!sections.objectives.noUpdates) {
        return { valid: false, error: 'Seksi Sasaran Pekan Depan (3) belum diisi. Tambahkan minimal 1 baris sasaran atau centang "Tidak ada pembaruan".' };
      }
      if (!sections.objectives.noUpdatesReason || sections.objectives.noUpdatesReason.trim().length < 5) {
        return { valid: false, error: 'Alasan tidak adanya pembaruan pada Seksi Sasaran Pekan Depan (3) wajib diisi minimal 5 karakter.' };
      }
    }
    // Seksi 4: Dukungan yang Dibutuhkan
    if (sections.support.items.length === 0) {
      if (!sections.support.noUpdates) {
        return { valid: false, error: 'Seksi Dukungan yang Dibutuhkan (4) belum diisi. Tambahkan minimal 1 baris dukungan atau centang "Tidak ada pembaruan".' };
      }
      if (!sections.support.noUpdatesReason || sections.support.noUpdatesReason.trim().length < 5) {
        return { valid: false, error: 'Alasan tidak adanya pembaruan pada Seksi Dukungan yang Dibutuhkan (4) wajib diisi minimal 5 karakter.' };
      }
    }
    return { valid: true };
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    // Design Preview isolated simulation
    if (isDesignPreview) {
      try {
        const selectedTeam = DEMO_TEAMS.find((t) => t.id === teamId) || DEMO_TEAMS[0];
        if (report) {
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
          const created = await reportRepository.createReport({
            title,
            authorId: currentUser?.id || 'demo-user-1',
            authorName: currentUser?.name || 'Adhi Monow',
            authorEmail: currentUser?.email || 'adhimonow@gmail.com',
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
        setValidationError(err.message || 'Gagal menyimpan draf pratinjau.');
      }
      return;
    }

    // Live Mode: Authenticated Server Submission
    if (!currentUser) {
      setIsSessionExpired(true);
      setValidationError('Sesi Anda tidak valid atau telah berakhir. Silakan masuk kembali.');
      return;
    }

    if (!rbacPermission.allowed) {
      setValidationError(rbacPermission.reason || 'Peran Anda tidak memiliki hak akses untuk membuat draf laporan.');
      return;
    }

    // Build canonical sections payload matching Zod schemas
    const cleanSections: WeeklyReportSectionsInput = {
      achievements: {
        items: sections.achievements.items.map(cleanAchievementItem),
        noUpdates: Boolean(sections.achievements.noUpdates),
        noUpdatesReason: sections.achievements.noUpdatesReason?.trim() || undefined,
      },
      issues: {
        items: sections.issues.items.map(cleanIssueItem),
        noUpdates: Boolean(sections.issues.noUpdates),
        noUpdatesReason: sections.issues.noUpdatesReason?.trim() || undefined,
      },
      objectives: {
        items: sections.objectives.items.map(cleanObjectiveItem),
        noUpdates: Boolean(sections.objectives.noUpdates),
        noUpdatesReason: sections.objectives.noUpdatesReason?.trim() || undefined,
      },
      support: {
        items: sections.support.items.map(cleanSupportItem),
        noUpdates: Boolean(sections.support.noUpdates),
        noUpdatesReason: sections.support.noUpdatesReason?.trim() || undefined,
      },
    };

    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    setValidationError(null);

    try {
      if (report?.id) {
        // Existing Report: PATCH /api/reports/[id]
        const targetEndpoint = apiEndpoint
          ? `${apiEndpoint}/${encodeURIComponent(report.id)}`
          : `/api/reports/${encodeURIComponent(report.id)}`;

        const currentVersion = report.version || 1;
        const res = await fetch(targetEndpoint, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'x-expected-version': String(currentVersion),
          },
          body: JSON.stringify({
            expectedVersion: currentVersion,
            expectedRevision: report.revision,
            title: title.trim(),
            sections: cleanSections,
          }),
        });

        const resData = await res.json().catch(() => null);

        if (res.status === 200 && resData?.success && resData.data) {
          setReport(resData.data);
          setAutosaveStatus('saved');
          setSuccessMessage('Draf laporan mingguan berhasil diperbarui.');
          return;
        }

        if (res.status === 409) {
          setAutosaveStatus('failed');
          setValidationError(
            'Terjadi konflik versi (Stale Revision Conflict): Laporan ini telah diperbarui oleh sesi lain. Perubahan Anda masih tetap ada di layar editor.'
          );
          return;
        }

        if (res.status === 400) {
          setAutosaveStatus('failed');
          setValidationError(resData?.error || 'Validasi draf gagal: Periksa kembali isian 4 tabel.');
        } else if (res.status === 401) {
          setIsSessionExpired(true);
          setValidationError('Sesi Anda telah berakhir. Silakan masuk kembali untuk menyimpan draf.');
        } else if (res.status === 403) {
          setAutosaveStatus('failed');
          setValidationError(resData?.error || 'Akses ditolak: Anda tidak memiliki izin untuk memperbarui draf ini.');
        } else {
          setAutosaveStatus('failed');
          setValidationError(resData?.error || 'Gagal memperbarui draf laporan.');
        }
        return;
      }

      // New Report: POST /api/reports
      const payload: CreateReportInput = {
        title: title.trim() || undefined,
        weekNumber,
        year,
        weekStartDate: weekInfo.startDate,
        weekEndDate: weekInfo.endDate,
        sections: cleanSections,
      };

      const clientValidation = CreateReportInputSchema.safeParse(payload);
      if (!clientValidation.success) {
        const firstIssue = clientValidation.error.issues[0]?.message || 'Data laporan tidak memenuhi kriteria validasi.';
        setValidationError(firstIssue);
        setIsSubmitting(false);
        return;
      }

      const targetEndpoint = apiEndpoint || '/api/reports';
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientValidation.data),
      });

      const resData = await res.json().catch(() => null);

      if (res.status === 201 && resData?.success && resData.data?.id) {
        setAutosaveStatus('saved');
        setSuccessMessage('Draf laporan mingguan berhasil dibuat.');
        onSaved(resData.data.id);
        return;
      }

      // Explicit error mapping for Create Draft
      if (res.status === 400) {
        setValidationError(resData?.error || 'Validasi gagal: Periksa kembali isian 4 tabel.');
      } else if (res.status === 401) {
        setIsSessionExpired(true);
        setValidationError('Sesi Anda telah berakhir. Silakan masuk kembali untuk menyimpan draf.');
      } else if (res.status === 403) {
        if (resData?.code === 'MUTATIONS_DISABLED') {
          setValidationError('Penyimpanan draf laporan dinonaktifkan sementara di server (Feature Gate: REPORTS_FIRESTORE_WRITES_ENABLED=false).');
        } else if (resData?.code === 'EXACT_TARGET_GUARD_DISABLED') {
          setValidationError('Penyimpanan draf laporan dibatasi (Exact-Target Guard E2-B dinonaktifkan di server).');
        } else if (resData?.code === 'EXACT_TARGET_GUARD_REJECTED') {
          setValidationError(resData?.error || 'Akses ditolak: Operasi tidak memenuhi kriteria exact-target authorization guard E2-B.');
        } else if (resData?.code === 'CSRF_REJECTED') {
          setValidationError('Akses ditolak: Permintaan tidak berasal dari origin terpercaya (CSRF Protection).');
        } else if (resData?.code === 'DISABLED') {
          setValidationError('Akses ditolak: Akun Anda dalam status tidak aktif.');
        } else {
          setValidationError(resData?.error || 'Akses ditolak: Anda tidak memiliki izin untuk membuat laporan baru.');
        }
      } else if (res.status === 409) {
        setValidationError(resData?.error || 'Laporan mingguan untuk divisi dan periode pekan ini sudah dibuat.');
      } else if (res.status >= 500) {
        setValidationError('Terjadi kesalahan internal pada server. Formulir Anda tetap aman, silakan coba simpan kembali secara manual.');
      } else {
        setValidationError(resData?.error || 'Gagal menyimpan draf laporan.');
      }
    } catch (err) {
      console.error('Fetch error saving draft:', err);
      setValidationError('Koneksi terputus atau batas waktu habis saat menghubungi server. Mohon periksa koneksi Anda dan coba simpan kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateSubmit = () => {
    // 1. Four-table completeness validation
    const completeness = validateCompleteness();
    if (!completeness.valid) {
      setValidationError(completeness.error || 'Laporan belum lengkap.');
      return;
    }

    // 2. Unsaved changes (dirty) guard: require explicit save draft first
    if (autosaveStatus === 'dirty') {
      setValidationError('Terdapat perubahan yang belum disimpan. Silakan klik "Simpan Draf" terlebih dahulu sebelum mengajukan laporan.');
      return;
    }

    if (!report?.id && !isDesignPreview) {
      setValidationError('Laporan baru harus disimpan sebagai draf terlebih dahulu sebelum dapat diajukan. Silakan klik "Simpan Draf".');
      return;
    }

    // 3. Session guard
    if (!currentUser && !isDesignPreview) {
      setIsSessionExpired(true);
      setValidationError('Sesi Anda tidak valid atau telah berakhir. Silakan masuk kembali.');
      return;
    }

    // 4. All guards passed: open confirmation modal
    setValidationError(null);
    setIsConfirmSubmitOpen(true);
  };

  const handleCancelSubmit = () => {
    setIsConfirmSubmitOpen(false);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    setIsConfirmSubmitOpen(false);
    setValidationError(null);

    // Design Preview isolated simulation
    if (isDesignPreview) {
      try {
        const selectedTeam = DEMO_TEAMS.find((t) => t.id === teamId) || DEMO_TEAMS[0];
        let targetId = report?.id;
        if (!targetId) {
          const created = await reportRepository.createReport({
            title,
            authorId: currentUser?.id || 'demo-user-1',
            authorName: currentUser?.name || 'Adhi Monow',
            authorEmail: currentUser?.email || 'adhimonow@gmail.com',
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
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Live Mode: Authenticated Server Submission
    if (!currentUser) {
      setIsSessionExpired(true);
      setValidationError('Sesi Anda tidak valid atau telah berakhir. Silakan masuk kembali.');
      setIsSubmitting(false);
      return;
    }

    try {
      const activeReportId = report?.id;
      if (!activeReportId) {
        setValidationError('ID Laporan tidak ditemukan. Silakan simpan draf terlebih dahulu.');
        setIsSubmitting(false);
        return;
      }

      const currentVersion = report?.version || 1;
      const currentRevision = report?.revision || 1;

      // Submit the report: EXACTLY ONE POST to /api/reports/[id]/submit (ZERO PATCH)
      const submitEndpoint = apiEndpoint
        ? `${apiEndpoint}/${encodeURIComponent(activeReportId)}/submit`
        : `/api/reports/${encodeURIComponent(activeReportId)}/submit`;

      const submitRes = await fetch(submitEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-expected-version': String(currentVersion),
        },
        body: JSON.stringify({
          expectedVersion: currentVersion,
          expectedRevision: currentRevision,
        }),
      });

      const submitData = await submitRes.json().catch(() => null);

      if (submitRes.status === 200 && submitData?.success && submitData.data) {
        setReport(submitData.data);
        setAutosaveStatus('saved');
        const isResubmit = report?.status === 'NEEDS_REVISION';
        setSuccessMessage(
          isResubmit
            ? `Laporan berhasil diajukan ulang untuk ditinjau (Revisi #${submitData.data.revision}).`
            : 'Laporan mingguan berhasil diajukan untuk ditinjau.'
        );
        onSaved(activeReportId);
        return;
      }

      if (submitRes.status === 409) {
        setAutosaveStatus('failed');
        setValidationError(
          'Terjadi konflik versi (Stale Revision Conflict): Laporan ini telah diperbarui di sesi lain. Silakan muat ulang dan periksa kembali.'
        );
      } else if (submitRes.status === 400) {
        setValidationError(submitData?.error || 'Pengajuan laporan gagal: Validasi 4 tabel tidak terpenuhi.');
      } else if (submitRes.status === 403) {
        setValidationError(submitData?.error || 'Akses ditolak: Anda tidak memiliki izin untuk mengajukan laporan ini.');
      } else {
        setValidationError(submitData?.error || 'Gagal mengajukan laporan.');
      }
    } catch (err) {
      console.error('Fetch error submitting report:', err);
      setValidationError('Koneksi terputus saat mengajukan laporan ke server. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApproved = report?.status === 'APPROVED';
  const isNeedsRevision = report?.status === 'NEEDS_REVISION';

  if (!isDesignPreview && isSessionLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 font-mono">
        Memverifikasi sesi pengguna...
      </div>
    );
  }

  if (!isDesignPreview && !currentUser) {
    return (
      <div
        data-testid="session-expired-banner"
        className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4 max-w-md mx-auto my-12 shadow-xs"
      >
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Sesi Berakhir</h2>
          <p className="text-xs text-slate-500 mt-1">
            Silakan masuk dengan akun terverifikasi untuk membuat draf laporan mingguan.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6C2AA6] hover:bg-[#35115A] text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>Masuk ke Akun</span>
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Memuat editor laporan...
      </div>
    );
  }

  const effectiveAuthorName = report
    ? report.authorName
    : (currentUser?.name || currentUser?.email || 'Penulis');

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
                  {report ? (isApproved ? 'Detail Laporan 4 Tabel (Disetujui)' : 'Edit Laporan 4 Tabel') : 'Buat Laporan Mingguan Baru'}
                </h1>
                {report && <StatusBadge type="report" value={report.status} size="sm" />}
                {report && (
                  <span className="text-xs text-slate-500 font-mono">
                    Revisi #{report.revision}
                  </span>
                )}
                {isDesignPreview && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-md">
                    Preview Studio
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pekan pelaporan: {weekInfo.label} • Penulis: {effectiveAuthorName}
              </p>
            </div>
          </div>

          {/* Action Buttons & Autosave Indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Autosave badge */}
            <div
              data-testid="autosave-status-badge"
              className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-[#6C2AA6] animate-spin" />
                  <span>Menyimpan ke server...</span>
                </>
              ) : autosaveStatus === 'dirty' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Ada perubahan belum tersimpan</span>
                </>
              ) : autosaveStatus === 'failed' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-700 font-medium">Gagal menyimpan</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isDesignPreview ? 'Tersimpan di peramban (Lokal)' : 'Tersimpan di server'}</span>
                </>
              )}
            </div>

            {/* If Approved, editing is disabled */}
            {isApproved ? (
              <div
                data-testid="approved-readonly-badge"
                className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Disetujui (Hanya-Baca)</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="save-draft-button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || (!isDesignPreview && !rbacPermission.allowed)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Draf'}</span>
                </button>

                <button
                  type="button"
                  data-testid={isNeedsRevision ? 'resubmit-report-button' : 'submit-report-button'}
                  onClick={handleInitiateSubmit}
                  disabled={isSubmitting || isConfirmSubmitOpen || (!isDesignPreview && !rbacPermission.allowed)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs min-h-[44px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? 'Mengajukan...'
                      : isNeedsRevision
                      ? 'Ajukan Ulang Laporan'
                      : 'Ajukan Laporan'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Approved Status Notice Banner */}
        {isApproved && (
          <div
            data-testid="approved-status-banner"
            className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
            <div>
              <span className="font-bold">Laporan Telah Disetujui (Status: APPROVED):</span>
              <p className="mt-0.5 text-emerald-800">
                Laporan ini telah disetujui secara resmi oleh <strong>{report.reviewerName || 'Peninjau'}</strong>
                {report.reviewedAt && ` pada ${new Date(report.reviewedAt).toLocaleDateString('id-ID')}`}.
                Status Arsip: <strong>{report.archiveStatus === 'NOT_ARCHIVED' ? 'Belum Diarsipkan (Pipeline Ditunda)' : report.archiveStatus}</strong>.
                Seluruh konten bersifat permanen (read-only) untuk kepatuhan tata kelola.
              </p>
            </div>
          </div>
        )}

        {/* Previous Review Feedback Banner (if revision was requested) */}
        {isNeedsRevision && report?.reviewNotes && (
          <div
            data-testid="reviewer-feedback-banner"
            className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900"
          >
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">
                Catatan Peninjau ({report.reviewerName || 'Peninjau'}):
              </span>
              <p className="mt-0.5 text-amber-800 leading-relaxed font-medium">
                "{report.reviewNotes}"
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                Silakan lakukan perbaikan pada seksi 4 tabel di bawah ini, lalu klik tombol <strong>"Ajukan Ulang Laporan"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* RBAC Warning Banner if user cannot create reports */}
        {!isDesignPreview && !rbacPermission.allowed && !isApproved && (
          <div
            data-testid="rbac-unauthorized-banner"
            className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{rbacPermission.reason || 'Peran Anda tidak memiliki hak akses untuk membuat draf laporan mingguan baru.'}</span>
          </div>
        )}

        {/* Validation Error Banner with optional refresh action */}
        {validationError && (
          <div
            data-testid="editor-error-banner"
            id="validation-error-banner"
            className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="flex-1">{validationError}</span>
            {validationError.includes('konflik') && (
              <button
                type="button"
                data-testid="reload-version-button"
                onClick={() => loadOrCreate()}
                className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                Muat Ulang dari Server
              </button>
            )}
            {isSessionExpired && (
              <a
                href="/login"
                data-testid="session-expired-banner"
                className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 transition-colors shrink-0 flex items-center justify-center"
              >
                Masuk
              </a>
            )}
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            data-testid="editor-success-banner"
            className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
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
              data-testid="report-title-input"
              value={title}
              disabled={isApproved}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsTitleManuallyEdited(true);
                setAutosaveStatus('dirty');
              }}
              className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] disabled:bg-slate-100 disabled:text-slate-500 outline-hidden"
              placeholder="Judul laporan..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Divisi / Tim
            </label>
            {isDesignPreview ? (
              <select
                data-testid="report-team-select"
                value={teamId}
                disabled={isApproved}
                onChange={(e) => {
                  const newTeamId = e.target.value;
                  setTeamId(newTeamId);
                  if (!isTitleManuallyEdited) {
                    const selectedTeam = DEMO_TEAMS.find((t) => t.id === newTeamId)?.name || 'Operasional & SDM';
                    setTitle(`Laporan Mingguan ${selectedTeam} — Pekan ${weekNumber}`);
                  }
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
            ) : (
              <div
                data-testid="report-team-display"
                className="p-2 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium truncate"
                title={effectiveTeamName}
              >
                {effectiveTeamName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pekan Laporan
            </label>
            <select
              data-testid="report-week-select"
              value={weekNumber}
              disabled={isApproved || Boolean(report?.id)}
              onChange={(e) => {
                const newWeek = Number(e.target.value);
                setWeekNumber(newWeek);
                if (!isTitleManuallyEdited) {
                  setTitle(`Laporan Mingguan ${effectiveTeamName} — Pekan ${newWeek}`);
                }
                setAutosaveStatus('dirty');
              }}
              className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] disabled:bg-slate-100 disabled:text-slate-500 outline-hidden bg-white"
            >
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {getWeekDates(w, year).label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Table 2x2 Grid */}
      <FourTableGrid sections={sections} onChange={handleSectionsChange} readOnly={isApproved} />

      {/* Submit Confirmation Modal */}
      {isConfirmSubmitOpen && (
        <div
          data-testid="submit-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs animate-fade-in">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-300" />
                <span>Konfirmasi Pengajuan Laporan</span>
              </h3>
              <button
                type="button"
                data-testid="cancel-submit-button"
                onClick={handleCancelSubmit}
                disabled={isSubmitting}
                className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Batal"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin mengajukan laporan mingguan ini untuk ditinjau?
                Setelah diajukan, laporan akan beralih ke status <strong>Menunggu Tinjauan (SUBMITTED)</strong> dan tidak dapat diubah kembali kecuali peninjau meminta perbaikan (revisi).
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Laporan:</span>
                  <span className="font-semibold text-slate-800">{report?.id || 'Draf Baru'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pekan / Divisi:</span>
                  <span className="font-semibold text-slate-800">W{weekNumber} • {effectiveTeamName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Versi Konkurensi:</span>
                  <span className="font-semibold text-[#6C2AA6]">v{report?.version || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Revisi Bisnis:</span>
                  <span className="font-semibold text-slate-800">#{report?.revision || 1}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  data-testid="cancel-submit-button"
                  onClick={handleCancelSubmit}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer min-h-[44px] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  data-testid="confirm-submit-button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Mengajukan...' : isNeedsRevision ? 'Ya, Ajukan Ulang' : 'Ya, Ajukan Laporan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
