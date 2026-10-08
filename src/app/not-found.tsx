import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F4EFFA] text-[#35115A] mb-4 text-2xl font-bold">
        404
      </div>
      <h2 className="text-xl font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        Halaman atau laporan yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#6C2AA6] text-white text-xs font-semibold rounded-lg hover:bg-[#35115A] transition-colors"
      >
        Kembali ke Ringkasan
      </Link>
    </div>
  );
}
