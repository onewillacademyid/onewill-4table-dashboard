import React from 'react';

/**
 * Clean Authentication Public Server Layout with Ambient Motion Backdrop.
 * Dedicated server layout for the public /login route.
 * Includes a lightweight, GPU-accelerated ambient gradient mesh and floating light orbs.
 * Completely excludes dashboard headers, main navigation, Create Report button, and demo modals.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Subtle Ambient Motion Background Layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-br from-[#35115A]/60 via-[#6C2AA6]/40 to-transparent blur-[90px] animate-ambient-mesh" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] max-w-[550px] max-h-[550px] rounded-full bg-gradient-to-tl from-[#4e1b7e]/50 via-[#35115A]/40 to-transparent blur-[100px] animate-float-orb" />
        <div className="absolute top-[40%] right-[20%] w-[35vw] h-[35vw] max-w-[350px] max-h-[350px] rounded-full bg-[#6C2AA6]/20 blur-[80px] animate-pulse" />
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Main Login Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <p>© 2026 Onewill Academy. Hak Cipta Dilindungi Undang-Undang.</p>
      </footer>
    </div>
  );
}
