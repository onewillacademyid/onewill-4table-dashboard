'use client';

/**
 * AdminUsersView Component
 * User directory and role management demo.
 * Clearly disclaims real email invites or production persistence.
 */

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Info
} from 'lucide-react';
import { DEMO_USERS, DEMO_TEAMS } from '../services/reportRepository';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminUsersView: React.FC = () => {
  const { currentUser, switchUser } = useAuth();
  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Invite Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('CONTRIBUTOR');
  const [newTeamId, setNewTeamId] = useState(DEMO_TEAMS[0].id);

  const handleSimulateInvite = (e: React.FormEvent) => {
    e.preventDefault();
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

    setUsers([newUser, ...users]);
    setInviteSuccessMsg(`Undangan simulasi berhasil dibuat untuk ${newName} (${newEmail}). Tidak ada surel nyata yang dikirim.`);
    setIsInviteModalOpen(false);
    setNewName('');
    setNewEmail('');

    setTimeout(() => {
      setInviteSuccessMsg(null);
    }, 6000);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-[#35115A] text-white px-2 py-0.5 rounded text-[11px] font-bold">Super Admin</span>;
      case 'ADMIN':
        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[11px] font-semibold">Admin</span>;
      case 'MANAGEMENT':
        return <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[11px] font-semibold">Manajemen</span>;
      case 'TEAM_LEAD':
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold">Team Lead</span>;
      case 'CONTRIBUTOR':
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">Kontributor</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#35115A]">
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar persona anggota Onewill Academy dan perannya dalam alur pelaporan
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-lg transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Undang Pengguna (Simulasi)</span>
        </button>
      </div>

      {inviteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}

      {/* Role Matrix Explanation */}
      <div className="bg-[#F4EFFA] p-4 rounded-xl border border-[#ebdcf9] text-xs text-[#35115A]">
        <div className="flex items-center gap-2 font-bold mb-2">
          <ShieldCheck className="w-4 h-4 text-[#6C2AA6]" />
          <span>Matriks Hak Akses & Persetujuan (Segregasi Tugas)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-[11px] text-[#35115A]/80">
          <div className="p-2.5 bg-white/70 rounded-lg">
            <strong className="block text-[#35115A] font-bold">Super Admin:</strong>
            Hak akses penuh seluruh modul sistem, bypass, dan konfigurasi.
          </div>
          <div className="p-2.5 bg-white/70 rounded-lg">
            <strong className="block text-[#35115A] font-bold">Admin:</strong>
            Manajemen pengguna, pengaturan divisi, dan integrasi Drive.
          </div>
          <div className="p-2.5 bg-white/70 rounded-lg">
            <strong className="block text-[#35115A] font-bold">Manajemen:</strong>
            Menyetujui/meminta revisi laporan dari seluruh divisi organisasi.
          </div>
          <div className="p-2.5 bg-white/70 rounded-lg">
            <strong className="block text-[#35115A] font-bold">Team Lead:</strong>
            Menyetujui laporan divisi sendiri (kecuali laporan yang ia tulis).
          </div>
          <div className="p-2.5 bg-white/70 rounded-lg">
            <strong className="block text-[#35115A] font-bold">Kontributor:</strong>
            Menyusun draf laporan mingguan dan mengajukan untuk tinjauan.
          </div>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Daftar Anggota Terdaftar ({users.length})
          </span>
          <span className="text-slate-500">
            Klik "Uji Masuk" untuk berganti persona secara langsung
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Surel Google Workspace</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Divisi Tim</th>
                <th className="py-3 px-4">Aktivitas Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi Simulasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isCurrent = currentUser.id === user.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.avatarInitials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.name}</div>
                          {isCurrent && (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              (Sedang Aktif)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {user.email}
                    </td>

                    <td className="py-3 px-4">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {user.teamName}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] tabular-nums">
                      {user.lastActive}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isCurrent ? (
                        <span className="text-[11px] font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded">
                          Aktif
                        </span>
                      ) : (
                        <button
                          onClick={() => switchUser(user.id)}
                          className="text-xs font-semibold text-[#6C2AA6] hover:text-[#35115A] hover:underline cursor-pointer"
                        >
                          Uji Masuk
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal Simulation */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-[#35115A] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Undang Pengguna Baru (Simulasi)</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateInvite} className="p-5 space-y-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                <Info className="w-3.5 h-3.5 inline mr-1 text-amber-700" />
                Mode Uji Coba: Tidak ada surel undangan nyata yang dikirim. Pengguna baru akan ditambahkan ke sesi peramban lokal.
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Farhan Ramadhan"
                  className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Surel Perusahaan</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="farhan@onewill-demo.id"
                  className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Peran (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
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
                    className="w-full p-2 text-xs rounded-md border border-slate-300 focus:border-[#6C2AA6] outline-hidden bg-white"
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
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-lg transition-colors cursor-pointer"
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
