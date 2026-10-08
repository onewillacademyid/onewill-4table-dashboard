/**
 * ReportsListView Component
 * Complete listing and historical archive of 4 Table Weekly Reports.
 * Features:
 * - Filter by Status, Team, Week, and Fulltext Search
 * - Clear role-based filter toggle ("Laporan Saya" vs "Semua Laporan Tim")
 * - Scannable tabular rows with tabular numerals
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Plus, 
  ChevronRight, 
  FileText, 
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { WeeklyReport, ReportStatus } from '../types';
import { reportRepository, DEMO_TEAMS } from '../services/reportRepository';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTimeIndonesian } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface ReportsListViewProps {
  onOpenReport: (reportId: string) => void;
  onNewReport: () => void;
}

export const ReportsListView: React.FC<ReportsListViewProps> = ({
  onOpenReport,
  onNewReport,
}) => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [filterMyReportsOnly, setFilterMyReportsOnly] = useState(false);

  useEffect(() => {
    loadReports();
  }, [selectedStatus, selectedTeam, filterMyReportsOnly]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await reportRepository.listReports({
        status: selectedStatus as any,
        teamId: selectedTeam !== 'ALL' ? selectedTeam : undefined,
        authorId: filterMyReportsOnly ? currentUser.id : undefined,
        searchQuery: searchQuery.trim() || undefined,
      });
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedTeam('ALL');
    setFilterMyReportsOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#35115A]">
            Daftar Riwayat Laporan Mingguan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Arsip lengkap dokumen 4 tabel dari seluruh divisi Onewill Academy
          </p>
        </div>

        <button
          onClick={onNewReport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-lg transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Laporan Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan judul, nama penulis, atau divisi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#6C2AA6] focus:ring-1 focus:ring-[#6C2AA6] outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="font-semibold text-slate-700">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-medium text-[#35115A] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUBMITTED">Menunggu Tinjauan</option>
              <option value="NEEDS_REVISION">Perlu Revisi</option>
              <option value="APPROVED">Disetujui</option>
              <option value="ARCHIVED">Diarsipkan</option>
              <option value="DRAFT">Draf</option>
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="font-semibold text-slate-700">Divisi:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent font-medium text-[#35115A] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Divisi</option>
              {DEMO_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#35115A] hover:bg-[#6C2AA6] rounded-lg transition-colors cursor-pointer"
          >
            Terapkan
          </button>
        </form>

        {/* Quick Scope Filters */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMyReportsOnly(!filterMyReportsOnly)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                filterMyReportsOnly
                  ? 'bg-[#F4EFFA] border-[#6C2AA6] text-[#35115A]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Hanya Laporan Saya ({currentUser.name})
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>

      {/* Reports Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Ditemukan {reports.length} Laporan
          </span>
          <span className="text-slate-500">
            Diurutkan berdasarkan pembaruan terbaru
          </span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Memuat laporan...</div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-600" />
              <p className="font-semibold text-slate-700">Tidak ada laporan yang sesuai</p>
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs text-[#6C2AA6] hover:underline cursor-pointer"
              >
                Reset kriteria pencarian
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Judul Laporan & Divisi</th>
                  <th className="py-3 px-4">Penulis</th>
                  <th className="py-3 px-4">Pekan</th>
                  <th className="py-3 px-4">Status & Revisi</th>
                  <th className="py-3 px-4 text-center">Jumlah Butir</th>
                  <th className="py-3 px-4">Pembaruan Terakhir</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const totalItems =
                    report.sections.achievements.items.length +
                    report.sections.issues.items.length +
                    report.sections.objectives.items.length +
                    report.sections.support.items.length;

                  return (
                    <tr
                      key={report.id}
                      onClick={() => onOpenReport(report.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
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

                      <td className="py-3 px-4 tabular-nums">
                        <span className="font-mono text-slate-700 font-medium">
                          W{report.weekNumber} / {report.year}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="report" value={report.status} size="sm" />
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            Rev #{report.revision}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center tabular-nums font-mono text-slate-600">
                        {totalItems}
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
    </div>
  );
};
