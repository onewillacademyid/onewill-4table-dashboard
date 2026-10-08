import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DemoAuthModal } from '@/components/DemoAuthModal';

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
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
          <DemoAuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
