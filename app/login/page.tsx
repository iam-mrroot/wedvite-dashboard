"use client";

import { useState, Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_25%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] flex items-center justify-center px-6 py-10 text-white">
      <div className="relative w-full max-w-3xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-sky-500/10 blur-3xl" />
        <Card className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl shadow-slate-950/40">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 bg-slate-900/95 px-10 py-12 text-slate-200">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs uppercase tracking-[0.24em] text-sky-300">
                <ShieldCheck className="h-4 w-4 text-sky-300" />
                secure access
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white">Welcome Back</h1>
                <p className="max-w-md text-sm text-slate-400">
                  Enter your administrator credentials to access the Wedvite dashboard. Your login is protected with JWT encryption for secure session handling.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-700/80 bg-slate-950/70 p-5 text-sm text-slate-400">
                <p className="font-medium text-slate-100">Admin security</p>
                <p className="mt-2 leading-relaxed">
                  Only authenticated administrators are allowed to view and manage admin content. Unauthorized access is blocked automatically.
                </p>
              </div>
            </div>

            <CardContent className="px-10 py-12">
              <CardHeader className="px-0 pb-6">
                <CardTitle className="text-3xl font-semibold text-white">Admin Login</CardTitle>
                <CardDescription className="mt-3 text-sm text-slate-400">
                  Sign in using your admin username and password.
                </CardDescription>
              </CardHeader>

              {error === 'invalid' && (
                <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  Invalid username or password. Please try again.
                </div>
              )}
              {error === 'server' && (
                <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Server configuration error. Please check your environment settings.
                </div>
              )}

              <form action="/api/login" method="post" className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus:border-sky-400"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-slate-700 bg-slate-950/80 text-white placeholder:text-slate-500 focus:border-sky-400"
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl px-4 py-3 text-base font-semibold">
                  Sign in securely
                </Button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6 text-sm text-slate-500">
                <p>Need help? Contact the site administrator for account support.</p>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
      <LoginContent />
    </Suspense>
  );
}
