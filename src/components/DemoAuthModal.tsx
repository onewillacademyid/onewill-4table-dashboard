/**
 * Demo Auth Modal Component
 * Displays branded Google Sign-In UI DEMO ONLY with role/persona switcher.
 * Disclaims live authentication and emphasizes segregation of duties.
 */

import React from 'react';
import { X, ShieldAlert, CheckCircle2, User, Key, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DemoAuthModal: React.FC = () => {
  const { currentUser, allUsers, switchUser, isLoginModalOpen, closeLoginModal } = useAuth();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoginModalOpen) {
        closeLoginModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoginModalOpen, closeLoginModal]);

  if (!isLoginModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-auth-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#35115A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/onewill-mark.svg"
              alt="Logo Onewill Academy"
              className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain"
            />
            <div>
              <h2 id="demo-auth-title" className="text-sm font-bold text-white tracking-tight">
                Simulasi Masuk & Pemilih Peran
              </h2>
              <p className="text-[11px] text-[#ebdcf9]">
                Onewill Academy • Mode Uji Coba Tanpa Autentikasi Nyata
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="text-white/70 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Tutup dialog autentikasi demo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Prototype Boundary Notice */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Simulasi Khusus Prototipe UI</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Pemilih akun ini hanya untuk menguji alur kerja (Contributor, Team Lead, Manajemen, Admin) dan <strong>bukan otorisasi keamanan produksi</strong>. Di lingkungan produksi, otentikasi akan menggunakan Google Workspace OAuth & Firebase Auth dengan validasi UID di Firestore rules.
            </p>
          </div>
        </div>

        {/* Branded Google Sign-In Simulation */}
        <div className="p-6">
          <div className="mb-4">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              Pilih Persona Pengguna untuk Simulasi:
            </span>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {allUsers.map((user) => {
                const isSelected = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      switchUser(user.id);
                      closeLoginModal();
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#6C2AA6] bg-[#F4EFFA]/60 ring-2 ring-[#6C2AA6]/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{user.name}</span>
                          {isSelected && (
                            <span className="text-[10px] font-medium bg-[#6C2AA6] text-white px-1.5 py-0.2 rounded-sm">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{user.email}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{user.role}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Divisi: {user.teamName}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-400">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-[#6C2AA6]" />
                      ) : (
                        <span className="text-xs text-slate-400 group-hover:text-slate-600">Pilih</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Prinsip: Penulis laporan tidak dapat menyetujui laporannya sendiri.</span>
            </div>
            <button
              onClick={closeLoginModal}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
