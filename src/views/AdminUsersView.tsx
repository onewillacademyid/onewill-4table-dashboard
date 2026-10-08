'use client';

/**
 * AdminUsersView Component
 * User directory and role management view.
 * 
 * Modes:
 * 1. Live Server Mode (isDesignPreview = false):
 *    Fetches real user registry from server endpoint GET /api/admin/users.
 *    Strictly read-only in Phase 2C.1. Mutation actions (invite, edit role, deactivate) are disabled.
 * 2. Design Preview Mode (isDesignPreview = true):
 *    Uses local synthetic DEMO_USERS for client-side interactive prototyping.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Info,
  RefreshCw,
  Lock,
  Calendar,
  Loader2
} from 'lucide-react';
import { DEMO_USERS, DEMO_TEAMS } from '../services/reportRepository';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export interface AdminUsersViewProps {
  isDesignPreview?: boolean;
}

export interface LiveAdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  teamId: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ isDesignPreview = false }) => {
  const { currentUser, switchUser } = useAuth();
  
  // Local state for Design Preview mode
  const [demoUsers, setDemoUsers] = useState<User[]>(DEMO_USERS);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Live state for server mode
  const [liveUsers, setLiveUsers] = useState<LiveAdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(!isDesignPreview);
  const [error, setError] = useState<{ message: string; isAuthError?: boolean } | null>(null);
  const [readOnlyNotice, setReadOnlyNotice] = useState<string | null>(null);

  // Invite Form state (for preview mode simulation)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('CONTRIBUTOR');
  const [newTeamId, setNewTeamId] = useState(DEMO_TEAMS[0].id);

  // Fetch live users from GET /api/admin/users
  const fetchLiveUsers = useCallback(async () => {
    if (isDesignPreview) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setError({
          message: data.error || 'Akses ditolak: Sesi Anda telah kadaluarsa atau Anda tidak memiliki hak akses Admin.',
          isAuthError: true,
        });
        return;
      }

      if (!response.ok) {
        setError({
          message: data.error || 'Gagal mengambil daftar pengguna dari server.',
        });
        return;
      }

      setLiveUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch live admin users:', err);
      setError({
        message: 'Terjadi kesalahan jaringan saat terhubung ke server database.',
      });
    } finally {
      setLoading(false);
    }
  }, [isDesignPreview]);

  useEffect(() => {
    if (!isDesignPreview) {
      fetchLiveUsers();
    }
  }, [isDesignPreview, fetchLiveUsers]);

  const handleSimulateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDesignPreview) {
      if (!newName.trim() || !newEmail.trim()) return;

      const team = DEMO_TEAMS.find((t) => t.id === newTeamId) || DEMO_TEAMS[0];
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: newName,
        email: newEmail,
        role: newRole,
        teamId: team.id,
        teamName: team.name,
        avatarColor: '#6C2AA6',
        avatarInitials: newName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        active: true,
        lastActive: 'Baru saja diundang (Simulasi)',
      };

      setDemoUsers([newUser, ...demoUsers]);
      setInviteSuccessMsg(`Undangan simulasi berhasil dibuat untuk ${newName} (${newEmail}). Tidak ada surel nyata yang dikirim.`);
      setIsInviteModalOpen(false);
      setNewName('');
      setNewEmail('');

      setTimeout(() => {
        setInviteSuccessMsg(null);
      }, 6000);
    } else {
      setReadOnlyNotice('Fitur pembuatan undangan pengguna langsung (POST /api/admin/invitations) dikunci pada Fase 2C.1 Read-Only.');
      setIsInviteModalOpen(false);
    }
  };

  const handleLiveActionAttempt = (actionName: string) => {
    setReadOnlyNotice(`Aksi "${actionName}" tidak tersedia pada Fase 2C.1 Read-Only. Modul mutasi akun akan diaktifkan pada Fase 2C.2.`);
    setTimeout(() => {
      setReadOnlyNotice(null);
    }, 6000);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-[#35115A] text-white px-2.5 py-0.5 rounded-md text-[11px] font-bold inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-purple-300" /> Super Admin</span>;
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">Admin</span>;
      case 'MANAGEMENT':
        return <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">Manajemen</span>;
      case 'TEAM_LEAD':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">Team Lead</span>;
      case 'CONTRIBUTOR':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md text-[11px] font-medium">Kontributor</span>;
    }
  };

  const formatCreatedDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#35115A]">
              Manajemen pengguna & hak akses
            </h1>
            {!isDesignPreview && (
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live API Read-Only
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isDesignPreview
              ? 'Daftar persona anggota Onewill Academy dan perannya dalam alur pelaporan.'
              : 'Daftar terverifikasi seluruh pengguna terdaftar dalam database Firestore Onewill Academy.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isDesignPreview && (
            <button
              onClick={fetchLiveUsers}
              disabled={loading}
              title="Perbarui Data"
              className="inline-flex items-center justify-center p-2.5 text-slate-600 hover:text-[#35115A] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {isDesignPreview ? (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Undang Pengguna (Simulasi)</span>
            </button>
          ) : (
            <button
              onClick={() => handleLiveActionAttempt('Undang Pengguna Baru')}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed opacity-80"
              title="Aksi mutasi dikunci pada Fase 2C.1 Read-Only"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Undang Pengguna (Read-Only)</span>
            </button>
          )}
        </div>
      </div>

      {/* Read-Only Notice Banner */}
      {readOnlyNotice && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{readOnlyNotice}</span>
          </div>
          <button onClick={() => setReadOnlyNotice(null)} className="text-amber-700 hover:text-amber-950 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {inviteSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}

      {/* Role Matrix Explanation */}
      <div className="bg-[#F4EFFA] p-4 sm:p-5 rounded-2xl border border-[#ebdcf9] text-xs text-[#35115A] space-y-3">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-[#6C2AA6]" />
          <span>Matriks hak akses & persetujuan (segregasi tugas)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[11px] text-[#35115A]/80">
          <div className="p-3 bg-white/80 rounded-xl">
            <strong className="block text-[#35115A] font-bold mb-0.5">Super Admin:</strong>
            Akses penuh seluruh modul sistem & konfigurasi.
          </div>
          <div className="p-3 bg-white/80 rounded-xl">
            <strong className="block text-[#35115A] font-bold mb-0.5">Admin:</strong>
            Manajemen pengguna, divisi, dan integrasi Drive.
          </div>
          <div className="p-3 bg-white/80 rounded-xl">
            <strong className="block text-[#35115A] font-bold mb-0.5">Manajemen:</strong>
            Persetujuan laporan lintas divisi organisasi.
          </div>
          <div className="p-3 bg-white/80 rounded-xl">
            <strong className="block text-[#35115A] font-bold mb-0.5">Team Lead:</strong>
            Menyetujui laporan divisi sendiri (non-penulis).
          </div>
          <div className="p-3 bg-white/80 rounded-xl">
            <strong className="block text-[#35115A] font-bold mb-0.5">Kontributor:</strong>
            Menyusun draf & mengajukan laporan mingguan.
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#6C2AA6] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Memuat registri pengguna dari server database...</p>
          <p className="text-xs text-slate-400">Mengambil data terverifikasi via GET /api/admin/users</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">Gagal Mengambil Data Registri</h3>
            <p className="text-xs text-slate-600">{error.message}</p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            {error.isAuthError ? (
              <a
                href="/login"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center"
              >
                Ke Halaman Login
              </a>
            ) : (
              <button
                onClick={fetchLiveUsers}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            )}
          </div>
        </div>
      ) : !isDesignPreview && liveUsers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Pengguna Terdaftar</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ada catatan pengguna yang ditemukan dalam koleksi Firestore `users`.
          </p>
        </div>
      ) : (
        /* User Directory Table / Card Container */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-slate-700">
              Daftar anggota terdaftar ({isDesignPreview ? demoUsers.length : liveUsers.length})
            </span>
            <span className="text-slate-500 text-[11px]">
              {isDesignPreview
                ? 'Klik "Uji Masuk" untuk berganti persona secara langsung'
                : 'Mode Live Read-Only: Seluruh data bersumber langsung dari database'}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Nama pengguna</th>
                  <th className="py-3.5 px-4">Surel Google Workspace</th>
                  <th className="py-3.5 px-4">Peran (Role)</th>
                  <th className="py-3.5 px-4">Divisi tim</th>
                  <th className="py-3.5 px-4">Status & Tanggal Terdaftar</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isDesignPreview
                  ? demoUsers.map((user) => {
                      const isCurrent = currentUser.id === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                                style={{ backgroundColor: user.avatarColor }}
                              >
                                {user.avatarInitials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{user.name}</div>
                                {isCurrent && (
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    (Sedang aktif)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {user.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {getRoleBadge(user.role)}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {user.teamName}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px] tabular-nums">
                            {user.lastActive}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isCurrent ? (
                              <span className="text-[11px] font-semibold text-emerald-700 px-3 py-1.5 bg-emerald-50 rounded-lg inline-block">
                                Aktif
                              </span>
                            ) : (
                              <button
                                onClick={() => switchUser(user.id)}
                                className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[#6C2AA6] hover:text-[#35115A] bg-[#F4EFFA] hover:bg-[#ebdcf9] rounded-lg transition-colors cursor-pointer"
                              >
                                Uji Masuk
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  : liveUsers.map((u) => {
                      const teamName = DEMO_TEAMS.find((t) => t.id === u.teamId)?.name || u.teamId;

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#6C2AA6] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                {getInitials(u.displayName || u.email)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{u.displayName || u.email.split('@')[0]}</div>
                                <div className="text-[10px] text-slate-400 font-mono">UID: {u.uid.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {getRoleBadge(u.role)}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {teamName}
                          </td>

                          <td className="py-3.5 px-4 text-[11px]">
                            <div className="flex items-center gap-2">
                              {u.active ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-md text-[10px] border border-emerald-200">
                                  Aktif
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded-md text-[10px] border border-rose-200">
                                  Nonaktif
                                </span>
                              )}
                              <span className="text-slate-400 text-[10px]">{formatCreatedDate(u.createdAt)}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleLiveActionAttempt('Edit Pengguna')}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              title="Aksi mutasi dikunci pada Fase 2C.1 Read-Only"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Read-Only</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Mobile Record Cards View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {isDesignPreview
              ? demoUsers.map((user) => {
                  const isCurrent = currentUser.id === user.id;

                  return (
                    <div key={user.id} className="p-4 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                            style={{ backgroundColor: user.avatarColor }}
                          >
                            {user.avatarInitials}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{user.name}</h3>
                            <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                          </div>
                        </div>
                        {getRoleBadge(user.role)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Divisi:</span>
                          <span className="font-semibold text-slate-800">{user.teamName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">Status:</span>
                          <span className="text-slate-700 text-[11px]">{user.lastActive}</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        {isCurrent ? (
                          <div className="w-full min-h-[44px] py-2 px-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl text-center flex items-center justify-center">
                            Persona Sedang Aktif
                          </div>
                        ) : (
                          <button
                            onClick={() => switchUser(user.id)}
                            className="w-full min-h-[44px] py-2 px-3 bg-[#6C2AA6] hover:bg-[#35115A] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                          >
                            <span>Uji Masuk sebagai {user.name.split(' ')[0]}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              : liveUsers.map((u) => {
                  const teamName = DEMO_TEAMS.find((t) => t.id === u.teamId)?.name || u.teamId;

                  return (
                    <div key={u.uid} className="p-4 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#6C2AA6] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                            {getInitials(u.displayName || u.email)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{u.displayName || u.email.split('@')[0]}</h3>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                        {getRoleBadge(u.role)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Divisi:</span>
                          <span className="font-semibold text-slate-800">{teamName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">Terdaftar:</span>
                          <span className="text-slate-700 text-[11px]">{formatCreatedDate(u.createdAt)}</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => handleLiveActionAttempt('Kelola Akun')}
                          className="w-full min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Mode Read-Only (Aksi Dikunci)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* Invite Modal Simulation */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Undang pengguna baru (simulasi)</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateInvite} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <Info className="w-3.5 h-3.5 inline mr-1 text-amber-700" />
                Mode Uji Coba: Tidak ada surel undangan nyata yang dikirim. Pengguna baru akan ditambahkan ke sesi peramban lokal.
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama lengkap</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Farhan Ramadhan"
                  className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Surel perusahaan</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="farhan@onewill-demo.id"
                  className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Peran (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white cursor-pointer"
                  >
                    <option value="CONTRIBUTOR">Kontributor</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="MANAGEMENT">Manajemen</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Divisi / Tim</label>
                  <select
                    value={newTeamId}
                    onChange={(e) => setNewTeamId(e.target.value)}
                    className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white cursor-pointer"
                  >
                    {DEMO_TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  Simulasikan Undangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
