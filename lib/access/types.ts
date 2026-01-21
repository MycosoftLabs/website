/**
 * Access Gate Types
 * Defines the security and monetization levels for the entire Mycosoft system
 */

// User roles in ascending order of privilege
export enum UserRole {
  ANONYMOUS = 'anonymous',
  USER = 'user',
  PREMIUM = 'premium',
  ADMIN = 'admin',
  SECURITY_ADMIN = 'security_admin',  // Security compliance access without super admin privileges
  SUPER_ADMIN = 'super_admin'
}

// Access gate types
export enum AccessGate {
  PUBLIC = 'public',           // 🌍 Open to everyone
  FREEMIUM = 'freemium',       // 🆓 Public with limits, full on signup
  AUTHENTICATED = 'authenticated', // 🔐 Requires login
  PREMIUM = 'premium',         // 💎 Requires subscription
  ADMIN = 'admin',             // 🛡️ Admin users only
  SUPER_ADMIN = 'super_admin'  // 👑 Morgan only
}

// Subscription tiers
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',           // $29/mo
  ENTERPRISE = 'enterprise' // $99/mo
}

// Gate configuration for routes
export interface GateConfig {
  gate: AccessGate
  minimumRole: UserRole
  subscriptionRequired?: SubscriptionTier
  freemiumLimits?: FreemiumLimits
  rateLimits?: RateLimits
  features?: string[]
}

// Freemium feature limits
export interface FreemiumLimits {
  dailyLimit?: number
  monthlyLimit?: number
  maxResults?: number
  features?: {
    [feature: string]: boolean | number
  }
}

// Rate limiting configuration
export interface RateLimits {
  requests: number
  period: 'minute' | 'hour' | 'day' | 'month'
}

// Route access definition
export interface RouteAccess {
  path: string
  gate: AccessGate
  config: GateConfig
  description?: string
}

// User session with access info
export interface UserAccessSession {
  userId: string
  role: UserRole
  subscription: SubscriptionTier
  features: string[]
  limits: {
    [key: string]: {
      used: number
      limit: number
      resetsAt: Date
    }
  }
}

// Gate check result
export interface GateCheckResult {
  allowed: boolean
  reason?: string
  upgrade?: {
    requiredTier: SubscriptionTier
    price: number
    features: string[]
  }
  remaining?: {
    count: number
    resetsAt: Date
  }
}

// Gate symbols for UI
export const GATE_SYMBOLS: Record<AccessGate, string> = {
  [AccessGate.PUBLIC]: '🌍',
  [AccessGate.FREEMIUM]: '🆓',
  [AccessGate.AUTHENTICATED]: '🔐',
  [AccessGate.PREMIUM]: '💎',
  [AccessGate.ADMIN]: '🛡️',
  [AccessGate.SUPER_ADMIN]: '👑'
}

// Gate labels for UI
export const GATE_LABELS: Record<AccessGate, string> = {
  [AccessGate.PUBLIC]: 'Public',
  [AccessGate.FREEMIUM]: 'Free (Limited)',
  [AccessGate.AUTHENTICATED]: 'Sign In Required',
  [AccessGate.PREMIUM]: 'Premium',
  [AccessGate.ADMIN]: 'Admin Only',
  [AccessGate.SUPER_ADMIN]: 'Super Admin Only'
}

// Subscription pricing
export const SUBSCRIPTION_PRICING: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.PRO]: 29,
  [SubscriptionTier.ENTERPRISE]: 99
}

// Role hierarchy (higher index = more access)
// Note: SECURITY_ADMIN has same level as ADMIN but with different permissions
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.ANONYMOUS,
  UserRole.USER,
  UserRole.PREMIUM,
  UserRole.ADMIN,
  UserRole.SECURITY_ADMIN,  // Same level as ADMIN, different scope
  UserRole.SUPER_ADMIN
]

// Check if a role meets minimum requirement
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole)
}

// Get role from gate
export function getMinimumRoleForGate(gate: AccessGate): UserRole {
  switch (gate) {
    case AccessGate.PUBLIC:
    case AccessGate.FREEMIUM:
      return UserRole.ANONYMOUS
    case AccessGate.AUTHENTICATED:
      return UserRole.USER
    case AccessGate.PREMIUM:
      return UserRole.PREMIUM
    case AccessGate.ADMIN:
      return UserRole.ADMIN
    case AccessGate.SUPER_ADMIN:
      return UserRole.SUPER_ADMIN
  }
}
