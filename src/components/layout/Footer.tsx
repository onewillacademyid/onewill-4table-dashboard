import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#35115A]">Onewill Academy</span>
          <span>·</span>
          <span>The 4 Table Weekly Progress Dashboard</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Palet Warna: Usulan Resmi Onewill</span>
          <span>·</span>
          <span>Zona Waktu: Asia/Jakarta (WIB)</span>
          <span>·</span>
          <span className="font-medium text-slate-600">Prototipe UI Mode Demo (Next.js App Router)</span>
        </div>
      </div>
    </footer>
  );
};
