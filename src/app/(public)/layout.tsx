import React from 'react';

/**
 * Clean Authentication Public Server Layout.
 * Dedicated server layout for the public /login route.
 * ISOLATED: Completely excludes main dashboard navigation, demo banner,
 * Create Report button, persona switcher modal, and application header.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-[#242038]">
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200/60 bg-white/50">
        <p>© 2026 Onewill Academy. Hak Cipta Dilindungi Undang-Undang.</p>
      </footer>
    </div>
  );
}
