/**
 * Access Control Middleware
 * Handles gate checks for routes and APIs
 */

import { createClient } from '@/lib/supabase/server'
import { 
  AccessGate, 
  UserRole, 
  SubscriptionTier,
  type GateCheckResult,
  type GateConfig,
  type UserAccessSession,
  hasMinimumRole,
  getMinimumRoleForGate,
  SUBSCRIPTION_PRICING
} from './types'
import { getRouteAccess } from './routes'

// Super admin email (Morgan)
const SUPER_ADMIN_EMAILS = [
  'morgan@mycosoft.org',
  'admin@mycosoft.org'
]

// Security admin emails - have access to compliance/security tools but not super admin privileges
const SECURITY_ADMIN_EMAILS = [
  'garret@mycosoft.org'
]

// Get user session with access info
export async function getUserAccessSession(): Promise<UserAccessSession | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    // Get user profile for role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_tier')
      .eq('id', user.id)
      .single()
    
    // Determine role
    let role: UserRole = UserRole.USER
    const email = user.email || ''
    
    if (SUPER_ADMIN_EMAILS.includes(email)) {
      role = UserRole.SUPER_ADMIN
    } else if (SECURITY_ADMIN_EMAILS.includes(email) || profile?.role === 'security_admin') {
      role = UserRole.SECURITY_ADMIN
    } else if (profile?.role === 'admin') {
      role = UserRole.ADMIN
    } else if (profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'enterprise') {
      role = UserRole.PREMIUM
    }
    
    // Determine subscription tier
    let subscription: SubscriptionTier = SubscriptionTier.FREE
    if (profile?.subscription_tier === 'pro') {
      subscription = SubscriptionTier.PRO
    } else if (profile?.subscription_tier === 'enterprise') {
      subscription = SubscriptionTier.ENTERPRISE
    }
    
    return {
      userId: user.id,
      role,
      subscription,
      features: [], // TODO: Load from subscription
      limits: {} // TODO: Load from rate limiter
    }
  } catch {
    return null
  }
}

// Check gate access for a route
export async function checkGateAccess(
  path: string,
  session?: UserAccessSession | null
): Promise<GateCheckResult> {
  const routeAccess = getRouteAccess(path)
  
  // Unknown routes default to authenticated
  if (!routeAccess) {
    if (!session) {
      return {
        allowed: false,
        reason: 'Authentication required'
      }
    }
    return { allowed: true }
  }
  
  return checkGateConfig(routeAccess.config, session)
}

// Check against a gate config
export function checkGateConfig(
  config: GateConfig,
  session?: UserAccessSession | null
): GateCheckResult {
  const { gate, minimumRole, subscriptionRequired, freemiumLimits } = config
  
  // Public access - always allowed
  if (gate === AccessGate.PUBLIC) {
    return { allowed: true }
  }
  
  // Freemium - allowed with limits
  if (gate === AccessGate.FREEMIUM) {
    if (!session) {
      // Anonymous users get limited access
      if (freemiumLimits) {
        return {
          allowed: true,
          remaining: freemiumLimits.dailyLimit 
            ? { count: freemiumLimits.dailyLimit, resetsAt: getEndOfDay() }
            : undefined
        }
      }
      return { allowed: true }
    }
    // Logged in users get more
    return { allowed: true }
  }
  
  // From here, we need authentication
  if (!session) {
    return {
      allowed: false,
      reason: 'Please sign in to access this feature'
    }
  }
  
  // Check role hierarchy
  const userRole = session.role
  if (!hasMinimumRole(userRole, minimumRole)) {
    // Special message for admin/super_admin
    if (minimumRole === UserRole.SUPER_ADMIN) {
      return {
        allowed: false,
        reason: 'This area is restricted to system administrators only'
      }
    }
    if (minimumRole === UserRole.ADMIN) {
      return {
        allowed: false,
        reason: 'Admin access required'
      }
    }
    
    // Must be premium
    if (minimumRole === UserRole.PREMIUM && subscriptionRequired) {
      return {
        allowed: false,
        reason: 'This feature requires a subscription',
        upgrade: {
          requiredTier: subscriptionRequired,
          price: SUBSCRIPTION_PRICING[subscriptionRequired],
          features: [] // TODO: Get features for tier
        }
      }
    }
  }
  
  // Check subscription if required
  if (subscriptionRequired && session.subscription !== SubscriptionTier.ENTERPRISE) {
    const tierLevel = getTierLevel(session.subscription)
    const requiredLevel = getTierLevel(subscriptionRequired)
    
    if (tierLevel < requiredLevel) {
      return {
        allowed: false,
        reason: `This feature requires ${subscriptionRequired} subscription`,
        upgrade: {
          requiredTier: subscriptionRequired,
          price: SUBSCRIPTION_PRICING[subscriptionRequired],
          features: []
        }
      }
    }
  }
  
  return { allowed: true }
}

// Helper to get tier level
function getTierLevel(tier: SubscriptionTier): number {
  switch (tier) {
    case SubscriptionTier.FREE: return 0
    case SubscriptionTier.PRO: return 1
    case SubscriptionTier.ENTERPRISE: return 2
  }
}

// Helper to get end of day
function getEndOfDay(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

// API middleware helper
export async function requireGate(
  gate: AccessGate
): Promise<{ session: UserAccessSession; error?: never } | { session?: never; error: Response }> {
  const session = await getUserAccessSession()
  const minimumRole = getMinimumRoleForGate(gate)
  
  const result = checkGateConfig({ gate, minimumRole }, session)
  
  if (!result.allowed) {
    return {
      error: new Response(JSON.stringify({ error: result.reason }), {
        status: gate === AccessGate.PUBLIC ? 500 : 
               !session ? 401 : 
               gate === AccessGate.PREMIUM ? 402 : 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  return { session: session! }
}

// Rate limit check
export async function checkRateLimit(
  key: string,
  limit: number,
  period: 'minute' | 'hour' | 'day'
): Promise<{ allowed: boolean; remaining: number; resetsAt: Date }> {
  // TODO: Implement with Redis
  // For now, always allow
  return {
    allowed: true,
    remaining: limit,
    resetsAt: new Date(Date.now() + 60000)
  }
}
