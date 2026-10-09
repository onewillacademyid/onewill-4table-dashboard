'use client';

/**
 * AdminUsersView Component — Phase 2C.2A Controlled Mutation UI
 * 
 * Features:
 * 1. Live Mode (isDesignPreview = false):
 *    - Fetches real user registry from GET /api/admin/users.
 *    - Displays server feature flag status (mutationsEnabled derived from GET response).
 *    - Implements controlled Invitation Modal, Role Management Modal, and Activation/Deactivation Modal.
 *    - Submits requests to POST /api/admin/invitations and PATCH /api/admin/users/[uid].
 *    - Enforces confirmation steps, loading states, inline validation, and error handling (400, 401, 403 MUTATIONS_DISABLED, 409, 500).
 *    - Re-fetches user registry on successful mutations.
 *    - Prevents double submissions and client-side authorization bypasses.
 * 2. Design Preview Mode (isDesignPreview = true):
 *    - Preserves client-side synthetic DEMO_USERS simulation for Preview Studio.
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
  Loader2,
  ShieldAlert,
  UserCheck,
  UserX,
  Edit3
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

  // Live state for server mode
  const [liveUsers, setLiveUsers] = useState<LiveAdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(!isDesignPreview);
  const [error, setError] = useState<{ message: string; isAuthError?: boolean } | null>(null);
  const [mutationsEnabled, setMutationsEnabled] = useState<boolean>(false);

  // Modals & Feedback State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Selected Target User for Role or Status Edit
  const [selectedUser, setSelectedUser] = useState<LiveAdminUser | null>(null);

  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('CONTRIBUTOR');
  const [inviteTeamId, setInviteTeamId] = useState(DEMO_TEAMS[0].id);
  const [inviteConfirmStep, setInviteConfirmStep] = useState(false);

  // Role Edit Form State
  const [newRole, setNewRole] = useState<UserRole>('CONTRIBUTOR');
  const [roleConfirmStep, setRoleConfirmStep] = useState(false);

  // Status Toggle Form State
  const [statusConfirmStep, setStatusConfirmStep] = useState(false);

  // Mutation Submitting & Notice States
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

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
      setMutationsEnabled(!!data.mutationsEnabled);
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

  // Handle Invitation Submit
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteConfirmStep) {
      setInviteConfirmStep(true);
      return;
    }

    if (isDesignPreview) {
      // Local preview simulation
      const team = DEMO_TEAMS.find((t) => t.id === inviteTeamId) || DEMO_TEAMS[0];
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        teamId: team.id,
        teamName: team.name,
        avatarColor: '#6C2AA6',
        avatarInitials: inviteEmail.slice(0, 2).toUpperCase(),
        active: true,
        lastActive: 'Baru saja diundang (Simulasi)',
      };
      setDemoUsers([newUser, ...demoUsers]);
      setMutationSuccess(`Undangan simulasi berhasil dibuat untuk ${inviteEmail}.`);
      setIsInviteModalOpen(false);
      resetInviteForm();
      return;
    }

    setSubmitting(true);
    setMutationError(null);

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          teamId: inviteTeamId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMutationError(data.error || 'Gagal membuat undangan pengguna.');
        return;
      }

      setMutationSuccess(`Undangan berhasil dibuat untuk ${inviteEmail} (Status: PENDING).`);
      setIsInviteModalOpen(false);
      resetInviteForm();
      await fetchLiveUsers();
    } catch (err: any) {
      setMutationError('Terjadi kesalahan jaringan saat menghubungi server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Role Change Submit
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!roleConfirmStep) {
      setRoleConfirmStep(true);
      return;
    }

    if (isDesignPreview) {
      setDemoUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.uid ? { ...u, role: newRole } : u))
      );
      setMutationSuccess(`Peran pengguna ${selectedUser.email} berhasil diperbarui (Simulasi).`);
      setIsRoleModalOpen(false);
      resetRoleForm();
      return;
    }

    setSubmitting(true);
    setMutationError(null);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMutationError(data.error || 'Gagal memperbarui peran pengguna.');
        return;
      }

      setMutationSuccess(`Peran pengguna ${selectedUser.email} berhasil diubah menjadi ${newRole}.`);
      setIsRoleModalOpen(false);
      resetRoleForm();
      await fetchLiveUsers();
    } catch (err) {
      setMutationError('Terjadi kesalahan jaringan saat memperbarui peran pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Toggle Submit (Activate/Deactivate)
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!statusConfirmStep) {
      setStatusConfirmStep(true);
      return;
    }

    const targetActiveState = !selectedUser.active;

    if (isDesignPreview) {
      setDemoUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.uid ? { ...u, active: targetActiveState } : u))
      );
      setMutationSuccess(`Status akun ${selectedUser.email} berhasil diubah (Simulasi).`);
      setIsStatusModalOpen(false);
      resetStatusForm();
      return;
    }

    setSubmitting(true);
    setMutationError(null);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: targetActiveState }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMutationError(data.error || 'Gagal mengubah status akun pengguna.');
        return;
      }

      setMutationSuccess(`Status akun ${selectedUser.email} berhasil diubah menjadi ${targetActiveState ? 'Aktif' : 'Nonaktif'}.`);
      setIsStatusModalOpen(false);
      resetStatusForm();
      await fetchLiveUsers();
    } catch (err) {
      setMutationError('Terjadi kesalahan jaringan saat mengubah status akun.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteRole('CONTRIBUTOR');
    setInviteTeamId(DEMO_TEAMS[0].id);
    setInviteConfirmStep(false);
    setMutationError(null);
  };

  const resetRoleForm = () => {
    setSelectedUser(null);
    setRoleConfirmStep(false);
    setMutationError(null);
  };

  const resetStatusForm = () => {
    setSelectedUser(null);
    setStatusConfirmStep(false);
    setMutationError(null);
  };

  const openRoleModal = (user: LiveAdminUser) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleConfirmStep(false);
    setMutationError(null);
    setIsRoleModalOpen(true);
  };

  const openStatusModal = (user: LiveAdminUser) => {
    setSelectedUser(user);
    setStatusConfirmStep(false);
    setMutationError(null);
    setIsStatusModalOpen(true);
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
              mutationsEnabled ? (
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Mutasi Aktif (Server)
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Mutasi Dikunci (ADMIN_MUTATIONS_ENABLED=false)
                </span>
              )
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isDesignPreview
              ? 'Daftar persona anggota Onewill Academy dan perannya dalam alur pelaporan (Mode Pratinjau Studio).'
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

          <button
            onClick={() => {
              resetInviteForm();
              setIsInviteModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Undang Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Mutation Feedback Banner */}
      {mutationSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mutationSuccess}</span>
          </div>
          <button onClick={() => setMutationSuccess(null)} className="text-emerald-700 hover:text-emerald-950 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Server Feature Gate Warning Banner (if live mode and flag is disabled) */}
      {!isDesignPreview && !mutationsEnabled && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Informasi Fitur Server:</strong> Fitur mutasi server (`ADMIN_MUTATIONS_ENABLED`) saat ini dinonaktifkan secara default di server. Pengiriman mutasi akan diuji terhadap penolakan aman (HTTP 403 `MUTATIONS_DISABLED`).
          </span>
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
                : 'Pilih aksi pada baris pengguna untuk memperbarui peran atau status akun'}
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
                  <th className="py-3.5 px-4 text-right">Aksi Terkontrol</th>
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
                      const isSelf = u.uid === currentUser.id;
                      const isTargetSuper = u.role === 'SUPER_ADMIN';
                      const isCallerAdmin = currentUser.role === 'ADMIN';
                      const isLockedForAdmin = isTargetSuper && isCallerAdmin;

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#6C2AA6] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                {getInitials(u.displayName || u.email)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {u.displayName || u.email.split('@')[0]}
                                  {isSelf && <span className="ml-1 text-[10px] text-emerald-700 font-semibold">(Anda)</span>}
                                </div>
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
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-md text-[10px] border border-emerald-200 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-emerald-600" /> Aktif
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded-md text-[10px] border border-rose-200 flex items-center gap-1">
                                  <UserX className="w-3 h-3 text-rose-600" /> Nonaktif
                                </span>
                              )}
                              <span className="text-slate-400 text-[10px]">{formatCreatedDate(u.createdAt)}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Role Button */}
                              {isSelf ? (
                                <span className="text-[10px] text-slate-400 font-medium px-2 py-1">Role Sendiri</span>
                              ) : isLockedForAdmin ? (
                                <span className="text-[10px] text-slate-400 font-medium px-2 py-1">Terkunci (Super Admin)</span>
                              ) : (
                                <button
                                  onClick={() => openRoleModal(u)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-[#6C2AA6] hover:text-[#35115A] bg-[#F4EFFA] hover:bg-[#ebdcf9] rounded-lg transition-colors cursor-pointer min-h-[36px] inline-flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Peran</span>
                                </button>
                              )}

                              {/* Toggle Status Button */}
                              {isSelf ? (
                                <span className="text-[10px] text-slate-400 font-medium px-2 py-1">Akun Sendiri</span>
                              ) : isLockedForAdmin ? (
                                null
                              ) : (
                                <button
                                  onClick={() => openStatusModal(u)}
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer min-h-[36px] inline-flex items-center gap-1 ${
                                    u.active
                                      ? 'text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100'
                                      : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                >
                                  {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                                </button>
                              )}
                            </div>
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
                  const isSelf = u.uid === currentUser.id;
                  const isTargetSuper = u.role === 'SUPER_ADMIN';
                  const isCallerAdmin = currentUser.role === 'ADMIN';
                  const isLockedForAdmin = isTargetSuper && isCallerAdmin;

                  return (
                    <div key={u.uid} className="p-4 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#6C2AA6] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                            {getInitials(u.displayName || u.email)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">
                              {u.displayName || u.email.split('@')[0]}
                              {isSelf && <span className="ml-1 text-[10px] text-emerald-700 font-semibold">(Anda)</span>}
                            </h3>
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

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {!isSelf && !isLockedForAdmin ? (
                          <>
                            <button
                              onClick={() => openRoleModal(u)}
                              className="w-full min-h-[44px] py-2 px-3 bg-[#F4EFFA] hover:bg-[#ebdcf9] text-[#6C2AA6] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Ubah Peran</span>
                            </button>
                            <button
                              onClick={() => openStatusModal(u)}
                              className={`w-full min-h-[44px] py-2 px-3 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                u.active
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </>
                        ) : (
                          <div className="col-span-2 min-h-[44px] py-2 px-3 bg-slate-100 text-slate-500 text-xs font-medium rounded-xl text-center flex items-center justify-center">
                            {isSelf ? 'Akun Anda Sendiri (Aksi Terkunci)' : 'Terkunci (Super Admin)'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* Controlled Invitation Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-300" />
                <span>{isDesignPreview ? 'Undang pengguna baru (simulasi)' : 'Buat Undangan Pengguna Baru'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  resetInviteForm();
                }}
                disabled={submitting}
                className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-5 space-y-4">
              {mutationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{mutationError}</span>
                </div>
              )}

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-[11px] space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#6C2AA6]" /> Catatan Alur Onboarding:
                </p>
                <p>
                  Membuat undangan PENDING tidak secara otomatis mengirim surel. Penerima dapat mendaftar menggunakan Google Sign-In dengan email yang diundang.
                </p>
              </div>

              {!inviteConfirmStep ? (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Surel Perusahaan Google Workspace</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="pengguna@onewillacademy.id"
                      className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Peran (Role)</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                        className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white cursor-pointer"
                      >
                        <option value="CONTRIBUTOR">Kontributor</option>
                        <option value="TEAM_LEAD">Team Lead</option>
                        <option value="MANAGEMENT">Manajemen</option>
                        <option value="ADMIN">Admin</option>
                        {currentUser.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                      </select>
                      {currentUser.role === 'ADMIN' && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Super Admin hanya dapat diundang oleh Super Admin.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Divisi / Tim</label>
                      <select
                        value={inviteTeamId}
                        onChange={(e) => setInviteTeamId(e.target.value)}
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
                </>
              ) : (
                /* Confirmation Step */
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#6C2AA6]" /> Konfirmasi Pembuatan Undangan
                  </h4>
                  <div className="text-[11px] text-slate-700 space-y-1">
                    <p><strong>Target Email:</strong> {inviteEmail}</p>
                    <p><strong>Peran (Role):</strong> {inviteRole}</p>
                    <p><strong>Divisi:</strong> {DEMO_TEAMS.find(t => t.id === inviteTeamId)?.name || inviteTeamId}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-2">
                    Apakah Anda yakin ingin mendaftarkan undangan PENDING ini ke sistem?
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    if (inviteConfirmStep) {
                      setInviteConfirmStep(false);
                    } else {
                      setIsInviteModalOpen(false);
                      resetInviteForm();
                    }
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer min-h-[44px]"
                >
                  {inviteConfirmStep ? 'Kembali Edit' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-2 shadow-2xs"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{inviteConfirmStep ? 'Konfirmasi & Buat Undangan' : 'Tinjau Undangan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controlled Role Change Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-300" />
                <span>Pembaruan Peran (Role) Pengguna</span>
              </h3>
              <button
                onClick={() => {
                  setIsRoleModalOpen(false);
                  resetRoleForm();
                }}
                disabled={submitting}
                className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="p-5 space-y-4">
              {mutationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{mutationError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-800">
                <p><strong>Pengguna:</strong> {selectedUser.displayName || selectedUser.email}</p>
                <p><strong>Surel:</strong> {selectedUser.email}</p>
                <p><strong>Peran Saat Ini:</strong> {selectedUser.role}</p>
              </div>

              {!roleConfirmStep ? (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pilih Peran Baru</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full p-2.5 min-h-[44px] text-xs rounded-xl border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white cursor-pointer"
                  >
                    <option value="CONTRIBUTOR">Kontributor</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="MANAGEMENT">Manajemen</option>
                    <option value="ADMIN">Admin</option>
                    {currentUser.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" /> Konfirmasi Perubahan Peran
                  </h4>
                  <p className="text-[11px]">
                    Apakah Anda yakin ingin mengubah peran <strong>{selectedUser.email}</strong> dari <strong>{selectedUser.role}</strong> menjadi <strong>{newRole}</strong>?
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    if (roleConfirmStep) {
                      setRoleConfirmStep(false);
                    } else {
                      setIsRoleModalOpen(false);
                      resetRoleForm();
                    }
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer min-h-[44px]"
                >
                  {roleConfirmStep ? 'Kembali Edit' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || newRole === selectedUser.role}
                  className="px-4 py-2 font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{roleConfirmStep ? 'Konfirmasi Simpan Peran' : 'Lanjutkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controlled Status Toggle Modal (Activate/Deactivate) */}
      {isStatusModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className={`p-4 text-white flex items-center justify-between ${selectedUser.active ? 'bg-rose-900' : 'bg-emerald-900'}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                {selectedUser.active ? <UserX className="w-4 h-4 text-rose-300" /> : <UserCheck className="w-4 h-4 text-emerald-300" />}
                <span>{selectedUser.active ? 'Konfirmasi Penonaktifan Akun' : 'Konfirmasi Aktivasi Akun'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsStatusModalOpen(false);
                  resetStatusForm();
                }}
                disabled={submitting}
                className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-5 space-y-4">
              {mutationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{mutationError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-800">
                <p><strong>Pengguna:</strong> {selectedUser.displayName || selectedUser.email}</p>
                <p><strong>Surel:</strong> {selectedUser.email}</p>
                <p><strong>Status Saat Ini:</strong> {selectedUser.active ? 'Aktif' : 'Nonaktif'}</p>
              </div>

              {selectedUser.active ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-950 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs flex items-center gap-1.5 text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600" /> PERINGATAN PENONAKTIFAN
                  </h4>
                  <p className="text-[11px]">
                    Akun <strong>{selectedUser.email}</strong> akan dinonaktifkan. Pengguna tidak dapat lagi masuk ke dashboard. Akun tidak akan dihapus dari Firebase Auth.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> AKTIVASI AKUN
                  </h4>
                  <p className="text-[11px]">
                    Akun <strong>{selectedUser.email}</strong> akan diaktifkan kembali dan dapat masuk ke dashboard Onewill Academy.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsStatusModalOpen(false);
                    resetStatusForm();
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 font-semibold text-white rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-2 shadow-2xs ${
                    selectedUser.active ? 'bg-rose-700 hover:bg-rose-900' : 'bg-emerald-700 hover:bg-emerald-900'
                  }`}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{selectedUser.active ? 'Ya, Nonaktifkan Akun' : 'Ya, Aktifkan Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
