/**
 * Route Access Configuration
 * Defines access gates for all website routes
 */

import { 
  AccessGate, 
  UserRole, 
  SubscriptionTier,
  type RouteAccess 
} from './types'

// Public routes - open to everyone
export const PUBLIC_ROUTES: RouteAccess[] = [
  { path: '/', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Homepage' },
  { path: '/about', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'About page' },
  { path: '/about/team', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Team page' },
  { path: '/privacy', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Privacy policy' },
  { path: '/terms', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Terms of service' },
  { path: '/docs', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Documentation' },
  { path: '/login', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Login page' },
  { path: '/signup', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Signup page' },
  { path: '/preview', gate: AccessGate.PUBLIC, config: { gate: AccessGate.PUBLIC, minimumRole: UserRole.ANONYMOUS }, description: 'Preview page' },
]

// Freemium routes - public with limits
export const FREEMIUM_ROUTES: RouteAccess[] = [
  { 
    path: '/search', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { dailyLimit: 10, maxResults: 20 }
    }, 
    description: 'Search' 
  },
  { 
    path: '/species', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { dailyLimit: 50 }
    }, 
    description: 'Species database' 
  },
  { 
    path: '/mushrooms', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { maxResults: 50 }
    }, 
    description: 'Mushroom catalog' 
  },
  { 
    path: '/compounds', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { dailyLimit: 20, features: { simulate: false } }
    }, 
    description: 'Compounds' 
  },
  { 
    path: '/science', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { features: { fullPaper: false, abstract: true } }
    }, 
    description: 'Science papers' 
  },
  { 
    path: '/ancestry', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { features: { basicTree: true, explorer: false } }
    }, 
    description: 'Ancestry' 
  },
  { 
    path: '/natureos/mindex', 
    gate: AccessGate.FREEMIUM, 
    config: { 
      gate: AccessGate.FREEMIUM, 
      minimumRole: UserRole.ANONYMOUS,
      freemiumLimits: { dailyLimit: 50 }
    }, 
    description: 'MINDEX database' 
  },
]

// Authenticated routes - require login
export const AUTHENTICATED_ROUTES: RouteAccess[] = [
  { path: '/profile', gate: AccessGate.AUTHENTICATED, config: { gate: AccessGate.AUTHENTICATED, minimumRole: UserRole.USER }, description: 'User profile' },
  { path: '/settings', gate: AccessGate.AUTHENTICATED, config: { gate: AccessGate.AUTHENTICATED, minimumRole: UserRole.USER }, description: 'Settings' },
  { path: '/apps', gate: AccessGate.AUTHENTICATED, config: { gate: AccessGate.AUTHENTICATED, minimumRole: UserRole.USER }, description: 'Apps hub' },
  { path: '/natureos', gate: AccessGate.AUTHENTICATED, config: { gate: AccessGate.AUTHENTICATED, minimumRole: UserRole.USER }, description: 'NatureOS home' },
  { path: '/natureos/devices', gate: AccessGate.AUTHENTICATED, config: { gate: AccessGate.AUTHENTICATED, minimumRole: UserRole.USER }, description: 'Devices' },
  { path: '/natureos/storage', gate: AccessGate.AUTHENTICATED, config: { gate: AccessGate.AUTHENTICATED, minimumRole: UserRole.USER }, description: 'Storage' },
]

// Premium routes - require subscription
export const PREMIUM_ROUTES: RouteAccess[] = [
  { 
    path: '/myca-ai', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'MYCA AI' 
  },
  { 
    path: '/ancestry/explorer', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'Ancestry Explorer' 
  },
  { 
    path: '/ancestry/tools', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'Ancestry Tools' 
  },
  { 
    path: '/natureos/ai-studio', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'AI Studio' 
  },
  { 
    path: '/natureos/live-map', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'Live Map' 
  },
  { 
    path: '/natureos/sdk', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'Developer SDK' 
  },
  { 
    path: '/natureos/api', 
    gate: AccessGate.PREMIUM, 
    config: { 
      gate: AccessGate.PREMIUM, 
      minimumRole: UserRole.PREMIUM,
      subscriptionRequired: SubscriptionTier.PRO
    }, 
    description: 'API Explorer' 
  },
]

// Admin routes
export const ADMIN_ROUTES: RouteAccess[] = [
  { path: '/devices', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Device Manager' },
  { path: '/devices/[id]', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Device Details' },
  { path: '/security', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Security' },
  { path: '/security/compliance', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Compliance' },
  { path: '/security/fcl', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'FCL Tracking' },
  { path: '/security/forms', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Forms' },
  { path: '/defense', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Defense' },
  { path: '/natureos/devices/network', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Network' },
  { path: '/natureos/mas', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'MAS' },
  { path: '/natureos/workflows', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Workflows' },
  { path: '/natureos/functions', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Functions' },
  { path: '/natureos/integrations', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'Integrations' },
  { path: '/natureos/wifisense', gate: AccessGate.ADMIN, config: { gate: AccessGate.ADMIN, minimumRole: UserRole.ADMIN }, description: 'WiFiSense' },
]

// Super Admin routes (Morgan only)
export const SUPER_ADMIN_ROUTES: RouteAccess[] = [
  { path: '/natureos/settings', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'System Settings' },
  { path: '/natureos/model-training', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'Model Training' },
  { path: '/natureos/containers', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'Containers' },
  { path: '/natureos/monitoring', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'Monitoring' },
  { path: '/natureos/drone', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'Drone Control' },
  { path: '/natureos/shell', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'System Shell' },
  { path: '/natureos/cloud', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'Cloud' },
  { path: '/natureos/smell-training', gate: AccessGate.SUPER_ADMIN, config: { gate: AccessGate.SUPER_ADMIN, minimumRole: UserRole.SUPER_ADMIN }, description: 'Smell Training' },
]

// All routes combined
export const ALL_ROUTES: RouteAccess[] = [
  ...PUBLIC_ROUTES,
  ...FREEMIUM_ROUTES,
  ...AUTHENTICATED_ROUTES,
  ...PREMIUM_ROUTES,
  ...ADMIN_ROUTES,
  ...SUPER_ADMIN_ROUTES,
]

// Get route access config
export function getRouteAccess(path: string): RouteAccess | undefined {
  // Exact match first
  let route = ALL_ROUTES.find(r => r.path === path)
  if (route) return route
  
  // Dynamic route matching
  for (const r of ALL_ROUTES) {
    if (r.path.includes('[')) {
      const pattern = r.path.replace(/\[.*?\]/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(path)) return r
    }
  }
  
  // Parent route matching (for nested routes)
  const segments = path.split('/').filter(Boolean)
  while (segments.length > 0) {
    const parentPath = '/' + segments.join('/')
    route = ALL_ROUTES.find(r => r.path === parentPath)
    if (route) return route
    segments.pop()
  }
  
  return undefined
}

// Check if path is public
export function isPublicRoute(path: string): boolean {
  const route = getRouteAccess(path)
  return route?.gate === AccessGate.PUBLIC
}

// Check if path requires auth
export function requiresAuth(path: string): boolean {
  const route = getRouteAccess(path)
  if (!route) return true // Default to requiring auth
  return route.gate !== AccessGate.PUBLIC && route.gate !== AccessGate.FREEMIUM
}
