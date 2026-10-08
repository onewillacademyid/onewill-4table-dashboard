'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-bold text-slate-800">Gagal Memuat Halaman</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        {error.message || 'Terjadi kesalahan teknis saat merender halaman ini.'}
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 px-4 py-2 bg-[#6C2AA6] text-white text-xs font-semibold rounded-lg hover:bg-[#35115A] transition-colors cursor-pointer"
      >
        Coba Lagi
      </button>
    </div>
  );
}
