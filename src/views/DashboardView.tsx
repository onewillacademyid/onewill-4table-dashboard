/**
 * DashboardView Component
 * Executive overview with period selector, expected vs received report KPIs,
 * issues by severity, outstanding support, awaiting reviews, overdue objectives,
 * and recent report list with responsive layout.
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
  Users
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

  // Aggregate critical and high issues for drill-down
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

  // Aggregate pending support requests for drill-down
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
    <div className="space-y-6">
      {/* Top Filter & Period Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#35115A]">
            Ringkasan Eksekutif Mingguan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring progres 4 tabel dan evaluasi kinerja lintas divisi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Periode:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-transparent font-medium text-[#35115A] focus:outline-hidden cursor-pointer"
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
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Divisi:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent font-medium text-[#35115A] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Divisi ({DEMO_TEAMS.length})</option>
              {DEMO_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Laporan Diterima"
          value={
            metrics
              ? `${metrics.totalReceivedReports} / ${metrics.totalExpectedReports}`
              : '-'
          }
          subtext={
            metrics
              ? `Tingkat kepatuhan: ${metrics.submissionRatePercent}%`
              : 'Menghitung...'
          }
          icon={BarChart3}
          variant="accent"
          onClick={() => setStatusFilter(statusFilter === 'SUBMITTED' ? 'ALL' : 'SUBMITTED')}
        />

        <MetricCard
          label="Menunggu Tinjauan"
          value={metrics ? metrics.pendingReviewsCount : '-'}
          subtext="Perlu verifikasi atasan"
          icon={Clock}
          variant={metrics && metrics.pendingReviewsCount > 0 ? 'warning' : 'default'}
          onClick={onNavigateToReviews}
        />

        <MetricCard
          label="Kendala Kritis Aktif"
          value={metrics ? metrics.criticalIssuesCount : '-'}
          subtext={metrics ? `Total kendala: ${metrics.totalIssuesCount}` : ''}
          icon={Flame}
          variant={metrics && metrics.criticalIssuesCount > 0 ? 'danger' : 'default'}
          onClick={() => setDrilldownType('CRITICAL_ISSUES')}
        />

        <MetricCard
          label="Dukungan Tertunda"
          value={metrics ? metrics.outstandingSupportCount : '-'}
          subtext="Eskalasi butuh otorisasi"
          icon={HelpCircle}
          variant="default"
          onClick={() => setDrilldownType('SUPPORT_REQUESTS')}
        />
      </div>

      {/* Secondary Insight Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Issue Severity Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Distribusi Tingkat Keparahan Kendala
            </h2>
            <span className="text-[11px] text-slate-500 tabular-nums">
              Pekan {selectedWeek}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-red-700 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-600" /> Kritis (Critical)
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {metrics ? metrics.criticalIssuesCount : 0}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics && metrics.totalIssuesCount > 0
                        ? (metrics.criticalIssuesCount / metrics.totalIssuesCount) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-orange-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Tinggi (High)
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {recentReports.reduce((acc, r) => {
                    return (
                      acc +
                      r.sections.issues.items.filter((i) => i.severity === 'high').length
                    );
                  }, 0)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: '40%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-amber-700">Sedang (Medium)</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {recentReports.reduce((acc, r) => {
                    return (
                      acc +
                      r.sections.issues.items.filter((i) => i.severity === 'medium').length
                    );
                  }, 0)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: '30%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Guide & Next Action */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Siklus Laporan Onewill
            </h2>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">DRAF</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-amber-800">DIAJUKAN</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 font-mono text-emerald-800">DISETUJUI</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                Laporan disetujui bersifat <strong>permanen</strong>. Perubahan pasca-persetujuan dilakukan melalui pembuatan amendemen baru (revisi naik tingkat).
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Peran aktif: {currentUser.name}</span>
            <button
              onClick={onNewReport}
              className="text-xs font-semibold text-[#6C2AA6] hover:text-[#35115A] hover:underline cursor-pointer"
            >
              + Input Laporan
            </button>
          </div>
        </div>

        {/* Action Callout */}
        <div className="bg-[#F4EFFA] p-5 rounded-xl border border-[#ebdcf9] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#35115A] mb-2">
              <CheckCircle className="w-4 h-4 text-[#6C2AA6]" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Verifikasi & Peninjauan
              </h2>
            </div>
            <p className="text-xs text-[#35115A]/80 leading-relaxed">
              Terdapat <strong>{metrics?.pendingReviewsCount || 0} laporan</strong> yang memerlukan validasi atasan divisi atau manajemen. Penulis tidak diperbolehkan menyetujui laporannya sendiri.
            </p>
          </div>

          <button
            onClick={onNavigateToReviews}
            className="mt-4 w-full py-2 px-3 bg-[#35115A] hover:bg-[#6C2AA6] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>Buka Antrean Tinjauan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Laporan Pekan Ini ({filteredReports.length})
            </h2>
            <span className="text-xs text-slate-500">
              {weekInfo.label}
            </span>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs overflow-x-auto">
            {['ALL', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'DRAFT'].map((st) => {
              const labelMap: Record<string, string> = {
                ALL: 'Semua',
                SUBMITTED: 'Menunggu Tinjauan',
                NEEDS_REVISION: 'Perlu Revisi',
                APPROVED: 'Disetujui',
                DRAFT: 'Draf',
              };
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labelMap[st]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto">
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
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Judul & Divisi</th>
                  <th className="py-3 px-4">Penulis (Author)</th>
                  <th className="py-3 px-4">Status & Revisi</th>
                  <th className="py-3 px-4 text-center">Butir 4 Tabel</th>
                  <th className="py-3 px-4">Pembaruan Terakhir</th>
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
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#6C2AA6] transition-colors">
                          {report.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {report.teamName}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{report.authorName}</div>
                        <div className="text-[10px] text-slate-400">{report.authorEmail}</div>
                      </td>

                      <td className="py-3 px-4">
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

                      <td className="py-3 px-4 text-center tabular-nums font-mono text-slate-700">
                        {totalItems} item
                      </td>

                      <td className="py-3 px-4 text-slate-500 tabular-nums text-[11px]">
                        {formatDateTimeIndonesian(report.updatedAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReport(report.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#6C2AA6] hover:text-[#35115A] bg-[#F4EFFA] hover:bg-[#ebdcf9] px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          <span>Buka</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden text-xs max-h-[85vh] flex flex-col">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {drilldownType === 'CRITICAL_ISSUES' ? (
                  <Flame className="w-4 h-4 text-red-400" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-purple-300" />
                )}
                <h3 className="text-sm font-bold">
                  {drilldownType === 'CRITICAL_ISSUES'
                    ? `Daftar Kendala Kritis & Tinggi (${criticalAndHighIssues.length})`
                    : `Permohonan Dukungan Tertunda (${pendingSupportRequests.length})`}
                </h3>
              </div>
              <button
                onClick={() => setDrilldownType('NONE')}
                className="text-white/70 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {drilldownType === 'CRITICAL_ISSUES' ? (
                criticalAndHighIssues.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    Tidak ada kendala kritis atau tinggi pada periode pekan ini.
                  </div>
                ) : (
                  criticalAndHighIssues.map(({ report, issue }, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="severity" value={issue.severity} size="sm" />
                          <StatusBadge type="issue-state" value={issue.state} size="sm" />
                          <span className="font-bold text-slate-900 text-xs">{issue.title}</span>
                        </div>
                        <button
                          onClick={() => {
                            setDrilldownType('NONE');
                            onOpenReport(report.id);
                          }}
                          className="text-[11px] font-semibold text-[#6C2AA6] hover:underline"
                        >
                          Lihat Laporan ({report.teamName}) →
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>
                          <strong>Dampak Bisnis:</strong> {issue.businessImpact || '-'}
                        </div>
                        <div>
                          <strong>Mitigasi:</strong> {issue.mitigation || '-'}
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 pt-1">
                          <span><strong>PIC:</strong> {issue.owner}</span>
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
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[10px]">
                            {support.type}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{support.request}</span>
                        </div>
                        <button
                          onClick={() => {
                            setDrilldownType('NONE');
                            onOpenReport(report.id);
                          }}
                          className="text-[11px] font-semibold text-[#6C2AA6] hover:underline"
                        >
                          Lihat Laporan ({report.teamName}) →
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        {support.amount && (
                          <div className="text-[#35115A] font-bold">
                            Estimasi Anggaran: Rp {support.amount.toLocaleString('id-ID')}
                          </div>
                        )}
                        <div>
                          <strong>Konsekuensi:</strong> {support.businessConsequence || '-'}
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 pt-1">
                          <span><strong>Dimintakan ke:</strong> {support.requestedFrom}</span>
                          <span><strong>Dibutuhkan Sebelum:</strong> {support.neededBy}</span>
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
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
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
