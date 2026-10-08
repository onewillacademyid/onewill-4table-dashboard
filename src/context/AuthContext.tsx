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
  currentUser: User;
  allUsers: User[];
  isAuthenticated: boolean;
  isLiveAuth: boolean;
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
  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem(CURRENT_USER_KEY);
        const found = DEMO_USERS.find((u) => u.id === savedId);
        if (found) return found;
      } catch {
        // ignore
      }
    }
    return DEMO_USERS[1];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLiveAuth, setIsLiveAuth] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const refreshSession = useCallback(async () => {
    const res = await fetchServerSession();
    if (res.success && res.user) {
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      setIsLiveAuth(true);
    } else {
      setIsAuthenticated(false);
      setIsLiveAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = async () => {
    await logoutClient();
    setIsAuthenticated(false);
    setIsLiveAuth(false);
    // Fall back to demo user persona
    setCurrentUser(DEMO_USERS[1]);
  };

  const switchUser = (userId: string) => {
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

  /**
   * Evaluates if the current user can approve a report.
   * STRICT RULE: No self-approval under any role!
   * Permitted roles for review: TEAM_LEAD, MANAGEMENT, ADMIN, SUPER_ADMIN.
   */
  const canApprove = (report: WeeklyReport): { allowed: boolean; reason?: string } => {
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

  /**
   * Evaluates if the current user can edit a report.
   * Reports can only be edited if in DRAFT or NEEDS_REVISION state.
   */
  const canEdit = (report: WeeklyReport): boolean => {
    if (report.status === 'APPROVED' || report.status === 'ARCHIVED') {
      return false;
    }

    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') {
      return true;
    }

    return report.authorId === currentUser.id;
  };

  const canSubmit = (report: WeeklyReport): boolean => {
    if (report.status !== 'DRAFT' && report.status !== 'NEEDS_REVISION') {
      return false;
    }
    return report.authorId === currentUser.id || currentUser.role === 'SUPER_ADMIN';
  };

  const canArchive = (report: WeeklyReport): boolean => {
    if (report.status !== 'APPROVED') return false;
    return ['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  };

  const canManageUsers = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers: DEMO_USERS,
        isAuthenticated,
        isLiveAuth,
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
