'use client';

/**
 * Onewill Academy | Premium Branded Login Experience v2.0
 * Features Swiss editorial design, Bento glassmorphism card composition,
 * Google Sign-In, and Passwordless Email Link Authentication.
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  signInWithGoogleClient,
  sendPasswordlessEmailLink,
  isEmailSignInLink,
  completePasswordlessEmailLink,
} from '@/lib/firebase/auth-client';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession, isAuthenticated, isLiveAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingLink, setIsCompletingLink] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresEmailPrompt, setRequiresEmailPrompt] = useState(false);

  // Auto-detect and handle Email Link completion on page load
  useEffect(() => {
    if (isEmailSignInLink()) {
      handleCompleteEmailLink();
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && isLiveAuth) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLiveAuth, router]);

  const handleCompleteEmailLink = async (overrideEmail?: string) => {
    setIsCompletingLink(true);
    setErrorMessage(null);

    const result = await completePasswordlessEmailLink(overrideEmail);
    setIsCompletingLink(false);

    if (result.success) {
      setSuccessMessage('Login berhasil! Mengalihkan ke dasbor pelaporan...');
      await refreshSession();
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else if (result.code === 'EMAIL_REQUIRED') {
      setRequiresEmailPrompt(true);
      setActiveTab('email');
    } else {
      setErrorMessage(result.error || 'Gagal mengonfirmasi login tautan email.');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await signInWithGoogleClient();
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Berhasil masuk dengan akun Google! Mengalihkan...');
      await refreshSession();
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } else {
      setErrorMessage(result.error || 'Gagal masuk dengan Google.');
    }
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Silakan masukkan alamat email terdaftar yang valid.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await sendPasswordlessEmailLink(email);
    setIsLoading(false);

    if (result.success) {
      setEmailSent(true);
      setSuccessMessage(`Tautan masuk telah dikirim ke ${email}. Silakan periksa kotak masuk email Anda.`);
    } else {
      setErrorMessage(result.error || 'Gagal mengirimkan tautan masuk email.');
    }
  };

  const handleConfirmEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmEmail || !confirmEmail.includes('@')) {
      setErrorMessage('Silakan masukkan alamat email konfirmasi yang valid.');
      return;
    }
    setRequiresEmailPrompt(false);
    handleCompleteEmailLink(confirmEmail);
  };

  return (
    <div className="w-full max-w-md my-auto">
      {/* Premium Bento Glass Container */}
      <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-200/80 space-y-8 text-slate-900 transition-all">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-[#35115A] text-white rounded-2xl text-2xl font-extrabold shadow-lg shadow-[#35115A]/20 ring-4 ring-[#F4EFFA]">
            OW
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#35115A] tracking-tight">
              Onewill Academy
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              The 4 Table Weekly Progress Dashboard
            </p>
          </div>
        </div>

        {/* Completing Link Loading State */}
        {isCompletingLink && (
          <div className="bg-[#F4EFFA] border border-[#6C2AA6]/20 rounded-2xl p-6 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#6C2AA6] animate-spin mx-auto" />
            <p className="text-sm font-bold text-[#35115A]">
              Mengonfirmasi tautan masuk email Anda...
            </p>
          </div>
        )}

        {/* Email Confirmation Required Prompt */}
        {requiresEmailPrompt && !isCompletingLink && (
          <form onSubmit={handleConfirmEmailSubmit} className="space-y-4 bg-amber-50 border border-amber-200 p-5 rounded-2xl">
            <div className="flex items-start space-x-3 text-amber-900">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs font-medium">
                Tautan masuk dibuka di perangkat atau peramban baru. Masukkan email Anda untuk konfirmasi.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Konfirmasi Email Terdaftar</label>
              <input
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="staf@onewill.id"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#6C2AA6] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#6C2AA6] hover:bg-[#35115A] text-white font-bold rounded-xl text-sm transition-all shadow-sm"
            >
              Konfirmasi & Masuk
            </button>
          </form>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start space-x-3 text-rose-900 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-bold text-xs">Akses Ditolak</p>
              <p className="text-xs mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start space-x-3 text-emerald-900 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-bold text-xs">Otentikasi Berhasil</p>
              <p className="text-xs mt-0.5 text-emerald-700">{successMessage}</p>
            </div>
          </div>
        )}

        {!isCompletingLink && !requiresEmailPrompt && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => { setActiveTab('google'); setErrorMessage(null); }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${
                  activeTab === 'google'
                    ? 'bg-white text-[#35115A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Google Sign-In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('email'); setErrorMessage(null); }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${
                  activeTab === 'email'
                    ? 'bg-white text-[#35115A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Email Passwordless
              </button>
            </div>

            {/* Tab 1: Google Sign-In */}
            {activeTab === 'google' && (
              <div className="space-y-5 text-center">
                <p className="text-xs text-slate-600 font-medium">
                  Gunakan akun Google staf terdaftar untuk mengakses dasbor pelaporan.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 border border-slate-300 rounded-2xl bg-white hover:bg-slate-50 font-bold text-slate-700 shadow-xs hover:shadow-md transition-all focus:ring-2 focus:ring-[#6C2AA6] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#6C2AA6]" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Masuk dengan Google</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: Passwordless Email Link */}
            {activeTab === 'email' && (
              <div>
                {emailSent ? (
                  <div className="bg-[#F4EFFA] p-6 rounded-2xl border border-[#6C2AA6]/20 text-center space-y-3">
                    <Mail className="w-10 h-10 text-[#6C2AA6] mx-auto" />
                    <h3 className="font-bold text-[#35115A]">Periksa Email Anda</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Tautan akses masuk telah dikirim ke <strong>{email}</strong>. Klik tautan dalam email untuk langsung masuk tanpa kata sandi.
                    </p>
                    <button
                      type="button"
                      onClick={() => setEmailSent(false)}
                      className="text-xs font-bold text-[#6C2AA6] hover:underline pt-2 block mx-auto cursor-pointer"
                    >
                      Kirim ulang atau gunakan email lain
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendEmailLink} className="space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        Alamat Email Terdaftar
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="staf@onewill.id"
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-[#6C2AA6] focus:outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-[#35115A] hover:bg-[#6C2AA6] text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Kirim Tautan Masuk Email</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Security Guarantee Notice */}
            <div className="pt-5 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                  Firebase Auth & HttpOnly Server Session Enforced
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hanya akun terdaftar & aktif yang dapat mengakses sistem.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
