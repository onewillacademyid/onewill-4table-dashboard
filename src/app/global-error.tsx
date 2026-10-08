'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 text-center shadow-xs">
          <h2 className="text-lg font-bold text-[#35115A]">Terjadi Kesalahan Aplikasi</h2>
          <p className="text-sm text-slate-500 mt-2">{error.message || 'Gagal memuat komponen sistem.'}</p>
          <button
            onClick={() => reset()}
            className="mt-4 px-4 py-2 bg-[#6C2AA6] hover:bg-[#35115A] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
