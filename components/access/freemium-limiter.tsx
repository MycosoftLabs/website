'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/use-supabase-user'
import { SubscriptionTier, SUBSCRIPTION_PRICING } from '@/lib/access/types'

interface FreemiumLimiterProps {
  featureKey: string
  dailyLimit?: number
  children: ReactNode
  className?: string
}

// Storage key for tracking usage
const getStorageKey = (featureKey: string) => `freemium_usage_${featureKey}`

interface UsageData {
  count: number
  date: string // YYYY-MM-DD
}

/**
 * FreemiumLimiter - Tracks and limits usage of freemium features
 * Shows upgrade prompt when limit is reached
 */
export function FreemiumLimiter({ 
  featureKey, 
  dailyLimit = 10, 
  children,
  className 
}: FreemiumLimiterProps) {
  const { profile } = useProfile()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [showLimitModal, setShowLimitModal] = useState(false)
  
  // Check if user is premium (no limits)
  const isPremium = profile?.subscription_tier === 'pro' || 
                    profile?.subscription_tier === 'enterprise'
  
  // Load usage from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(featureKey))
    const today = new Date().toISOString().split('T')[0]
    
    if (stored) {
      const data: UsageData = JSON.parse(stored)
      // Reset if new day
      if (data.date !== today) {
        setUsage({ count: 0, date: today })
      } else {
        setUsage(data)
      }
    } else {
      setUsage({ count: 0, date: today })
    }
  }, [featureKey])
  
  // Save usage to localStorage
  useEffect(() => {
    if (usage) {
      localStorage.setItem(getStorageKey(featureKey), JSON.stringify(usage))
    }
  }, [usage, featureKey])
  
  // Check if limit exceeded
  const isLimitExceeded = !isPremium && usage && usage.count >= dailyLimit
  
  // Increment usage
  const incrementUsage = () => {
    if (isPremium) return // No limits for premium
    
    setUsage(prev => {
      if (!prev) return prev
      const newCount = prev.count + 1
      if (newCount >= dailyLimit) {
        setShowLimitModal(true)
      }
      return { ...prev, count: newCount }
    })
  }
  
  // Get remaining count
  const remaining = dailyLimit - (usage?.count || 0)
  
  return (
    <div className={cn("relative", className)}>
      {/* Usage indicator */}
      {!isPremium && usage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 right-2 z-10"
        >
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium",
            remaining > dailyLimit * 0.3 
              ? "bg-emerald-500/20 text-emerald-400"
              : remaining > 0
                ? "bg-amber-500/20 text-amber-400"
                : "bg-red-500/20 text-red-400"
          )}>
            {remaining > 0 ? `${remaining} left today` : 'Limit reached'}
          </div>
        </motion.div>
      )}
      
      {/* Content - blur if limit exceeded */}
      <div className={cn(isLimitExceeded && "blur-sm pointer-events-none select-none")}>
        {typeof children === 'function' 
          ? (children as (props: { incrementUsage: () => void }) => ReactNode)({ incrementUsage })
          : children
        }
      </div>
      
      {/* Overlay when limit exceeded */}
      {isLimitExceeded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LimitReachedCard 
            featureKey={featureKey}
            onDismiss={() => setShowLimitModal(false)} 
          />
        </div>
      )}
      
      {/* Modal when approaching/reaching limit */}
      <AnimatePresence>
        {showLimitModal && !isLimitExceeded && (
          <LimitApproachingModal 
            remaining={remaining}
            onClose={() => setShowLimitModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Card shown when limit is reached
function LimitReachedCard({ featureKey, onDismiss }: { featureKey: string, onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-background/95 backdrop-blur-xl rounded-2xl p-8 text-center max-w-md border shadow-2xl"
    >
      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      
      <h3 className="text-xl font-bold mb-2">Daily limit reached</h3>
      <p className="text-muted-foreground mb-6">
        You&apos;ve used all your free {featureKey} for today. 
        Upgrade to Pro for unlimited access!
      </p>
      
      <div className="space-y-3">
        <a
          href="/pricing"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Upgrade to Pro - ${SUBSCRIPTION_PRICING[SubscriptionTier.PRO]}/mo
          <ArrowRight className="w-4 h-4" />
        </a>
        
        <p className="text-sm text-muted-foreground">
          Your limit resets at midnight
        </p>
      </div>
    </motion.div>
  )
}

// Modal shown when approaching limit
function LimitApproachingModal({ remaining, onClose }: { remaining: number, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-background rounded-2xl p-6 max-w-sm w-full border shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          
          <div>
            <h3 className="font-bold">Running low!</h3>
            <p className="text-sm text-muted-foreground">
              You have {remaining} uses left today
            </p>
          </div>
          
          <a
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Get unlimited access
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Hook for tracking freemium usage
export function useFreemiumUsage(featureKey: string, dailyLimit: number = 10) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const { profile } = useProfile()
  
  const isPremium = profile?.subscription_tier === 'pro' || 
                    profile?.subscription_tier === 'enterprise'
  
  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(featureKey))
    const today = new Date().toISOString().split('T')[0]
    
    if (stored) {
      const data: UsageData = JSON.parse(stored)
      if (data.date !== today) {
        const newData = { count: 0, date: today }
        setUsage(newData)
        localStorage.setItem(getStorageKey(featureKey), JSON.stringify(newData))
      } else {
        setUsage(data)
      }
    } else {
      const newData = { count: 0, date: today }
      setUsage(newData)
      localStorage.setItem(getStorageKey(featureKey), JSON.stringify(newData))
    }
  }, [featureKey])
  
  const incrementUsage = () => {
    if (isPremium) return true // No limits for premium
    
    const today = new Date().toISOString().split('T')[0]
    const currentUsage = usage || { count: 0, date: today }
    
    if (currentUsage.count >= dailyLimit) {
      return false // Limit exceeded
    }
    
    const newData = { count: currentUsage.count + 1, date: today }
    setUsage(newData)
    localStorage.setItem(getStorageKey(featureKey), JSON.stringify(newData))
    return true
  }
  
  return {
    usage: usage?.count || 0,
    remaining: dailyLimit - (usage?.count || 0),
    limit: dailyLimit,
    isPremium,
    incrementUsage,
    isLimitExceeded: !isPremium && (usage?.count || 0) >= dailyLimit
  }
}
