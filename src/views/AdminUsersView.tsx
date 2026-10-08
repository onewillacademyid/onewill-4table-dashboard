'use client';

/**
 * AdminUsersView Component
 * User directory and role management demo.
 * Clearly disclaims real email invites or production persistence.
 * Responsive mobile record cards + 44px touch targets.
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
        return <span className="bg-[#35115A] text-white px-2.5 py-0.5 rounded-md text-[11px] font-bold">Super Admin</span>;
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

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#35115A]">
            Manajemen pengguna & hak akses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar persona anggota Onewill Academy dan perannya dalam alur pelaporan.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Undang Pengguna (Simulasi)</span>
        </button>
      </div>

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

      {/* User Directory Table / Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="font-semibold text-slate-700">
            Daftar anggota terdaftar ({users.length})
          </span>
          <span className="text-slate-500 text-[11px]">
            Klik "Uji Masuk" untuk berganti persona secara langsung
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
                <th className="py-3.5 px-4">Aktivitas terakhir</th>
                <th className="py-3.5 px-4 text-right">Aksi simulasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
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
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Record Cards View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {users.map((user) => {
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
          })}
        </div>
      </div>

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
