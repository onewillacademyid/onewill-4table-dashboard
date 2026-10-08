/**
 * Header Component (Conforms to strict 3-zone Top Bar Contract)
 * Zone 1: Brand wordmark & replaceable logo placeholder
 * Zone 2: Clean semantic text navigation links
 * Zone 3: Primary action + Simulated Persona Switcher trigger
 */

import React from 'react';
import { Plus, UserCheck, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onNewReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, onNewReport }) => {
  const { currentUser, openLoginModal } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Ringkasan' },
    { id: 'reports', label: 'Daftar Laporan' },
    { id: 'reviews', label: 'Antrean Tinjauan' },
    { id: 'users', label: 'Pengguna' },
    { id: 'integrations', label: 'Integrasi Drive' },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN': return 'Admin';
      case 'MANAGEMENT': return 'Manajemen';
      case 'TEAM_LEAD': return 'Team Lead';
      case 'CONTRIBUTOR': return 'Kontributor';
      default: return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      {/* Simulation banner disclaimer */}
      <div className="bg-[#35115A] text-white text-[11px] py-1 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Mode Demo UI • Data Simulasi Terisolasi • Otentikasi & Google Drive Non-Aktif</span>
        <span className="text-[#ebdcf9]/70 hidden sm:inline">|</span>
        <button 
          onClick={openLoginModal} 
          className="text-[#ebdcf9] underline hover:text-white cursor-pointer transition-colors"
        >
          Ganti Persona Pengguna
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ZONE 1: Brand Wordmark (Dedicated logo area top-left) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6C2AA6] rounded-md"
              aria-label="Kembali ke Beranda Onewill Academy"
            >
              <img
                src="/onewill-mark.svg"
                alt="Logo Onewill Academy"
                className="h-8.5 w-8.5 object-contain"
                onError={(e) => {
                  // Fallback styling if SVG cannot be fetched
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-[#43105B] leading-tight group-hover:text-[#6C2AA6] transition-colors">
                  Onewill Academy
                </span>
                <span className="text-[10px] tracking-wide text-slate-500 font-medium">
                  4 Table Weekly Progress
                </span>
              </div>
            </button>
          </div>

          {/* ZONE 2: Clean semantic text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`py-1 relative transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-[#35115A] font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6C2AA6] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ZONE 3: Primary Action & Simulated Persona Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNewReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] active:scale-98 transition-all rounded-lg shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Laporan</span>
            </button>

            {/* Persona Switch Button */}
            <button
              onClick={openLoginModal}
              title="Ganti peran pengguna simulasi"
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-slate-700 cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.avatarInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-semibold text-slate-900 text-[11px] leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-1 py-2 overflow-x-auto border-t border-slate-100 text-xs">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#F4EFFA] text-[#35115A] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
