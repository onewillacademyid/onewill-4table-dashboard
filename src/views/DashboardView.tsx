'use client';

/**
 * DashboardView Component (Executive Information Architecture v3)
 * Designed for business owners and management to answer:
 * 1. What happened this week? (Weekly Summary & Submission Rate)
 * 2. What is progressing? (Report Completion Metrics)
 * 3. What is blocked? (Critical Issues & Mitigation Status)
 * 4. What needs my approval? (Pending Review Queue)
 * 5. Who is responsible for the next action? (Report Records & Team Authors)
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle, 
  Flame, 
  Calendar, 
  Filter, 
  ChevronRight, 
  FileText,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { WeeklyReport, DashboardMetrics } from '../types';
import { reportRepository, DEMO_TEAMS } from '../services/reportRepository';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { getWeekDates, formatDateTimeIndonesian } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  onOpenReport: (reportId: string) => void;
  onNewReport: () => void;
  onNavigateToReviews: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenReport,
  onNewReport,
  onNavigateToReviews,
}) => {
  const { currentUser } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(41);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentReports, setRecentReports] = useState<WeeklyReport[]>([]);
  const [allReports, setAllReports] = useState<WeeklyReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Drilldown modal states
  const [drilldownType, setDrilldownType] = useState<'NONE' | 'CRITICAL_ISSUES' | 'SUPPORT_REQUESTS'>('NONE');

  const weekInfo = getWeekDates(selectedWeek, selectedYear);

  useEffect(() => {
    loadDashboardData();
  }, [selectedWeek, selectedYear, selectedTeam]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const dataMetrics = await reportRepository.getMetrics(selectedWeek, selectedYear, selectedTeam);
      setMetrics(dataMetrics);

      const all = await reportRepository.listReports();
      setAllReports(all);

      const reports = await reportRepository.listReports({
        weekNumber: selectedWeek,
        year: selectedYear,
        teamId: selectedTeam !== 'ALL' ? selectedTeam : undefined,
      });
      setRecentReports(reports);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Collect distinct weeks for selector
  const availableWeeks = React.useMemo(() => {
    const weekSet = new Set<number>([39, 40, 41]);
    allReports.forEach((r) => weekSet.add(r.weekNumber));
    return Array.from(weekSet).sort((a, b) => b - a);
  }, [allReports]);

  // Aggregate critical and high issues for immediate executive view
  const criticalAndHighIssues = React.useMemo(() => {
    const list: Array<{ report: WeeklyReport; issue: any }> = [];
    recentReports.forEach((r) => {
      if (!r.sections.issues.noUpdates) {
        r.sections.issues.items.forEach((iss) => {
          if (iss.severity === 'critical' || iss.severity === 'high') {
            list.push({ report: r, issue: iss });
          }
        });
      }
    });
    return list;
  }, [recentReports]);

  // Aggregate pending support requests
  const pendingSupportRequests = React.useMemo(() => {
    const list: Array<{ report: WeeklyReport; support: any }> = [];
    recentReports.forEach((r) => {
      if (!r.sections.support.noUpdates) {
        r.sections.support.items.forEach((sup) => {
          if (sup.status === 'pending') {
            list.push({ report: r, support: sup });
          }
        });
      }
    });
    return list;
  }, [recentReports]);

  const filteredReports = recentReports.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* 1. Header & Filter Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#35115A] leading-snug break-words">
            Ringkasan eksekutif mingguan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-normal break-words">
            Monitoring kepatuhan pelaporan 4 tabel, kendala kritis, dan antrean persetujuan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
          {/* Period Selector */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 px-3.5 min-h-[44px] rounded-xl text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700">Periode:</span>
            </div>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-transparent font-semibold text-[#35115A] focus:outline-hidden cursor-pointer py-2 text-xs truncate max-w-[180px] sm:max-w-none"
            >
              {availableWeeks.map((wn) => {
                const info = getWeekDates(wn, selectedYear);
                return (
                  <option key={wn} value={wn}>
                    {info.label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 px-3.5 min-h-[44px] rounded-xl text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700">Divisi:</span>
            </div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent font-semibold text-[#35115A] focus:outline-hidden cursor-pointer py-2 text-xs truncate max-w-[180px] sm:max-w-none"
            >
              <option value="ALL">Semua divisi ({DEMO_TEAMS.length})</option>
              {DEMO_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Executive Key Questions Layout (Bento Priorities) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left Column (2 cols on Desktop): Question 3 - What is blocked? */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Kendala kritis & perhatian utama
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Poin terkendala yang membutuhkan penanganan atau mitigasi tingkat manajemen.
              </p>
            </div>
            {criticalAndHighIssues.length > 0 && (
              <button
                onClick={() => setDrilldownType('CRITICAL_ISSUES')}
                className="text-xs font-semibold text-[#6C2AA6] hover:underline cursor-pointer py-1 min-h-[44px] flex items-center"
              >
                Lihat semua ({criticalAndHighIssues.length}) →
              </button>
            )}
          </div>

          {criticalAndHighIssues.length === 0 ? (
            <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-800">Tidak ada kendala kritis pekan ini</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Semua divisi berjalan sesuai target tanpa adanya eskalasi darurat.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {criticalAndHighIssues.slice(0, 3).map(({ report, issue }, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenReport(report.id)}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#6C2AA6]/40 hover:shadow-2xs transition-all cursor-pointer space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge type="severity" value={issue.severity} size="sm" />
                      <StatusBadge type="issue-state" value={issue.state} size="sm" />
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {issue.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {report.teamName}
                    </span>
                  </div>

                  {issue.businessImpact && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      <span className="font-semibold text-slate-700">Dampak:</span> {issue.businessImpact}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span><strong>Penanggung jawab:</strong> {issue.owner || report.authorName}</span>
                      {issue.targetResolutionDate && (
                        <span><strong>Target:</strong> {issue.targetResolutionDate}</span>
                      )}
                    </div>
                    <span className="text-[#6C2AA6] font-semibold flex items-center gap-1">
                      Buka rincian <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 col on Desktop): Question 4 - What needs my approval? */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Persetujuan & tinjauan tertunda
              </h2>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-amber-900">Laporan diajukan</span>
                <span className="text-2xl font-bold tabular-nums text-amber-900">
                  {metrics?.pendingReviewsCount || 0}
                </span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Laporan dari kepala divisi yang memerlukan verifikasi dan persetujuan atasan sebelum diarsipkan.
              </p>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100">
                <span className="text-slate-500">Pengguna aktif</span>
                <span className="font-semibold text-slate-800">{currentUser.name}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100">
                <span className="text-slate-500">Dukungan tertunda</span>
                <span className="font-semibold text-slate-800">{metrics?.outstandingSupportCount || 0} permohonan</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onNavigateToReviews}
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#35115A] hover:bg-[#6C2AA6] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>Buka antrean tinjauan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Responsive KPI Cards Grid (1 column on mobile, 2 sm, 4 lg) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Laporan diterima"
          value={
            metrics
              ? `${metrics.totalReceivedReports} / ${metrics.totalExpectedReports}`
              : '-'
          }
          subtext={
            metrics
              ? `Tingkat kepatuhan pelaporan: ${metrics.submissionRatePercent}%`
              : 'Memuat data...'
          }
          icon={BarChart3}
          variant="accent"
          onClick={() => setStatusFilter(statusFilter === 'SUBMITTED' ? 'ALL' : 'SUBMITTED')}
        />

        <MetricCard
          label="Menunggu tinjauan"
          value={metrics ? metrics.pendingReviewsCount : '-'}
          subtext="Memerlukan verifikasi dan persetujuan atasan"
          icon={Clock}
          variant={metrics && metrics.pendingReviewsCount > 0 ? 'warning' : 'default'}
          onClick={onNavigateToReviews}
        />

        <MetricCard
          label="Kendala kritis aktif"
          value={metrics ? metrics.criticalIssuesCount : '-'}
          subtext={metrics ? `Total kendala terdata: ${metrics.totalIssuesCount}` : ''}
          icon={Flame}
          variant={metrics && metrics.criticalIssuesCount > 0 ? 'danger' : 'default'}
          onClick={() => setDrilldownType('CRITICAL_ISSUES')}
        />

        <MetricCard
          label="Dukungan tertunda"
          value={metrics ? metrics.outstandingSupportCount : '-'}
          subtext="Eskalasi permohonan bantuan antar divisi"
          icon={HelpCircle}
          variant="default"
          onClick={() => setDrilldownType('SUPPORT_REQUESTS')}
        />
      </div>

      {/* 4. Question 5 - Who is responsible for the next action? (Reports Table & Mobile Cards) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header & Status Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Daftar laporan mingguan ({filteredReports.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Status pengerjaan, penulis laporan, dan tingkat revisi pekan ini.
            </p>
          </div>

          {/* Status Filter Tabs (Scrollable on mobile) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full md:w-auto">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'SUBMITTED', label: 'Menunggu Tinjauan' },
              { id: 'NEEDS_REVISION', label: 'Perlu Revisi' },
              { id: 'APPROVED', label: 'Disetujui' },
              { id: 'DRAFT', label: 'Draf' },
            ].map((st) => {
              const isActive = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center ${
                    isActive
                      ? 'bg-white text-[#35115A] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Memuat data laporan mingguan...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-600" />
              <p className="font-semibold text-slate-700">Tidak ada laporan yang cocok dengan filter</p>
              <p className="text-slate-500 mt-1">Coba ganti filter status atau periode pekan di atas.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Judul & divisi</th>
                  <th className="py-3 px-4">Penanggung jawab (Author)</th>
                  <th className="py-3 px-4">Status & revisi</th>
                  <th className="py-3 px-4 text-center">Butir 4-tabel</th>
                  <th className="py-3 px-4">Pembaruan terakhir</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const totalItems =
                    report.sections.achievements.items.length +
                    report.sections.issues.items.length +
                    report.sections.objectives.items.length +
                    report.sections.support.items.length;

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => onOpenReport(report.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#6C2AA6] transition-colors">
                          {report.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {report.teamName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{report.authorName}</div>
                        <div className="text-[10px] text-slate-400">{report.authorEmail}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="report" value={report.status} size="sm" />
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            Rev #{report.revision}
                          </span>
                        </div>
                        {report.reviewNotes && report.status === 'NEEDS_REVISION' && (
                          <div className="text-[10px] text-rose-700 truncate max-w-xs mt-0.5" title={report.reviewNotes}>
                            Catatan: {report.reviewNotes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center tabular-nums font-medium text-slate-700">
                        {totalItems} butir
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 tabular-nums text-[11px]">
                        {formatDateTimeIndonesian(report.updatedAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReport(report.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#6C2AA6] hover:text-[#35115A] bg-[#F4EFFA] hover:bg-[#ebdcf9] min-h-[36px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Buka</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Record Cards View (Displayed on small screens <768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Memuat data laporan...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-600" />
              <p className="font-semibold text-slate-700">Tidak ada laporan yang cocok</p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const totalItems =
                report.sections.achievements.items.length +
                report.sections.issues.items.length +
                report.sections.objectives.items.length +
                report.sections.support.items.length;

              return (
                <div
                  key={report.id}
                  onClick={() => onOpenReport(report.id)}
                  className="p-4 hover:bg-slate-50/80 transition-colors space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#6C2AA6] bg-[#F4EFFA] px-2 py-0.5 rounded">
                        {report.teamName}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {report.title}
                      </h3>
                    </div>
                    <StatusBadge type="report" value={report.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Penulis:</span>
                      <span className="font-semibold text-slate-800">{report.authorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rincian 4-Tabel:</span>
                      <span className="font-semibold text-slate-800">{totalItems} item • Rev #{report.revision}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-slate-400">
                      {formatDateTimeIndonesian(report.updatedAt)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReport(report.id);
                      }}
                      className="w-full min-h-[44px] py-2 px-3 bg-[#35115A] hover:bg-[#6C2AA6] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-2"
                    >
                      <span>Buka Laporan</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Drilldown Detail Modal for Critical Issues or Support Requests */}
      {drilldownType !== 'NONE' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden text-xs max-h-[85vh] flex flex-col">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {drilldownType === 'CRITICAL_ISSUES' ? (
                  <Flame className="w-4 h-4 text-rose-300" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-purple-300" />
                )}
                <h3 className="text-sm font-bold">
                  {drilldownType === 'CRITICAL_ISSUES'
                    ? `Daftar kendala kritis & tinggi (${criticalAndHighIssues.length})`
                    : `Permohonan dukungan tertunda (${pendingSupportRequests.length})`}
                </h3>
              </div>
              <button
                onClick={() => setDrilldownType('NONE')}
                className="text-white/70 hover:text-white p-2 rounded cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {drilldownType === 'CRITICAL_ISSUES' ? (
                criticalAndHighIssues.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    Tidak ada kendala kritis atau tinggi pada periode pekan ini.
                  </div>
                ) : (
                  criticalAndHighIssues.map(({ report, issue }, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge type="severity" value={issue.severity} size="sm" />
                          <StatusBadge type="issue-state" value={issue.state} size="sm" />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{issue.title}</span>
                        </div>
                        <button
                          onClick={() => {
                            setDrilldownType('NONE');
                            onOpenReport(report.id);
                          }}
                          className="text-[11px] font-semibold text-[#6C2AA6] hover:underline cursor-pointer py-1 min-h-[44px] flex items-center"
                        >
                          Lihat laporan ({report.teamName}) →
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>
                          <strong>Dampak bisnis:</strong> {issue.businessImpact || '-'}
                        </div>
                        <div>
                          <strong>Mitigasi:</strong> {issue.mitigation || '-'}
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 pt-1">
                          <span><strong>Penanggung jawab:</strong> {issue.owner}</span>
                          <span><strong>Target:</strong> {issue.targetResolutionDate}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                pendingSupportRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    Tidak ada permohonan dukungan tertunda pada periode pekan ini.
                  </div>
                ) : (
                  pendingSupportRequests.map(({ report, support }, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[10px]">
                            {support.type}
                          </span>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{support.request}</span>
                        </div>
                        <button
                          onClick={() => {
                            setDrilldownType('NONE');
                            onOpenReport(report.id);
                          }}
                          className="text-[11px] font-semibold text-[#6C2AA6] hover:underline cursor-pointer py-1 min-h-[44px] flex items-center"
                        >
                          Lihat laporan ({report.teamName}) →
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        {support.amount && (
                          <div className="text-[#35115A] font-bold">
                            Estimasi anggaran: Rp {support.amount.toLocaleString('id-ID')}
                          </div>
                        )}
                        <div>
                          <strong>Konsekuensi:</strong> {support.businessConsequence || '-'}
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 pt-1">
                          <span><strong>Dimintakan ke:</strong> {support.requestedFrom}</span>
                          <span><strong>Dibutuhkan sebelum:</strong> {support.neededBy}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDrilldownType('NONE')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer min-h-[44px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
