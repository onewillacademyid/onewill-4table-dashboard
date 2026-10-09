'use client';

/**
 * Header Component (Conforms to 3-zone Top Bar Contract in Next.js App Router)
 * Zone 1: Brand wordmark & logo
 * Zone 2: Navigation links
 * Zone 3: Primary action (+ Buat Laporan) + Login/Logout & Persona Switcher
 */

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, ChevronDown, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLiveAuth, isAuthenticated, logout, openLoginModal } = useAuth();

  const rawNavItems = [
    { href: '/dashboard', label: 'Ringkasan', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'TEAM_LEAD', 'CONTRIBUTOR'] },
    { href: '/reports', label: 'Daftar Laporan', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'TEAM_LEAD', 'CONTRIBUTOR'] },
    { href: '/reviews', label: 'Antrean Tinjauan', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'TEAM_LEAD'] },
    { href: '/admin/users', label: 'Pengguna', allowedRoles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/integrations', label: 'Integrasi Drive', allowedRoles: ['SUPER_ADMIN'] },
  ];

  const navItems = currentUser
    ? rawNavItems.filter((item) => item.allowedRoles.includes(currentUser.role))
    : rawNavItems.filter((item) => ['/dashboard', '/reports'].includes(item.href));

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
      {/* Simulation/Auth status top banner */}
      <div className="bg-[#35115A] text-white text-[11px] py-1 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${isLiveAuth ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span>
          {isLiveAuth && currentUser
            ? `Sesi Otentikasi Terverifikasi: ${currentUser.email} (${getRoleLabel(currentUser.role)})`
            : 'Mode Demo UI • Otentikasi Simulasikan Berfungsi'}
        </span>
        <span className="text-[#ebdcf9]/70 hidden sm:inline">|</span>
        {isLiveAuth ? (
          <button
            onClick={logout}
            className="text-[#ebdcf9] underline hover:text-white cursor-pointer transition-colors"
          >
            Keluar (Logout)
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-[#ebdcf9] font-bold underline hover:text-white cursor-pointer transition-colors"
            >
              Masuk Real (Firebase)
            </Link>
            <span>•</span>
            <button 
              onClick={openLoginModal} 
              className="text-[#ebdcf9] underline hover:text-white cursor-pointer transition-colors"
            >
              Ganti Persona Demo
            </button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ZONE 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 text-left group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6C2AA6] rounded-md"
              aria-label="Kembali ke Beranda Onewill Academy"
            >
              <div className="h-8.5 w-8.5 bg-[#35115A] text-white font-extrabold rounded-lg flex items-center justify-center text-sm shadow-sm group-hover:bg-[#6C2AA6] transition-colors">
                OW
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-[#43105B] leading-tight group-hover:text-[#6C2AA6] transition-colors">
                  Onewill Academy
                </span>
                <span className="text-[10px] tracking-wide text-slate-500 font-medium">
                  4 Table Weekly Progress
                </span>
              </div>
            </Link>
          </div>

          {/* ZONE 2: Clean semantic text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/reports' && pathname.startsWith('/reports'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-1 relative transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-[#35115A] font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6C2AA6] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ZONE 3: Actions & Auth User Controls */}
          <div className="flex items-center gap-3">
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6C2AA6] hover:bg-[#35115A] active:scale-98 transition-all rounded-lg shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Laporan</span>
            </Link>

            {isLiveAuth && currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-900 text-[11px] leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 leading-tight">
                      {getRoleLabel(currentUser.role)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Keluar"
                  className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#6C2AA6] text-[#6C2AA6] hover:bg-[#F4EFFA] text-xs font-semibold transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk</span>
                </Link>
                <button
                  onClick={openLoginModal}
                  title="Ganti peran pengguna simulasi"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-slate-700 cursor-pointer"
                >
                  <span className="text-[11px] font-medium hidden sm:inline">Persona Demo</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-1 py-2 overflow-x-auto border-t border-slate-100 text-xs">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#F4EFFA] text-[#35115A] font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
