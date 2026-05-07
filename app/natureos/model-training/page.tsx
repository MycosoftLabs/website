"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Database, Settings, LayoutDashboard, GitBranch, Share2, Zap, Bot } from 'lucide-react';
import { useSupabaseAuth } from '@/lib/nlm/supabase-auth-hooks';
import { Dashboard } from '@/components/natureos/nlm-training/Dashboard';
import { ErrorBoundary } from '@/components/natureos/nlm-training/ErrorBoundary';

export default function NlmTrainingPage() {
  const { user, profile, loading } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 font-mono text-sm animate-pulse">INITIALIZING NATUREOS...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-full bg-black text-zinc-100 selection:bg-white selection:text-black">
      {/* Navigation Header - Sub-header below global TopNav */}
      <header className="border-b border-zinc-800/50 bg-black/40 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">NatureOS</span>
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">NLM Training v3.0</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit max-w-full overflow-x-hidden">
          {[
            { id: 'overview', label: 'Models', icon: LayoutDashboard },
            { id: 'ingestion', label: 'Ingest', icon: Zap },
            { id: 'mindex', label: 'Mindex', icon: Database },
            { id: 'lineage', label: 'Merkle', icon: GitBranch },
            { id: 'graphs', label: 'Graphs', icon: Share2 },
            { id: 'training', label: 'Train', icon: Activity },
            { id: 'agents', label: 'Agents', icon: Bot },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-lg shadow-white/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="py-8 px-6 max-w-7xl mx-auto">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard activeTab={activeTab} user={user} profile={profile} />
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </div>

      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-zinc-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-zinc-900/10 blur-[150px] rounded-full" />
      </div>
    </main>
  );
}
