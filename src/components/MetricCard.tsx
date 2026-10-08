/**
 * MetricCard Component (Swiss Bento Grid Architecture)
 * Displays executive KPIs with tabular figures, Bento card elevation, and WCAG-compliant contrast.
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
        return 'border-[#6C2AA6]/20 bg-white hover:border-[#6C2AA6]/40 hover:shadow-md';
      case 'warning':
        return 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-md';
      case 'danger':
        return 'border-rose-200 bg-white hover:border-rose-400 hover:shadow-md';
      default:
        return 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'accent':
        return 'text-[#35115A]';
      case 'warning':
        return 'text-amber-700';
      case 'danger':
        return 'text-rose-700';
      default:
        return 'text-slate-900';
    }
  };

  const getIconContainerColor = () => {
    switch (variant) {
      case 'accent':
        return 'bg-[#F4EFFA] text-[#6C2AA6]';
      case 'warning':
        return 'bg-amber-50 text-amber-700';
      case 'danger':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border transition-all duration-200 ${getVariantStyles()} ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between text-slate-500 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{label}</span>
        {Icon && (
          <div className={`p-2 rounded-xl ${getIconContainerColor()} transition-colors`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className={`text-3xl font-black tracking-tight tabular-nums ${getValueColor()}`}>
        {value}
      </div>

      {subtext && (
        <div className="mt-2 text-xs font-semibold text-slate-500 truncate" title={subtext}>
          {subtext}
        </div>
      )}
    </div>
  );
};
