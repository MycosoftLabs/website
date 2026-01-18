'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Lock, Sparkles, ShieldAlert, Crown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  AccessGate, 
  GATE_SYMBOLS, 
  GATE_LABELS,
  SubscriptionTier,
  SUBSCRIPTION_PRICING
} from '@/lib/access/types'
import { useSupabaseUser, useProfile } from '@/hooks/use-supabase-user'

interface GateWrapperProps {
  gate: AccessGate
  children: ReactNode
  fallback?: ReactNode
  showUpgrade?: boolean
  className?: string
}

/**
 * GateWrapper - Wraps content with access control
 * Shows appropriate UI based on user's access level
 */
export function GateWrapper({ 
  gate, 
  children, 
  fallback,
  showUpgrade = true,
  className 
}: GateWrapperProps) {
  const { user, loading: userLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const loading = userLoading || profileLoading
  const [hasAccess, setHasAccess] = useState(false)
  
  useEffect(() => {
    if (loading) return
    
    // Check access based on gate type
    switch (gate) {
      case AccessGate.PUBLIC:
        setHasAccess(true)
        break
      case AccessGate.FREEMIUM:
        setHasAccess(true) // Always accessible, features may be limited
        break
      case AccessGate.AUTHENTICATED:
        setHasAccess(!!user)
        break
      case AccessGate.PREMIUM:
        setHasAccess(
          profile?.subscription_tier === 'pro' || 
          profile?.subscription_tier === 'enterprise' ||
          profile?.role === 'admin' ||
          profile?.role === 'super_admin'
        )
        break
      case AccessGate.ADMIN:
        setHasAccess(
          profile?.role === 'admin' || 
          profile?.role === 'super_admin'
        )
        break
      case AccessGate.SUPER_ADMIN:
        setHasAccess(profile?.role === 'super_admin')
        break
    }
  }, [user, loading, profile, gate])
  
  if (loading) {
    return (
      <div className={cn("animate-pulse bg-muted/50 rounded-lg", className)}>
        <div className="h-32 w-full" />
      </div>
    )
  }
  
  if (hasAccess) {
    return <>{children}</>
  }
  
  // Show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>
  }
  
  if (!showUpgrade) {
    return null
  }
  
  return <AccessDenied gate={gate} />
}

// Access denied component
function AccessDenied({ gate }: { gate: AccessGate }) {
  const getConfig = () => {
    switch (gate) {
      case AccessGate.AUTHENTICATED:
        return {
          icon: Lock,
          title: 'Sign in required',
          description: 'Create a free account or sign in to access this feature.',
          action: {
            label: 'Sign in',
            href: '/login'
          },
          gradient: 'from-blue-500 to-indigo-600'
        }
      case AccessGate.PREMIUM:
        return {
          icon: Sparkles,
          title: 'Upgrade to Pro',
          description: `Unlock this feature and more with NatureOS Pro for just $${SUBSCRIPTION_PRICING[SubscriptionTier.PRO]}/mo`,
          action: {
            label: 'Upgrade now',
            href: '/pricing'
          },
          gradient: 'from-violet-500 to-purple-600'
        }
      case AccessGate.ADMIN:
        return {
          icon: ShieldAlert,
          title: 'Admin access required',
          description: 'This area is restricted to administrators only.',
          action: null,
          gradient: 'from-orange-500 to-red-600'
        }
      case AccessGate.SUPER_ADMIN:
        return {
          icon: Crown,
          title: 'Restricted area',
          description: 'This area is restricted to system administrators.',
          action: null,
          gradient: 'from-amber-500 to-orange-600'
        }
      default:
        return {
          icon: Lock,
          title: 'Access restricted',
          description: 'You don\'t have permission to view this content.',
          action: null,
          gradient: 'from-gray-500 to-gray-600'
        }
    }
  }
  
  const config = getConfig()
  const IconComponent = config.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10"
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-10",
        config.gradient
      )} />
      
      <div className="relative p-8 text-center space-y-4">
        {/* Icon */}
        <div className={cn(
          "w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center",
          config.gradient
        )}>
          <IconComponent className="w-8 h-8 text-white" />
        </div>
        
        {/* Gate badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{GATE_SYMBOLS[gate]}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {GATE_LABELS[gate]}
          </span>
        </div>
        
        {/* Text */}
        <h3 className="text-xl font-bold">{config.title}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {config.description}
        </p>
        
        {/* Action button */}
        {config.action && (
          <a
            href={config.action.href}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r transition-all hover:scale-105",
              config.gradient
            )}
          >
            {config.action.label}
            <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </motion.div>
  )
}

// Hook for checking access in components
export function useGateAccess(gate: AccessGate): {
  loading: boolean
  hasAccess: boolean
  user: ReturnType<typeof useSupabaseUser>['user']
} {
  const { user, loading: userLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const loading = userLoading || profileLoading
  const [hasAccess, setHasAccess] = useState(false)
  
  useEffect(() => {
    if (loading) return
    
    switch (gate) {
      case AccessGate.PUBLIC:
      case AccessGate.FREEMIUM:
        setHasAccess(true)
        break
      case AccessGate.AUTHENTICATED:
        setHasAccess(!!user)
        break
      case AccessGate.PREMIUM:
        setHasAccess(
          profile?.subscription_tier === 'pro' || 
          profile?.subscription_tier === 'enterprise' ||
          profile?.role === 'admin'
        )
        break
      case AccessGate.ADMIN:
        setHasAccess(profile?.role === 'admin' || profile?.role === 'super_admin')
        break
      case AccessGate.SUPER_ADMIN:
        setHasAccess(profile?.role === 'super_admin')
        break
    }
  }, [user, loading, profile, gate])
  
  return { loading, hasAccess, user }
}
