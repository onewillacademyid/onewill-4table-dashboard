import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Onewill Academy | The 4 Table Weekly Progress Dashboard',
  description: 'Dasbor pelaporan progres mingguan 4 tabel untuk Onewill Academy: Capaian, Kendala, Sasaran, dan Dukungan dengan alur persetujuan dan ringkasan eksekutif.',
  openGraph: {
    title: 'Onewill Academy | The 4 Table Weekly Progress Dashboard',
    description: 'Dasbor pelaporan progres mingguan 4 tabel untuk Onewill Academy: Capaian, Kendala, Sasaran, dan Dukungan.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-slate-50 text-[#242038] antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
