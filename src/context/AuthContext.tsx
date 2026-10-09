'use client';

/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Auth Context and Role Permissions Helper
 * Integrates real Firebase Auth + Server Session verification alongside demo persona switching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, WeeklyReport } from '../types';
import { DEMO_USERS } from '../services/reportRepository';
import { fetchServerSession, logoutClient } from '@/lib/firebase/auth-client';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  isAuthenticated: boolean;
  isLiveAuth: boolean;
  isSessionLoading: boolean;
  switchUser: (userId: string) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  canApprove: (report: WeeklyReport) => { allowed: boolean; reason?: string };
  canEdit: (report: WeeklyReport) => boolean;
  canSubmit: (report: WeeklyReport) => boolean;
  canArchive: (report: WeeklyReport) => boolean;
  canManageUsers: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'onewill_demo_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Real authenticated runtime initializes currentUser as null until server session resolves
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLiveAuth, setIsLiveAuth] = useState<boolean>(false);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const refreshSession = useCallback(async () => {
    setIsSessionLoading(true);
    try {
      const res = await fetchServerSession();
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        setIsLiveAuth(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsLiveAuth(false);
      }
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = async () => {
    await logoutClient();
    setIsAuthenticated(false);
    setIsLiveAuth(false);
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    // Prohibit demo persona switching from overriding active live Firebase session
    if (isLiveAuth) {
      console.warn('Switch user ignored: Live Firebase session is active.');
      return;
    }
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setIsLiveAuth(false);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CURRENT_USER_KEY, user.id);
        } catch {
          // ignore
        }
      }
    }
  };

  const canApprove = (report: WeeklyReport): { allowed: boolean; reason?: string } => {
    if (!currentUser) {
      return { allowed: false, reason: 'Pengguna belum terotentikasi.' };
    }

    if (report.status !== 'SUBMITTED') {
      return { allowed: false, reason: 'Laporan belum diajukan untuk peninjauan (status bukan SUBMITTED).' };
    }

    if (report.authorId === currentUser.id) {
      return { 
        allowed: false, 
        reason: 'Prinsip Segregasi Tugas: Anda adalah penulis laporan ini dan tidak dapat menyetujui laporan sendiri.' 
      };
    }

    const reviewerRoles = ['TEAM_LEAD', 'MANAGEMENT', 'ADMIN', 'SUPER_ADMIN'];
    if (!reviewerRoles.includes(currentUser.role)) {
      return { 
        allowed: false, 
        reason: 'Peran Contributor tidak memiliki hak akses persetujuan manajerial.' 
      };
    }

    if (currentUser.role === 'TEAM_LEAD' && report.teamId !== currentUser.teamId) {
      return {
        allowed: false,
        reason: 'Team Lead hanya dapat meninjau laporan dari divisi yang dipimpinnya.',
      };
    }

    return { allowed: true };
  };

  const canEdit = (report: WeeklyReport): boolean => {
    if (!currentUser) return false;
    if (report.status === 'APPROVED' || report.status === 'ARCHIVED') {
      return false;
    }

    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') {
      return true;
    }

    return report.authorId === currentUser.id;
  };

  const canSubmit = (report: WeeklyReport): boolean => {
    if (!currentUser) return false;
    if (report.status !== 'DRAFT' && report.status !== 'NEEDS_REVISION') {
      return false;
    }
    return report.authorId === currentUser.id || currentUser.role === 'SUPER_ADMIN';
  };

  const canArchive = (report: WeeklyReport): boolean => {
    if (!currentUser) return false;
    if (report.status !== 'APPROVED') return false;
    return ['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  };

  const canManageUsers = currentUser ? ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) : false;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers: DEMO_USERS,
        isAuthenticated,
        isLiveAuth,
        isSessionLoading,
        refreshSession,
        logout,
        switchUser,
        canApprove,
        canEdit,
        canSubmit,
        canArchive,
        canManageUsers,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
