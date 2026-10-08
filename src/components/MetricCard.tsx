/**
 * MetricCard Component
 * Displays executive KPIs with tabular figures, single-elevation surfaces, and defensive denominators.
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'accent' | 'warning' | 'danger';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'border-[#ebdcf9] bg-white hover:border-[#6C2AA6]/40';
      case 'warning':
        return 'border-amber-200 bg-white hover:border-amber-400';
      case 'danger':
        return 'border-red-200 bg-white hover:border-red-400';
      default:
        return 'border-slate-200 bg-white hover:border-slate-300';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'accent':
        return 'text-[#35115A]';
      case 'warning':
        return 'text-amber-700';
      case 'danger':
        return 'text-red-700';
      default:
        return 'text-slate-900';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all ${getVariantStyles()} ${
        onClick ? 'cursor-pointer hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-medium text-slate-600 truncate">{label}</span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className={`text-2xl font-bold font-sans tracking-tight tabular-nums ${getValueColor()}`}>
        {value}
      </div>

      {subtext && (
        <div className="mt-1 text-xs text-slate-500 truncate" title={subtext}>
          {subtext}
        </div>
      )}
    </div>
  );
};
