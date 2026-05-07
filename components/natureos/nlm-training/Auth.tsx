'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/nlm/supabase';
import { Button } from '@/components/natureos/nlm-training/ui/button';
import { LogIn, LogOut, User as UserIcon, ShieldCheck, Mail, Lock, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Auth({ user, profile }: { user: any, profile: any }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('mycosoft.com')) {
        return;
      }

      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        const { session } = event.data;
        if (session && supabase) {
          await supabase.auth.setSession(session);
        }
      } else if (event.data?.type === 'SUPABASE_AUTH_ERROR') {
        setError(event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleLogin = () => {
    setError(null);
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const origin = window.location.origin;
    const popup = window.open(
      `/api/auth/google?origin=${encodeURIComponent(origin)}`,
      'supabase_auth_popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        alert('Registration successful! Please check your email for verification.');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-full">
            {user.user_metadata?.avatar_url ? (
              <div className="relative w-6 h-6 rounded-full overflow-hidden">
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name || 'User'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <UserIcon className="w-4 h-4 text-zinc-400" />
            )}
            <span className="text-sm font-medium text-zinc-200">
              {user.user_metadata?.full_name || user.email}
            </span>
          </div>
          {profile && (
            <span className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mt-1 mr-2">
              {profile.role} • Level {profile.access_level}
            </span>
          )}
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10 h-9"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-zinc-900/40 p-10 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl"
      >
        <div className="space-y-4">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-700">
            <ShieldCheck className="w-8 h-8 text-zinc-200" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">NatureOS NLM</h1>
          <p className="text-zinc-400 text-sm">
            {mode === 'login'
              ? 'Access the Nature Learning Model training dashboard.'
              : 'Create an account to access the training dashboard.'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 text-left">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-teal-500 text-black hover:bg-teal-400 rounded-xl font-bold text-lg transition-all active:scale-95"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </span>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0c0c0e] px-2 text-zinc-500 font-bold">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="h-11 w-full border-zinc-800 hover:bg-zinc-800 text-white rounded-xl font-medium"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
        </div>

        <div className="pt-4">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-teal-500 hover:text-teal-400 font-bold uppercase tracking-widest transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>

        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          Authorized Personnel Only • NIST 800-171 Compliant
        </p>
      </motion.div>
    </div>
  );
}
