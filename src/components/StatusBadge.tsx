/**
 * Accessible Status Badge Component
 * Pairs clear text with accessible colors and subtle icons (No hue-only state signaling).
 */

import React from 'react';
import { 
  FileEdit, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Archive, 
  Flame, 
  AlertCircle, 
  Clock, 
  Check, 
  X 
} from 'lucide-react';
import { ReportStatus, IssueSeverity, SupportStatus } from '../types';

interface StatusBadgeProps {
  type: 'report' | 'severity' | 'support' | 'issue-state';
  value: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  if (type === 'report') {
    const status = value as ReportStatus;
    switch (status) {
      case 'DRAFT':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
            <FileEdit className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Draf</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
            <Send className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>Menunggu Tinjauan</span>
          </span>
        );
      case 'NEEDS_REVISION':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
            <span>Perlu Revisi</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Disetujui</span>
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-[#F4EFFA] text-[#35115A] border border-[#ebdcf9] ${sizeClasses}`}>
            <Archive className="w-3.5 h-3.5 text-[#6C2AA6]" aria-hidden="true" />
            <span>Diarsipkan</span>
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{value}</span>;
    }
  }

  if (type === 'severity') {
    const sev = value as IssueSeverity;
    switch (sev) {
      case 'critical':
        return (
          <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-red-100 text-red-900 border border-red-200 ${sizeClasses}`}>
            <Flame className="w-3 h-3 text-red-600" aria-hidden="true" />
            <span>Kritis</span>
          </span>
        );
      case 'high':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-orange-50 text-orange-800 border border-orange-200 ${sizeClasses}`}>
            <AlertCircle className="w-3 h-3 text-orange-600" aria-hidden="true" />
            <span>Tinggi</span>
          </span>
        );
      case 'medium':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
            <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
            <span>Sedang</span>
          </span>
        );
      case 'low':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
            <span>Rendah</span>
          </span>
        );
    }
  }

  if (type === 'support') {
    const st = value as SupportStatus;
    switch (st) {
      case 'approved':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
            <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>Disetujui</span>
          </span>
        );
      case 'rejected':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}>
            <X className="w-3 h-3 text-rose-600" aria-hidden="true" />
            <span>Ditolak</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
            <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
            <span>Menunggu Tindakan</span>
          </span>
        );
    }
  }

  if (type === 'issue-state') {
    switch (value) {
      case 'resolved':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>Terselesaikan</span>
          </span>
        );
      case 'mitigating':
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-blue-50 text-blue-800 border border-blue-200 ${sizeClasses}`}>
            <Clock className="w-3 h-3 text-blue-600" aria-hidden="true" />
            <span>Dalam Mitigasi</span>
          </span>
        );
      case 'open':
      default:
        return (
          <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}>
            <AlertCircle className="w-3 h-3 text-rose-600" aria-hidden="true" />
            <span>Terbuka</span>
          </span>
        );
    }
  }

  return <span className="text-xs text-slate-600">{value}</span>;
};
