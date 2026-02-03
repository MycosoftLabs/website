/**
 * Multi-Tenant Platform Service
 * Organization management, resource isolation, and federation
 */

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'trial'
  createdAt: string
  memberCount: number
  resourceQuota: ResourceQuota
  settings: OrganizationSettings
}

export interface ResourceQuota {
  maxUsers: number
  maxExperiments: number
  maxSimulations: number
  maxStorageGB: number
  maxComputeHours: number
  currentUsage: {
    users: number
    experiments: number
    simulations: number
    storageGB: number
    computeHours: number
  }
}

export interface OrganizationSettings {
  allowedModules: string[]
  dataRetentionDays: number
  auditLogging: boolean
  ssoEnabled: boolean
  apiAccessEnabled: boolean
}

export interface Member {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'scientist' | 'viewer'
  status: 'active' | 'invited' | 'suspended'
  joinedAt: string
  lastActiveAt?: string
}

export interface UsageMetrics {
  organizationId: string
  period: string
  experiments: number
  simulations: number
  computeHours: number
  storageGB: number
  apiCalls: number
  activeUsers: number
}

export interface FederationPeer {
  id: string
  name: string
  endpoint: string
  status: 'connected' | 'disconnected' | 'pending'
  dataSharing: DataSharingPolicy
  lastSync: string
}

export interface DataSharingPolicy {
  shareExperiments: boolean
  shareSimulations: boolean
  shareSpecies: boolean
  requireApproval: boolean
  allowedCategories: string[]
}

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  action: string
  resource: string
  resourceId: string
  details: Record<string, unknown>
  ipAddress: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export class PlatformService {
  private baseUrl: string

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Platform Error: ${response.status}`)
    }
    
    return response.json()
  }

  // Organization Management
  async getOrganization(id: string): Promise<Organization> {
    return this.request(`/platform/organizations/${id}`)
  }

  async listOrganizations(): Promise<{ organizations: Organization[] }> {
    return this.request('/platform/organizations')
  }

  async createOrganization(name: string, plan: string): Promise<Organization> {
    return this.request('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify({ name, plan }),
    })
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    return this.request(`/platform/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async deleteOrganization(id: string): Promise<void> {
    return this.request(`/platform/organizations/${id}`, { method: 'DELETE' })
  }

  // Member Management
  async listMembers(orgId: string): Promise<{ members: Member[] }> {
    return this.request(`/platform/organizations/${orgId}/members`)
  }

  async inviteMember(orgId: string, email: string, role: string): Promise<Member> {
    return this.request(`/platform/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
  }

  async updateMemberRole(orgId: string, memberId: string, role: string): Promise<Member> {
    return this.request(`/platform/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  }

  async removeMember(orgId: string, memberId: string): Promise<void> {
    return this.request(`/platform/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' })
  }

  // Usage & Billing
  async getUsageMetrics(orgId: string, period?: string): Promise<UsageMetrics> {
    const params = period ? `?period=${period}` : ''
    return this.request(`/platform/organizations/${orgId}/usage${params}`)
  }

  async getQuota(orgId: string): Promise<ResourceQuota> {
    return this.request(`/platform/organizations/${orgId}/quota`)
  }

  async upgradeplan(orgId: string, plan: string): Promise<Organization> {
    return this.request(`/platform/organizations/${orgId}/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    })
  }

  // Federation
  async listPeers(orgId: string): Promise<{ peers: FederationPeer[] }> {
    return this.request(`/platform/organizations/${orgId}/federation/peers`)
  }

  async connectPeer(orgId: string, endpoint: string, policy: DataSharingPolicy): Promise<FederationPeer> {
    return this.request(`/platform/organizations/${orgId}/federation/peers`, {
      method: 'POST',
      body: JSON.stringify({ endpoint, policy }),
    })
  }

  async disconnectPeer(orgId: string, peerId: string): Promise<void> {
    return this.request(`/platform/organizations/${orgId}/federation/peers/${peerId}`, { method: 'DELETE' })
  }

  async syncWithPeer(orgId: string, peerId: string): Promise<void> {
    return this.request(`/platform/organizations/${orgId}/federation/peers/${peerId}/sync`, { method: 'POST' })
  }

  // Audit Logs
  async getAuditLogs(orgId: string, filters?: object): Promise<{ logs: AuditLog[] }> {
    return this.request(`/platform/organizations/${orgId}/audit`, {
      method: 'POST',
      body: JSON.stringify({ filters }),
    })
  }

  // Settings
  async getSettings(orgId: string): Promise<OrganizationSettings> {
    return this.request(`/platform/organizations/${orgId}/settings`)
  }

  async updateSettings(orgId: string, settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    return this.request(`/platform/organizations/${orgId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  }
}

export const platformService = new PlatformService()
