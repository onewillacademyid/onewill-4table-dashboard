/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Demo Auth Context and Permissions Helper
 * NOTE: UI DEMO ONLY — Simulates role-based access control.
 * In production, this will be backed by Firebase Auth & Firestore security rules.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, WeeklyReport } from '../types';
import { DEMO_USERS } from '../services/reportRepository';

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  switchUser: (userId: string) => void;
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
    try {
      const savedId = localStorage.getItem(CURRENT_USER_KEY);
      const found = DEMO_USERS.find((u) => u.id === savedId);
      if (found) return found;
    } catch {
      // ignore
    }
    // Default to Team Lead (Siti Nurhaliza) for rich preview
    return DEMO_USERS[1];
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const switchUser = (userId: string) => {
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      try {
        localStorage.setItem(CURRENT_USER_KEY, user.id);
      } catch {
        // ignore
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

    // Team Leads can review reports from their own team (except their own reports)
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
   * User must be the author, or Admin/Super Admin.
   */
  const canEdit = (report: WeeklyReport): boolean => {
    if (report.status === 'APPROVED' || report.status === 'ARCHIVED') {
      return false; // Immutable once approved
    }

    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') {
      return true;
    }

    return report.authorId === currentUser.id;
  };

  /**
   * Can submit when draft or needs revision.
   */
  const canSubmit = (report: WeeklyReport): boolean => {
    if (report.status !== 'DRAFT' && report.status !== 'NEEDS_REVISION') {
      return false;
    }
    return report.authorId === currentUser.id || currentUser.role === 'SUPER_ADMIN';
  };

  /**
   * Can archive only if approved and user has admin/management rights.
   */
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
