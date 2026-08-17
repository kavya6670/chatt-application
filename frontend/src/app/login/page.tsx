'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  ArrowRight,
  Sparkles,
  Zap,
  Code2,
  PieChart,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [employeeId, setEmployeeId] = useState('ADM001');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoSelect = (id: string, pass: string) => {
    setEmployeeId(id);
    setPassword(pass);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login(employeeId, password);
      const { access_token, user, mustResetPassword } = response.data;

      document.cookie = `token=${access_token}; path=/; max-age=604800; SameSite=Lax`;
      localStorage.setItem('token', access_token);
      setAuth(user, access_token);

      if (mustResetPassword) {
        router.push('/reset-password');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-purple-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[25%] h-[25%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/30 mb-4 border border-indigo-400/30">
            <span className="text-2xl font-black text-white">S</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Stitch Enterprise
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Secure Enterprise Collaboration & AI Hub
          </p>
        </div>

        {/* Card Box */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Sign In</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your assigned employee credentials below.
            </p>
          </div>

          {/* 1-Click Demo Account Quick Fill */}
          <div className="mb-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              1-Click Demo Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect('ADM001', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'ADM001'
                    ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> Admin
                </div>
                <span className="text-[10px] text-slate-400">ADM001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('DEV001', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'DEV001'
                    ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <Code2 className="w-3 h-3 text-blue-400" /> Engineering
                </div>
                <span className="text-[10px] text-slate-400">DEV001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('FIN001', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'FIN001'
                    ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <PieChart className="w-3 h-3 text-emerald-400" /> Finance
                </div>
                <span className="text-[10px] text-slate-400">FIN001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('DEV002', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'DEV002'
                    ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <UserCheck className="w-3 h-3 text-purple-400" /> Designer
                </div>
                <span className="text-[10px] text-slate-400">DEV002</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeId" className="text-xs font-semibold text-slate-300">
                Employee ID
              </Label>
              <div className="relative">
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="e.g. ADM001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 text-sm focus:border-indigo-500 focus:ring-indigo-500/20 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 text-sm focus:border-indigo-500 focus:ring-indigo-500/20 h-11"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs font-medium text-red-300 bg-red-950/60 border border-red-800/60 p-3 rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm mt-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Encrypted TLS 1.3 • Role-Based Access Control • Stitch Security
        </p>
      </div>
    </div>
  );
}
