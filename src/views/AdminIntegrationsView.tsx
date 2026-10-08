'use client';

/**
 * AdminIntegrationsView Component
 * Integrations and Google Drive status card.
 * CRITICAL REQUIREMENT:
 * Displays 'Belum Terhubung — Direncanakan Tahap 3' ('Not connected — Planned Phase 3').
 * No fake connected status!
 * Explains separation between employee SSO and consumer Gmail Drive storage.
 */

import React, { useState } from 'react';
import { 
  Cloud, 
  HardDrive, 
  ShieldAlert, 
  Database, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { reportRepository } from '../services/reportRepository';

export const AdminIntegrationsView: React.FC = () => {
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetData = () => {
    const confirm = window.confirm(
      'Reset data simulasi lokal ke draf awal Onewill Academy (Pekan 39-41)? Perubahan buatan Anda di peramban akan dikembalikan ke data percontohan.'
    );
    if (!confirm) return;

    reportRepository.resetDemoData();
    setResetSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-[#35115A]">
          Integrasi Layanan & Penyimpanan Cloud
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Arsitektur integrasi data Firestore, Google Drive Snapshot, dan Google Workspace SSO
        </p>
      </div>

      {/* Google Drive Status Card (STRICTLY 'Belum Terhubung — Direncanakan Tahap 3') */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6C2AA6] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Google Drive Snapshot Archive
                </h2>
                {/* STRICT STATUS: Not connected — Planned Phase 3 */}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Belum Terhubung — Direncanakan Tahap 3
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengarsipan permanen berkas PDF laporan mingguan yang telah disetujui (APPROVED)
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Architectural Rule Explanation */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Arsitektur Keamanan & Pemisahan Akses Google Drive:</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              <strong>Prinsip Kritis PRD v1.1:</strong> Akun Google pribadi/manajemen adalah pemilik folder Google Drive korporat; login Google karyawan/staf <em>BUKAN</em> izin otomatis untuk mengakses Google Drive perusahaan. Otorisasi OAuth harus dipisahkan secara eksplisit antara autentikasi pengguna dan delegasi token arsip Drive.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800">
              <li>
                <strong>Single Source of Truth:</strong> Basis data transaksional utama pada fase produksi adalah <strong>Firebase Firestore</strong> (bukan Drive).
              </li>
              <li>
                <strong>Peran Google Drive:</strong> Hanya berfungsi sebagai arsip pasif (read-only cold storage) untuk snapshot PDF yang telah disahkan secara hukum oleh manajemen.
              </li>
              <li>
                <strong>Isolasi Kegagalan:</strong> Kegagalan proses upload/sinkronisasi ke Google Drive tidak boleh membatalkan status persetujuan laporan yang sudah sah di Firestore.
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <KeyRound className="w-4 h-4 text-[#6C2AA6]" />
                <span>Otorisasi Terpisah (Scoped OAuth)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Di Tahap 3 nanti, Super Admin akan menghubungkan akun Google Drive resmi Onewill Academy melalui alur OAuth terisolasi dengan scope terbatas <code>https://www.googleapis.com/auth/drive.file</code> (hanya membaca dan menulis berkas yang dibuat oleh aplikasi ini).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Database className="w-4 h-4 text-[#6C2AA6]" />
                <span>Kesiapan Migrasi Firestore</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Model data yang dipakai di UI saat ini (<code>ReportRepository</code>) telah dirancang modular dan siap digantikan oleh adapter Firebase Firestore SDK tanpa merombak komponen antarmuka pengguna.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prototype Testing Utilities */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Utilitas Data Prototipe (Browser LocalStorage)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Selama pengujian lokal, Anda dapat mengembalikan data ke kondisi draf awal bawaan Onewill Academy kapan saja.
        </p>

        {resetSuccess && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
            Data prototipe berhasil di-reset. Memuat ulang halaman...
          </div>
        )}

        <button
          onClick={handleResetData}
          className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
        >
          Reset Data Simulasi ke Default (Pekan 39-41)
        </button>
      </div>
    </div>
  );
};
