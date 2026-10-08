export default function Loading() {
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-[#6C2AA6] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-500">Memuat data Onewill Academy...</span>
    </div>
  );
}
