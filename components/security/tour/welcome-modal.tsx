'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Network, 
  AlertTriangle, 
  Target, 
  FileCheck, 
  FileText,
  Lock,
  Sparkles,
  ChevronRight,
  X,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSecurityTour } from './tour-provider'

interface WelcomeModalProps {
  onStartTour?: () => void
  onSkip?: () => void
}

const FEATURES = [
  {
    icon: Shield,
    title: 'SOC Dashboard',
    description: 'Real-time security monitoring and threat visualization',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Network,
    title: 'Network Monitor',
    description: 'UniFi-integrated network topology and traffic analysis',
    color: 'from-cyan-500 to-teal-500'
  },
  {
    icon: AlertTriangle,
    title: 'Incidents',
    description: 'Track and manage security incidents with full audit trail',
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: Target,
    title: 'Red Team',
    description: 'Attack surface visualization and vulnerability scanning',
    color: 'from-red-500 to-rose-500'
  },
  {
    icon: FileCheck,
    title: 'Compliance',
    description: 'Multi-framework compliance: NIST, CMMC, NISPOM, and more',
    color: 'from-purple-500 to-violet-500'
  },
  {
    icon: FileText,
    title: 'Forms & Documents',
    description: 'Generate SSPs, POA&Ms, and compliance documentation',
    color: 'from-emerald-500 to-green-500'
  }
]

export function WelcomeModal({ onStartTour, onSkip }: WelcomeModalProps) {
  const { state, markWelcomeSeen, startTour } = useSecurityTour()
  const [isVisible, setIsVisible] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState(0)

  useEffect(() => {
    // Show welcome modal for first-time users
    if (!state.hasSeenWelcome) {
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [state.hasSeenWelcome])

  const handleStartTour = () => {
    markWelcomeSeen()
    setIsVisible(false)
    startTour('soc-dashboard')
    onStartTour?.()
  }

  const handleSkip = () => {
    markWelcomeSeen()
    setIsVisible(false)
    onSkip?.()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleSkip} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-emerald-500/20 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

          <div className="relative p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25"
              >
                <Lock className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-white mb-3"
              >
                Welcome to the Security Operations Center
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 text-lg max-w-2xl mx-auto"
              >
                Your comprehensive security management platform for compliance, 
                monitoring, and incident response. Let us show you around!
              </motion.p>
            </div>

            {/* Features grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10"
            >
              {FEATURES.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    onMouseEnter={() => setSelectedFeature(index)}
                    className={cn(
                      "relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer group",
                      selectedFeature === index
                        ? "bg-slate-800/80 border-emerald-500/50 scale-[1.02]"
                        : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                      feature.color
                    )}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                    
                    {selectedFeature === index && (
                      <motion.div
                        layoutId="feature-indicator"
                        className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500/50 pointer-events-none"
                      />
                    )}
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Quick highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap justify-center gap-4 mb-10"
            >
              {[
                '11 Compliance Frameworks',
                'Real-time Monitoring',
                'Automated Documentation',
                'Exostar Integration'
              ].map((text, i) => (
                <div
                  key={text}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-300 text-sm">{text}</span>
                </div>
              ))}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={handleStartTour}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Start Guided Tour
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={handleSkip}
                className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
              >
                I'll explore on my own
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
