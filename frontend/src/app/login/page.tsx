'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

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
    <div className="min-h-screen relative flex items-center justify-center bg-background text-foreground px-4 py-12 overflow-hidden transition-colors duration-200">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-[#6D4C5B]/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#A66A7A]/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[25%] h-[25%] rounded-full bg-[#D98C9A]/5 blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6D4C5B] via-[#A66A7A] to-[#D98C9A] shadow-xl mb-4 border border-[#E8B6BF]/30">
            <span className="text-2xl font-black text-white">S</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Stitch Enterprise
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#5F8F72]" />
            Secure Enterprise Collaboration & AI Hub
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">Sign In</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your assigned employee credentials below.
            </p>
          </div>

          {/* 1-Click Demo Account Quick Fill */}
          <div className="mb-6 p-3 rounded-xl bg-background/50 border border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#C49A5A]" />
              1-Click Demo Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect('ADM001', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'ADM001'
                    ? 'bg-[#6D4C5B]/10 border-[#6D4C5B] text-[#6D4C5B] font-semibold'
                    : 'bg-background border-border text-foreground hover:bg-[#E8DCE0]'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-[#A66A7A]" /> Admin
                </div>
                <span className="text-[10px] text-muted-foreground">ADM001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('DEV001', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'DEV001'
                    ? 'bg-[#6D4C5B]/10 border-[#6D4C5B] text-[#6D4C5B] font-semibold'
                    : 'bg-background border-border text-foreground hover:bg-[#E8DCE0]'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <Code2 className="w-3 h-3 text-[#A66A7A]" /> Engineering
                </div>
                <span className="text-[10px] text-muted-foreground">DEV001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('FIN001', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'FIN001'
                    ? 'bg-[#6D4C5B]/10 border-[#6D4C5B] text-[#6D4C5B] font-semibold'
                    : 'bg-background border-border text-foreground hover:bg-[#E8DCE0]'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <PieChart className="w-3 h-3 text-[#A66A7A]" /> Finance
                </div>
                <span className="text-[10px] text-muted-foreground">FIN001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('DEV002', 'Password123!')}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  employeeId === 'DEV002'
                    ? 'bg-[#6D4C5B]/10 border-[#6D4C5B] text-[#6D4C5B] font-semibold'
                    : 'bg-background border-border text-foreground hover:bg-[#E8DCE0]'
                }`}
              >
                <div className="font-semibold flex items-center gap-1 text-[11px]">
                  <UserCheck className="w-3 h-3 text-[#A66A7A]" /> Designer
                </div>
                <span className="text-[10px] text-muted-foreground">DEV002</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeId" className="text-xs font-semibold text-foreground">
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
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:border-[#A66A7A] focus:ring-[#A66A7A]/20 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">
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
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:border-[#A66A7A] focus:ring-[#A66A7A]/20 h-11"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs font-medium text-[#B85C63] bg-[#B85C63]/10 border border-[#B85C63]/30 p-3 rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#B85C63] shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#6D4C5B] hover:bg-[#5B3D4A] text-white font-semibold rounded-xl shadow-md transition-all text-sm mt-2"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
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
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Encrypted TLS 1.3 • Role-Based Access Control • Stitch Security
        </p>
      </div>
    </div>
  );
}
