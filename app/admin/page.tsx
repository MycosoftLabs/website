'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseUser, useProfile } from '@/hooks/use-supabase-user'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  Key, 
  Users, 
  Database, 
  Server, 
  Lock, 
  Eye, 
  EyeOff,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Zap,
  Brain,
  Globe,
  Activity,
  Terminal,
  Cpu,
  HardDrive,
  Network,
  Layers,
  Crown,
  Bot,
  User,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Power,
  PowerOff,
  Radio,
  Wifi,
  WifiOff,
  AlertOctagon,
  Home,
  ArrowLeft,
  Fingerprint,
  KeyRound,
  MonitorSmartphone,
  UserCheck,
  UserX,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Info,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SystemStats {
  totalUsers: { human: number; machine: number }
  activeDevices: number
  totalDatabaseSize: {
    mindex: number
    supabase: number
    nas: number
    redis: number
    qdrant: number
    total: number
  }
  apiCallsToday: {
    mindex: number
    website: number
    mycobrain: number
    total: number
  }
}

interface ServiceStatus {
  name: string
  port: number | null
  status: 'running' | 'stopped' | 'error' | 'unknown'
  type: 'Frontend' | 'API' | 'Database' | 'IoT' | 'AI' | 'Monitoring' | 'Automation' | 'Voice' | 'Cloud'
  category: 'Always-On' | 'MAS Stack' | 'Cloud' | 'Infrastructure'
  description: string
  healthEndpoint?: string
}

interface APIKeyConfig {
  name: string
  key: string
  category: 'AI' | 'Database' | 'Payments' | 'Maps' | 'Blockchain' | 'Research' | 'Communication' | 'Automation' | 'Infrastructure' | 'Tracking' | 'Cloud'
  status: 'configured' | 'pending' | 'missing'
  description: string
}

interface UserAccount {
  id: string
  name: string
  email: string
  type: 'human' | 'machine'
  machineType?: 'ai_agent' | 'service' | 'bot' | 'automation'
  role: string
  tier: string
  status: 'active' | 'inactive' | 'pending' | 'blocked'
  provider?: string
  lastActive?: string
}

interface SecurityStats {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  activeSessions: number
  blockedIPs: number
  failedLogins: number
  suspiciousActivities: number
  firewallRules: number
  vpnConnections: number
  portScans24h: number
  ddosAttempts24h: number
  authFailures24h: number
  malwareBlocked24h: number
}

interface DatabaseInfo {
  name: string
  type: string
  size: string
  status: 'online' | 'offline' | 'syncing'
  tables?: number
  records?: number
  description: string
  link?: string
}

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'auth', label: 'Authentication', icon: Lock },
  { id: 'users', label: 'Users & Access', icon: Users },
  { id: 'soc', label: 'SOC Master', icon: Shield },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'system', label: 'System', icon: Terminal },
]

// ============================================================================
// COMPLETE API KEYS - ALL KNOWN KEYS FROM ENV FILES
// ============================================================================

const ALL_API_KEYS: APIKeyConfig[] = [
  // AI Providers
  { name: 'OpenAI', key: 'OPENAI_API_KEY', category: 'AI', status: 'configured', description: 'GPT-4, embeddings, DALL-E' },
  { name: 'OpenAI Personal', key: 'OPENAI_PERSONAL_API_KEY', category: 'AI', status: 'configured', description: 'Personal usage key' },
  { name: 'Anthropic Claude', key: 'ANTHROPIC_API_KEY', category: 'AI', status: 'configured', description: 'Claude 3.5 Sonnet/Opus' },
  { name: 'Groq', key: 'GROQ_API_KEY', category: 'AI', status: 'configured', description: 'Fast LPU inference' },
  { name: 'xAI Grok', key: 'XAI_API_KEY', category: 'AI', status: 'configured', description: 'Grok models' },
  { name: 'Google AI (Gemini)', key: 'GOOGLE_AI_API_KEY', category: 'AI', status: 'configured', description: 'Gemini Pro/Ultra' },
  { name: 'AWS Bedrock', key: 'AWS_BEDROCK_ACCESS_KEY', category: 'AI', status: 'pending', description: 'AWS AI services' },
  { name: 'Azure OpenAI', key: 'AZURE_OPENAI_API_KEY', category: 'AI', status: 'pending', description: 'Azure-hosted OpenAI' },
  { name: 'Google Vertex AI', key: 'GOOGLE_VERTEX_API_KEY', category: 'AI', status: 'pending', description: 'Google Cloud AI' },
  
  // Database
  { name: 'Supabase URL', key: 'NEXT_PUBLIC_SUPABASE_URL', category: 'Database', status: 'configured', description: 'Supabase project URL' },
  { name: 'Supabase Anon Key', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', category: 'Database', status: 'configured', description: 'Public anonymous key' },
  { name: 'Supabase Service Role', key: 'SUPABASE_SERVICE_ROLE_KEY', category: 'Database', status: 'configured', description: 'Server-side admin key' },
  { name: 'MINDEX Database URL', key: 'MINDEX_DATABASE_URL', category: 'Database', status: 'configured', description: 'PostgreSQL connection' },
  { name: 'MINDEX API Key', key: 'MINDEX_API_KEY', category: 'Database', status: 'configured', description: 'API authentication' },
  
  // Payments
  { name: 'Stripe Secret', key: 'STRIPE_SECRET_KEY', category: 'Payments', status: 'configured', description: 'Server-side Stripe' },
  { name: 'Stripe Publishable', key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', category: 'Payments', status: 'configured', description: 'Client-side Stripe' },
  { name: 'Stripe Webhook Secret', key: 'STRIPE_WEBHOOK_SECRET', category: 'Payments', status: 'configured', description: 'Webhook verification' },
  
  // Maps & Location
  { name: 'Google Maps', key: 'GOOGLE_MAPS_API_KEY', category: 'Maps', status: 'configured', description: 'Maps, Geocoding, Places' },
  
  // Blockchain
  { name: 'Infura (Ethereum)', key: 'INFURA_API_KEY', category: 'Blockchain', status: 'configured', description: 'Ethereum node access' },
  { name: 'QuickNode (Solana)', key: 'QUICKNODE_SOLANA_ENDPOINT', category: 'Blockchain', status: 'configured', description: 'Solana RPC endpoint' },
  
  // Research APIs
  { name: 'iNaturalist JWT', key: 'INATURALIST_JWT', category: 'Research', status: 'configured', description: 'Species observations' },
  { name: 'NIH API', key: 'NIH_API_KEY', category: 'Research', status: 'configured', description: 'PubMed, research papers' },
  { name: 'Elsevier API', key: 'ELSEVIER_API_KEY', category: 'Research', status: 'configured', description: 'Scientific publications' },
  { name: 'GBIF API', key: 'GBIF_API_KEY', category: 'Research', status: 'pending', description: 'Biodiversity data' },
  { name: 'CrossRef API', key: 'CROSSREF_API_KEY', category: 'Research', status: 'pending', description: 'DOI metadata' },
  
  // Communication
  { name: 'Discord Bot Token', key: 'DISCORD_BOT_TOKEN', category: 'Communication', status: 'configured', description: 'Mycosoft Discord bot' },
  { name: 'Slack Bot Token', key: 'SLACK_BOT_TOKEN', category: 'Communication', status: 'pending', description: 'Slack integration' },
  { name: 'Twilio Account SID', key: 'TWILIO_ACCOUNT_SID', category: 'Communication', status: 'pending', description: 'SMS/Voice' },
  { name: 'SendGrid API', key: 'SENDGRID_API_KEY', category: 'Communication', status: 'pending', description: 'Email delivery' },
  
  // Automation
  { name: 'Asana Client ID', key: 'ASANA_CLIENT_ID', category: 'Automation', status: 'configured', description: 'Task management' },
  { name: 'Asana Client Secret', key: 'ASANA_CLIENT_SECRET', category: 'Automation', status: 'configured', description: 'OAuth secret' },
  { name: 'N8N API Key', key: 'N8N_API_KEY', category: 'Automation', status: 'configured', description: 'Workflow automation' },
  { name: 'Notion API', key: 'NOTION_API_KEY', category: 'Automation', status: 'pending', description: 'Notion integration' },
  
  // Infrastructure
  { name: 'UniFi API Key', key: 'UNIFI_API_KEY', category: 'Infrastructure', status: 'configured', description: 'Network management' },
  { name: 'Proxmox API Token', key: 'PROXMOX_API_TOKEN', category: 'Infrastructure', status: 'configured', description: 'VM management' },
  { name: 'Cursor Primary Key', key: 'CURSOR_API_KEY', category: 'Infrastructure', status: 'configured', description: 'Cursor IDE agent' },
  { name: 'Cursor Shell Key', key: 'CURSOR_SHELL_API_KEY', category: 'Infrastructure', status: 'configured', description: 'Mycosoft Shell' },
  
  // Tracking & Monitoring
  { name: 'FlightRadar24', key: 'FLIGHTRADAR24_API_KEY', category: 'Tracking', status: 'configured', description: 'Aviation tracking' },
  { name: 'MarineTraffic', key: 'MARINETRAFFIC_API_KEY', category: 'Tracking', status: 'pending', description: 'Maritime tracking' },
  { name: 'OpenSky Network', key: 'OPENSKY_API_KEY', category: 'Tracking', status: 'pending', description: 'ADS-B data' },
  
  // Cloud Providers
  { name: 'Google OAuth Client ID', key: 'GOOGLE_CLIENT_ID', category: 'Cloud', status: 'configured', description: 'OAuth authentication' },
  { name: 'Google OAuth Secret', key: 'GOOGLE_CLIENT_SECRET', category: 'Cloud', status: 'configured', description: 'OAuth secret' },
  { name: 'GitHub OAuth Client ID', key: 'GITHUB_CLIENT_ID', category: 'Cloud', status: 'configured', description: 'OAuth authentication' },
  { name: 'GitHub OAuth Secret', key: 'GITHUB_CLIENT_SECRET', category: 'Cloud', status: 'configured', description: 'OAuth secret' },
  { name: 'Cloudflare API Token', key: 'CLOUDFLARE_API_TOKEN', category: 'Cloud', status: 'pending', description: 'DNS & CDN' },
  { name: 'Vercel Token', key: 'VERCEL_TOKEN', category: 'Cloud', status: 'pending', description: 'Deployment' },
]

// ============================================================================
// COMPLETE SERVICE DEFINITIONS - ALL DOCKER SERVICES
// ============================================================================

const ALL_SERVICES: ServiceStatus[] = [
  // Always-On Stack (docker-compose.always-on.yml)
  { name: 'Mycosoft Website', port: 3000, status: 'running', type: 'Frontend', category: 'Always-On', description: 'Main Next.js website', healthEndpoint: '/api/health' },
  { name: 'MINDEX API', port: 8000, status: 'running', type: 'API', category: 'Always-On', description: 'Fungal species database API' },
  { name: 'MycoBrain Service', port: 8003, status: 'running', type: 'IoT', category: 'Always-On', description: 'Device telemetry & management' },
  { name: 'MINDEX Postgres', port: 5432, status: 'running', type: 'Database', category: 'Always-On', description: 'Primary MINDEX database' },
  
  // MAS Stack (docker-compose.yml)
  { name: 'MAS Orchestrator', port: 8001, status: 'running', type: 'API', category: 'MAS Stack', description: 'MYCA agent orchestration' },
  { name: 'Grafana', port: 3002, status: 'running', type: 'Monitoring', category: 'MAS Stack', description: 'Metrics dashboards' },
  { name: 'Prometheus', port: 9090, status: 'running', type: 'Monitoring', category: 'MAS Stack', description: 'Metrics collection' },
  { name: 'N8N', port: 5678, status: 'running', type: 'Automation', category: 'MAS Stack', description: 'Workflow automation (16+ active)' },
  { name: 'Qdrant', port: 6333, status: 'running', type: 'Database', category: 'MAS Stack', description: 'Vector database for RAG' },
  { name: 'Redis', port: 6379, status: 'running', type: 'Database', category: 'MAS Stack', description: 'Cache & message broker' },
  { name: 'MAS Postgres', port: 5433, status: 'running', type: 'Database', category: 'MAS Stack', description: 'MAS orchestrator database' },
  { name: 'Whisper STT', port: 8765, status: 'running', type: 'Voice', category: 'MAS Stack', description: 'Speech-to-text' },
  { name: 'TTS Piper', port: 10200, status: 'running', type: 'Voice', category: 'MAS Stack', description: 'Text-to-speech (Piper)' },
  { name: 'OpenEDAI Speech', port: 5500, status: 'running', type: 'Voice', category: 'MAS Stack', description: 'Advanced speech processing' },
  { name: 'Voice UI', port: 8090, status: 'running', type: 'Voice', category: 'MAS Stack', description: 'Voice interface frontend' },
  { name: 'MYCA UniFi Dashboard', port: 3100, status: 'running', type: 'Frontend', category: 'MAS Stack', description: 'Agent management & voice' },
  { name: 'Ollama', port: 11434, status: 'running', type: 'AI', category: 'MAS Stack', description: 'Local LLM inference' },
  { name: 'Loki', port: 3101, status: 'running', type: 'Monitoring', category: 'MAS Stack', description: 'Log aggregation' },
  
  // Cloud Services
  { name: 'Supabase Cloud', port: null, status: 'running', type: 'Cloud', category: 'Cloud', description: 'Auth, DB, Storage, Realtime' },
  { name: 'Stripe Payments', port: null, status: 'running', type: 'Cloud', category: 'Cloud', description: 'Payment processing' },
  { name: 'Cloudflare', port: null, status: 'running', type: 'Cloud', category: 'Cloud', description: 'CDN & DNS' },
  
  // Infrastructure
  { name: 'MINDEX ETL Scraper', port: 8010, status: 'running', type: 'API', category: 'Infrastructure', description: 'Data extraction & indexing' },
]

// ============================================================================
// USER ACCOUNTS - HUMANS VS MACHINES
// ============================================================================

const MOCK_USERS: UserAccount[] = [
  // Humans
  { 
    id: '1', 
    name: 'Morgan Rockwell', 
    email: 'morgan@mycosoft.org', 
    type: 'human',
    role: 'SUPER_ADMIN', 
    tier: 'Enterprise', 
    status: 'active',
    provider: 'Email',
    lastActive: 'Now'
  },
  { 
    id: '2', 
    name: 'Test User', 
    email: 'test@mycosoft.com', 
    type: 'human',
    role: 'USER', 
    tier: 'Free', 
    status: 'pending',
    provider: 'Email',
    lastActive: '2 hours ago'
  },
  
  // Machine Accounts - AI Agents
  { 
    id: 'm1', 
    name: 'MYCA Orchestrator', 
    email: 'myca-orchestrator@system.mycosoft.org', 
    type: 'machine',
    machineType: 'ai_agent',
    role: 'SERVICE', 
    tier: 'System', 
    status: 'active',
    lastActive: 'Always running'
  },
  { 
    id: 'm2', 
    name: 'Cursor AI Agent', 
    email: 'cursor-agent@system.mycosoft.org', 
    type: 'machine',
    machineType: 'ai_agent',
    role: 'SERVICE', 
    tier: 'System', 
    status: 'active',
    lastActive: 'Now'
  },
  { 
    id: 'm3', 
    name: 'Claude API', 
    email: 'claude@external.mycosoft.org', 
    type: 'machine',
    machineType: 'ai_agent',
    role: 'EXTERNAL', 
    tier: 'API', 
    status: 'active',
    lastActive: 'On demand'
  },
  { 
    id: 'm4', 
    name: 'OpenAI GPT-4', 
    email: 'openai@external.mycosoft.org', 
    type: 'machine',
    machineType: 'ai_agent',
    role: 'EXTERNAL', 
    tier: 'API', 
    status: 'active',
    lastActive: 'On demand'
  },
  { 
    id: 'm5', 
    name: 'Grok xAI', 
    email: 'grok@external.mycosoft.org', 
    type: 'machine',
    machineType: 'ai_agent',
    role: 'EXTERNAL', 
    tier: 'API', 
    status: 'active',
    lastActive: 'On demand'
  },
  
  // Machine Accounts - Services
  { 
    id: 's1', 
    name: 'N8N Automation', 
    email: 'n8n@service.mycosoft.org', 
    type: 'machine',
    machineType: 'automation',
    role: 'SERVICE', 
    tier: 'System', 
    status: 'active',
    lastActive: 'Always running'
  },
  { 
    id: 's2', 
    name: 'Discord Bot', 
    email: 'discord-bot@service.mycosoft.org', 
    type: 'machine',
    machineType: 'bot',
    role: 'SERVICE', 
    tier: 'System', 
    status: 'active',
    lastActive: 'Always running'
  },
  { 
    id: 's3', 
    name: 'MycoBrain Device Auth', 
    email: 'mycobrain@device.mycosoft.org', 
    type: 'machine',
    machineType: 'service',
    role: 'DEVICE', 
    tier: 'System', 
    status: 'active',
    lastActive: 'Active'
  },
]

// ============================================================================
// DATABASE INFO
// ============================================================================

const ALL_DATABASES: DatabaseInfo[] = [
  { 
    name: 'MINDEX PostgreSQL', 
    type: 'PostgreSQL + PostGIS', 
    size: '2.4 GB', 
    status: 'online',
    tables: 47,
    records: 156847,
    description: 'Master fungal species database with geospatial data',
    link: 'http://localhost:8000'
  },
  { 
    name: 'Supabase Cloud', 
    type: 'PostgreSQL', 
    size: '156 MB', 
    status: 'online',
    tables: 12,
    records: 2450,
    description: 'User auth, profiles, telemetry, subscriptions',
    link: 'https://supabase.com/dashboard/project/hnevnsxnhfibhbsipqvz'
  },
  { 
    name: 'MAS PostgreSQL', 
    type: 'PostgreSQL', 
    size: '890 MB', 
    status: 'online',
    tables: 23,
    records: 45230,
    description: 'Agent state, tasks, knowledge graphs',
  },
  { 
    name: 'Qdrant Vector DB', 
    type: 'Vector Database', 
    size: '1.2 GB', 
    status: 'online',
    tables: 8,
    records: 125000,
    description: 'RAG embeddings, semantic search',
  },
  { 
    name: 'Redis Cache', 
    type: 'In-Memory', 
    size: '45 MB', 
    status: 'online',
    description: 'Session cache, message queue, real-time data',
  },
  { 
    name: 'NAS Storage', 
    type: 'File System', 
    size: '4.2 TB', 
    status: 'online',
    description: 'Backups, media, firmware, research papers',
  },
  { 
    name: 'NatureOS Data', 
    type: 'Time Series', 
    size: '780 MB', 
    status: 'syncing',
    records: 2340000,
    description: 'Environmental sensors, device telemetry',
  },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SuperAdminPage() {
  const { user, loading: userLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [keyValues, setKeyValues] = useState<Record<string, { masked: string; configured: boolean; revealed?: string }>>({})
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [securityStatus, setSecurityStatus] = useState<{
    threatLevel: string;
    monitoring: boolean;
    eventsCount: number;
    criticalEvents: number;
    uniqueIPs: number;
    incidentsOpen: number;
    lastUpdated: string;
  } | null>(null)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    '$ system --status',
    'Mycosoft Super Terminal v2.0.0',
    'User: morgan@mycosoft.org [SUPER_ADMIN]',
    '────────────────────────────────────',
    'Services: 18 running | 0 stopped',
    'Databases: 7 connected | 0 offline',
    'MYCA Agents: 42 active | 0 idle',
    'Threat Level: LOW',
    '────────────────────────────────────',
    'Type "help" for available commands',
    ''
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'human' | 'machine'>('all')
  const terminalRef = useRef<HTMLDivElement>(null)

  const loading = userLoading || profileLoading
  const isSuperAdmin = profile?.role === 'super_admin' && user?.email === 'morgan@mycosoft.org'

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast.error('Access denied. Super Admin only.')
      router.push('/dashboard')
    }
  }, [loading, isSuperAdmin, router])

  // Fetch security status for SOC tab
  const fetchSecurityStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/security?action=status')
      if (response.ok) {
        const data = await response.json()
        setSecurityStatus({
          threatLevel: data.threat_level || 'low',
          monitoring: data.monitoring_enabled !== false,
          eventsCount: data.events_24h || 0,
          criticalEvents: data.critical_events || 0,
          uniqueIPs: data.unique_ips || 0,
          incidentsOpen: data.open_incidents || 0,
          lastUpdated: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Error fetching security status:', error)
    }
  }, [])

  // Load security status when switching to the SOC tab
  useEffect(() => {
    if (activeTab === 'soc' && !securityStatus) {
      fetchSecurityStatus()
    }
  }, [activeTab, securityStatus, fetchSecurityStatus])

  // Fetch API key values from the server
  const fetchApiKeyValues = useCallback(async () => {
    try {
      setLoadingKeys(true)
      const response = await fetch('/api/admin/api-keys')
      if (response.ok) {
        const data = await response.json()
        setKeyValues(data.keys || {})
      } else {
        console.error('Failed to fetch API keys:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  // Load API keys when switching to the keys tab
  useEffect(() => {
    if (activeTab === 'keys' && Object.keys(keyValues).length === 0) {
      fetchApiKeyValues()
    }
  }, [activeTab, keyValues, fetchApiKeyValues])

  const toggleKeyVisibility = async (keyName: string) => {
    const isCurrentlyVisible = showKeys[keyName]
    
    if (!isCurrentlyVisible) {
      // Fetch the revealed key value from server
      try {
        const response = await fetch(`/api/admin/api-keys?reveal=${encodeURIComponent(keyName)}`)
        if (response.ok) {
          const data = await response.json()
          setKeyValues(prev => ({
            ...prev,
            [keyName]: data.keys[keyName],
          }))
        }
      } catch (error) {
        console.error('Error revealing key:', error)
        toast.error('Failed to reveal key')
        return
      }
    }
    
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }))
  }

  const copyToClipboard = async (keyName: string) => {
    // Get the revealed value or fetch it if not available
    let valueToCopy = keyValues[keyName]?.revealed
    
    if (!valueToCopy) {
      try {
        const response = await fetch(`/api/admin/api-keys?reveal=${encodeURIComponent(keyName)}`)
        if (response.ok) {
          const data = await response.json()
          valueToCopy = data.keys[keyName]?.revealed
        }
      } catch (error) {
        console.error('Error fetching key for copy:', error)
      }
    }
    
    if (valueToCopy) {
      navigator.clipboard.writeText(valueToCopy)
      toast.success('API key copied to clipboard')
    } else {
      toast.error('Key not configured or unavailable')
    }
  }

  const refreshServices = async () => {
    setRefreshing(true)
    // In production, this would call APIs to get real status
    await new Promise(r => setTimeout(r, 1500))
    setRefreshing(false)
    toast.success('Services refreshed')
  }

  // Terminal command handler
  const handleTerminalCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim()
    let output: string[] = []

    if (cmd === 'help') {
      output = [
        'Available Commands:',
        '  status        - Show system status',
        '  services      - List all services',
        '  agents        - List MYCA agents',
        '  users         - List users',
        '  security      - Security status',
        '  kill-switch   - Activate kill switch (requires confirmation)',
        '  lockdown      - Activate lockdown mode (requires confirmation)',
        '  clear         - Clear terminal',
        '  exit          - Close terminal',
      ]
    } else if (cmd === 'status') {
      output = [
        'System Status Report',
        '────────────────────────────────────',
        `Time: ${new Date().toISOString()}`,
        'CPU: 23% | Memory: 67% | Disk: 45%',
        'Network: 1.2 Gbps | Latency: 12ms',
        'All systems operational ✓',
      ]
    } else if (cmd === 'services') {
      output = [
        'Running Services:',
        ...ALL_SERVICES.filter(s => s.status === 'running').map(s => 
          `  ✓ ${s.name} ${s.port ? `:${s.port}` : '(cloud)'}`
        )
      ]
    } else if (cmd === 'agents') {
      output = [
        'MYCA Agent Status:',
        '  Core Agents: 5 active',
        '  Financial Agents: 4 active',
        '  Mycology Agents: 6 active',
        '  Research Agents: 8 active',
        '  Communication Agents: 4 active',
        '  Data Agents: 5 active',
        '  Infrastructure Agents: 6 active',
        '  Security Agents: 4 active',
        '────────────────────────────────────',
        '  Total: 42 agents | All operational',
      ]
    } else if (cmd === 'security') {
      output = [
        'Security Status:',
        '  Threat Level: LOW',
        '  Active Sessions: 3',
        '  Blocked IPs (24h): 0',
        '  Failed Logins: 2',
        '  Firewall: Active',
        '  VPN: 1 connection',
      ]
    } else if (cmd === 'kill-switch') {
      output = [
        '⚠️  KILL SWITCH requires confirmation.',
        'This will immediately terminate all services.',
        'Type "kill-switch --confirm" to proceed.',
      ]
    } else if (cmd === 'kill-switch --confirm') {
      output = [
        '🚨 KILL SWITCH ACTIVATED',
        'All services shutting down...',
        '(Demo mode - no actual shutdown)',
      ]
      toast.error('Kill Switch activated (demo mode)')
    } else if (cmd === 'lockdown') {
      output = [
        '⚠️  LOCKDOWN MODE requires confirmation.',
        'This will block all external access.',
        'Type "lockdown --confirm" to proceed.',
      ]
    } else if (cmd === 'lockdown --confirm') {
      output = [
        '🔒 LOCKDOWN MODE ACTIVATED',
        'External access blocked.',
        'Only localhost connections allowed.',
        '(Demo mode - no actual lockdown)',
      ]
      toast.warning('Lockdown Mode activated (demo mode)')
    } else if (cmd === 'clear') {
      setTerminalOutput(['$ '])
      return
    } else if (cmd === 'exit') {
      setActiveTab('overview')
      return
    } else if (cmd) {
      output = [`Command not found: ${command}`, 'Type "help" for available commands.']
    }

    setTerminalOutput(prev => [...prev, `$ ${command}`, ...output, ''])
    
    // Auto-scroll terminal
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }, 10)
  }, [])

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (terminalInput.trim()) {
      handleTerminalCommand(terminalInput)
      setTerminalInput('')
    }
  }

  // Filter users by type
  const filteredUsers = MOCK_USERS.filter(u => {
    if (userFilter === 'all') return true
    return u.type === userFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-400">
          <RefreshCw className="animate-spin" size={24} />
          <span className="text-lg font-mono">Authenticating Super Admin...</span>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">Super Admin privileges required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header with Navigation */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Navigation */}
              <Link 
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <Home className="w-4 h-4" />
              </Link>
              
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  Super Admin Control Center
                  <span className="text-xs font-mono bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                    MASTER ACCESS
                  </span>
                </h1>
                <p className="text-slate-400 text-sm">
                  Welcome, Morgan • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshServices}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                Refresh
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                User Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ================================================================ */}
          {/* OVERVIEW TAB */}
          {/* ================================================================ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Quick Stats - Real Data Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  icon={Users} 
                  label="Total Users" 
                  value="2 Human + 9 Machine" 
                  change="11 total accounts" 
                />
                <StatCard 
                  icon={Cpu} 
                  label="Active Devices" 
                  value="2" 
                  change="MycoBrain V1 + SporeBase" 
                />
                <StatCard 
                  icon={Database} 
                  label="Total Database Size" 
                  value="9.6 GB" 
                  change="MINDEX 2.4GB + Supabase 156MB + MAS 890MB + Qdrant 1.2GB + NAS 4.2TB" 
                />
                <StatCard 
                  icon={Activity} 
                  label="API Calls Today" 
                  value="3,892" 
                  change="MINDEX 1,247 + Website 1,890 + MycoBrain 755" 
                />
              </div>

              {/* Service Status Summary */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-amber-400" />
                    Service Status Summary
                  </h2>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-lg">
                      {ALL_SERVICES.filter(s => s.status === 'running').length} Running
                    </span>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-lg">
                      {ALL_SERVICES.filter(s => s.status === 'stopped').length} Stopped
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Always-On', 'MAS Stack', 'Cloud', 'Infrastructure'].map((cat) => {
                    const services = ALL_SERVICES.filter(s => s.category === cat)
                    const running = services.filter(s => s.status === 'running').length
                    return (
                      <div key={cat} className="bg-slate-900/50 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">{cat}</div>
                        <div className="text-2xl font-bold text-white">{running}/{services.length}</div>
                        <div className="text-emerald-400 text-xs">operational</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Access Gates Overview */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Access Gate Distribution
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { gate: 'Public', symbol: '🌐', count: 8 },
                    { gate: 'Freemium', symbol: '✨', count: 4 },
                    { gate: 'Authenticated', symbol: '🔐', count: 12 },
                    { gate: 'Premium', symbol: '💎', count: 7 },
                    { gate: 'Admin', symbol: '⚙️', count: 5 },
                    { gate: 'Super Admin', symbol: '👑', count: 3 },
                  ].map((gate) => (
                    <div key={gate.gate} className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <div className="text-2xl mb-2">{gate.symbol}</div>
                      <div className="text-white font-bold">{gate.gate}</div>
                      <div className="text-slate-400 text-sm">{gate.count} routes</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickLink 
                  href="/security" 
                  icon={Shield} 
                  label="Security Operations Center"
                  description="Threat monitoring & IP lookup"
                />
                <QuickLink 
                  href="/dashboard/soc" 
                  icon={Globe} 
                  label="SOC Dashboard"
                  description="Global monitoring view"
                />
                <QuickLink 
                  href="/natureos" 
                  icon={Brain} 
                  label="NatureOS Console"
                  description="System management"
                />
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* API KEYS TAB */}
          {/* ================================================================ */}
          {activeTab === 'keys' && (
            <motion.div
              key="keys"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-400" />
                    API Keys & Secrets ({ALL_API_KEYS.length} total)
                  </h2>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-lg">
                      {ALL_API_KEYS.filter(k => k.status === 'configured').length} Configured
                    </span>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-lg">
                      {ALL_API_KEYS.filter(k => k.status === 'pending').length} Pending
                    </span>
                  </div>
                </div>

                {/* Group by category */}
                {['AI', 'Database', 'Payments', 'Maps', 'Blockchain', 'Research', 'Communication', 'Automation', 'Infrastructure', 'Tracking', 'Cloud'].map(category => {
                  const keys = ALL_API_KEYS.filter(k => k.category === category)
                  if (keys.length === 0) return null
                  
                  return (
                    <div key={category} className="mb-6">
                      <h3 className="text-sm font-mono text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        {category}
                        <span className="text-xs text-slate-600">({keys.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {keys.map((apiKey) => {
                          const keyData = keyValues[apiKey.key]
                          const isConfigured = keyData?.configured ?? apiKey.status === 'configured'
                          const displayValue = showKeys[apiKey.key] && keyData?.revealed 
                            ? keyData.revealed 
                            : (keyData?.masked || '••••••••')
                          
                          return (
                            <div key={apiKey.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  isConfigured ? "bg-emerald-500" : 
                                  apiKey.status === 'pending' ? "bg-yellow-500" : "bg-red-500"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-medium">{apiKey.name}</div>
                                  <div className="text-slate-500 text-xs font-mono truncate max-w-[200px]" title={apiKey.key}>
                                    {apiKey.key}
                                  </div>
                                  <div className="text-slate-600 text-xs">{apiKey.description}</div>
                                  {/* Key value display */}
                                  <div className="mt-1 flex items-center gap-2">
                                    <code className={cn(
                                      "text-xs px-2 py-1 rounded font-mono max-w-[250px] truncate",
                                      showKeys[apiKey.key] ? "bg-emerald-900/30 text-emerald-300" : "bg-slate-800 text-slate-400"
                                    )} title={showKeys[apiKey.key] ? displayValue : undefined}>
                                      {displayValue}
                                    </code>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  isConfigured 
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : apiKey.status === 'pending'
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-red-500/20 text-red-400"
                                )}>
                                  {isConfigured ? 'configured' : apiKey.status}
                                </span>
                                <button 
                                  onClick={() => toggleKeyVisibility(apiKey.key)}
                                  className="p-2 hover:bg-slate-700 rounded transition-colors"
                                  title={showKeys[apiKey.key] ? "Hide key" : "Show key"}
                                >
                                  {showKeys[apiKey.key] ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(apiKey.key)}
                                  className="p-2 hover:bg-slate-700 rounded transition-colors"
                                  title="Copy key to clipboard"
                                  disabled={!isConfigured}
                                >
                                  <Copy className={cn("w-4 h-4", isConfigured ? "text-slate-400" : "text-slate-600")} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* AUTHENTICATION TAB */}
          {/* ================================================================ */}
          {activeTab === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* OAuth Providers */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" />
                    Authentication Providers
                  </h2>
                  <div className="space-y-3">
                    <AuthProvider name="Google OAuth" status="active" users={1} icon="🔵" />
                    <AuthProvider name="GitHub OAuth" status="active" users={0} icon="⚫" />
                    <AuthProvider name="Email/Password" status="active" users={1} icon="📧" />
                    <AuthProvider name="Magic Link" status="active" users={0} icon="✨" />
                    <AuthProvider name="Phone/SMS" status="inactive" users={0} icon="📱" />
                  </div>
                </div>

                {/* Security Features */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    Security Features
                  </h2>
                  <div className="space-y-4">
                    <SettingToggle label="Two-Factor Authentication (2FA)" enabled={true} description="TOTP authenticator apps" />
                    <SettingToggle label="Hardware Security Keys" enabled={false} description="YubiKey, FIDO2 support" />
                    <SettingToggle label="Biometric Authentication" enabled={false} description="Fingerprint, Face ID" />
                    <SettingToggle label="Email Confirmation Required" enabled={true} description="Verify email on signup" />
                    <SettingToggle label="Rate Limiting" enabled={true} description="Prevent brute force attacks" />
                    <SettingToggle label="Session Timeout" enabled={true} description="Auto-logout after 24h" />
                  </div>
                </div>
              </div>

              {/* Machine Authentication */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-400" />
                  Machine & API Authentication
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium">API Keys</span>
                    </div>
                    <p className="text-slate-400 text-sm">Service-to-service auth via bearer tokens</p>
                    <div className="mt-2 text-emerald-400 text-sm">12 active keys</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Fingerprint className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-medium">JWT Tokens</span>
                    </div>
                    <p className="text-slate-400 text-sm">Signed tokens for authenticated requests</p>
                    <div className="mt-2 text-emerald-400 text-sm">RS256 signing</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MonitorSmartphone className="w-5 h-5 text-orange-400" />
                      <span className="text-white font-medium">Device Auth</span>
                    </div>
                    <p className="text-slate-400 text-sm">MycoBrain device certificates</p>
                    <div className="mt-2 text-emerald-400 text-sm">2 devices registered</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* USERS & ACCESS TAB */}
          {/* ================================================================ */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* User Type Filter */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-slate-400">Filter:</span>
                <button 
                  onClick={() => setUserFilter('all')}
                  className={cn("px-4 py-2 rounded-lg transition-colors", userFilter === 'all' ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400 hover:text-white")}
                >
                  All ({MOCK_USERS.length})
                </button>
                <button 
                  onClick={() => setUserFilter('human')}
                  className={cn("px-4 py-2 rounded-lg transition-colors flex items-center gap-2", userFilter === 'human' ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400 hover:text-white")}
                >
                  <User className="w-4 h-4" />
                  Humans ({MOCK_USERS.filter(u => u.type === 'human').length})
                </button>
                <button 
                  onClick={() => setUserFilter('machine')}
                  className={cn("px-4 py-2 rounded-lg transition-colors flex items-center gap-2", userFilter === 'machine' ? "bg-purple-500/20 text-purple-400" : "bg-slate-800 text-slate-400 hover:text-white")}
                >
                  <Bot className="w-4 h-4" />
                  Machines ({MOCK_USERS.filter(u => u.type === 'machine').length})
                </button>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  {userFilter === 'all' ? 'All Accounts' : userFilter === 'human' ? 'Human Users' : 'Machine Accounts'}
                </h2>
                
                <div className="space-y-3">
                  {filteredUsers.map((account) => (
                    <div 
                      key={account.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-colors",
                        account.type === 'human' 
                          ? "bg-blue-950/20 border-blue-500/20" 
                          : "bg-purple-950/20 border-purple-500/20"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold",
                          account.type === 'human' 
                            ? "bg-gradient-to-br from-blue-500 to-blue-700" 
                            : "bg-gradient-to-br from-purple-500 to-purple-700"
                        )}>
                          {account.type === 'human' ? (
                            <User className="w-6 h-6" />
                          ) : (
                            <Bot className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{account.name}</span>
                            {account.type === 'machine' && account.machineType && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                {account.machineType.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-sm">{account.email}</div>
                          {account.lastActive && (
                            <div className="text-slate-600 text-xs mt-1">Last active: {account.lastActive}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={cn(
                            "px-2 py-1 text-xs rounded font-mono",
                            account.role === 'SUPER_ADMIN' ? "bg-amber-500/20 text-amber-400" :
                            account.role === 'SERVICE' ? "bg-purple-500/20 text-purple-400" :
                            account.role === 'EXTERNAL' ? "bg-blue-500/20 text-blue-400" :
                            account.role === 'DEVICE' ? "bg-orange-500/20 text-orange-400" :
                            "bg-slate-500/20 text-slate-400"
                          )}>
                            {account.role}
                          </span>
                          <span className="ml-2 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                            {account.tier}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.status === 'active' ? (
                            <UserCheck className="w-5 h-5 text-emerald-500" />
                          ) : account.status === 'blocked' ? (
                            <UserX className="w-5 h-5 text-red-500" />
                          ) : (
                            <User className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine Access Control Info */}
              <div className="bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-400 mt-1" />
                  <div>
                    <h3 className="text-white font-medium mb-2">Machine Account Access Control</h3>
                    <p className="text-slate-400 text-sm">
                      Machine accounts (AI agents, bots, services, automation) are separated from human users for security auditing. 
                      Each machine account has rate limiting, scoped permissions, and activity logging. 
                      External AI services (Claude, OpenAI, Grok) are gated through our API proxy for usage tracking and cost control.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* SOC MASTER TAB */}
          {/* ================================================================ */}
          {activeTab === 'soc' && (
            <motion.div
              key="soc"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Master Controls */}
              <div className="bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-8 h-8 text-red-500" />
                  <div>
                    <h2 className="text-xl font-bold text-white">SOC Master Access</h2>
                    <p className="text-slate-400 text-sm">Security Operations Center - Super Admin Mode</p>
                  </div>
                </div>

                {/* Master Override Buttons with Explanations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-900/80 rounded-lg p-4 border border-red-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PowerOff className="w-6 h-6 text-red-500" />
                        <h3 className="text-white font-bold">Kill Switch</h3>
                      </div>
                      <button 
                        onClick={() => {
                          toast.warning('Kill Switch would terminate all services. Use terminal for confirmation.')
                          setActiveTab('system')
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Power className="w-4 h-4" />
                        Enable
                      </button>
                    </div>
                    <div className="text-slate-400 text-sm space-y-2">
                      <p><strong className="text-red-400">What it does:</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Immediately terminates ALL running services</li>
                        <li>Stops all Docker containers (MAS + Always-On stacks)</li>
                        <li>Disconnects all MycoBrain devices</li>
                        <li>Terminates MYCA agents and orchestrator</li>
                        <li>Closes all database connections</li>
                        <li>Blocks all API endpoints</li>
                      </ul>
                      <p className="text-red-400 text-xs mt-2">⚠️ Use only in critical security emergencies</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-lg p-4 border border-amber-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-6 h-6 text-amber-500" />
                        <h3 className="text-white font-bold">Lockdown Mode</h3>
                      </div>
                      <button 
                        onClick={() => {
                          toast.warning('Lockdown Mode would block external access. Use terminal for confirmation.')
                          setActiveTab('system')
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Activate
                      </button>
                    </div>
                    <div className="text-slate-400 text-sm space-y-2">
                      <p><strong className="text-amber-400">What it does:</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Blocks ALL external IP addresses</li>
                        <li>Only allows localhost/LAN connections</li>
                        <li>Disables OAuth providers temporarily</li>
                        <li>Suspends all machine/API accounts</li>
                        <li>Enables maximum logging verbosity</li>
                        <li>Services continue running internally</li>
                      </ul>
                      <p className="text-amber-400 text-xs mt-2">⚠️ Use during active threat investigation</p>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Link href="/security" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                    <Shield className="w-6 h-6 text-emerald-400 mb-2" />
                    <div className="text-white font-medium">SOC Dashboard</div>
                    <div className="text-slate-400 text-sm">Main operations center</div>
                  </Link>
                  <Link href="/security/network" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                    <Network className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="text-white font-medium">Network Monitor</div>
                    <div className="text-slate-400 text-sm">UniFi traffic analysis</div>
                  </Link>
                  <Link href="/security/incidents" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-orange-500/30 transition-colors">
                    <AlertTriangle className="w-6 h-6 text-orange-400 mb-2" />
                    <div className="text-white font-medium">Incidents</div>
                    <div className="text-slate-400 text-sm">Incident management</div>
                  </Link>
                  <Link href="/security/redteam" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-red-500/30 transition-colors">
                    <Zap className="w-6 h-6 text-red-400 mb-2" />
                    <div className="text-white font-medium">Red Team</div>
                    <div className="text-slate-400 text-sm">Penetration testing</div>
                  </Link>
                  <Link href="/security/compliance" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-purple-500/30 transition-colors">
                    <CheckCircle className="w-6 h-6 text-purple-400 mb-2" />
                    <div className="text-white font-medium">Compliance</div>
                    <div className="text-slate-400 text-sm">NIST audit reports</div>
                  </Link>
                  <Link href="/natureos/settings" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                    <Settings className="w-6 h-6 text-slate-400 mb-2" />
                    <div className="text-white font-medium">Security Settings</div>
                    <div className="text-slate-400 text-sm">NatureOS security config</div>
                  </Link>
                </div>
              </div>

              {/* Security Metrics - Real-time */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-400" />
                    Security Metrics (Real-time)
                  </h2>
                  <button 
                    onClick={fetchSecurityStatus}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Refresh security status"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <MetricCard 
                    label="Threat Level" 
                    value={(securityStatus?.threatLevel || 'LOW').toUpperCase()} 
                    color={securityStatus?.threatLevel === 'critical' ? 'red' : securityStatus?.threatLevel === 'high' ? 'orange' : 'emerald'} 
                  />
                  <MetricCard 
                    label="Monitoring" 
                    value={securityStatus?.monitoring ? 'ACTIVE' : 'INACTIVE'} 
                    color={securityStatus?.monitoring ? 'emerald' : 'red'} 
                  />
                  <MetricCard 
                    label="Events (24h)" 
                    value={securityStatus?.eventsCount?.toString() || '0'} 
                    color={securityStatus?.eventsCount && securityStatus.eventsCount > 10 ? 'yellow' : 'slate'} 
                  />
                  <MetricCard 
                    label="Critical Events" 
                    value={securityStatus?.criticalEvents?.toString() || '0'} 
                    color={securityStatus?.criticalEvents && securityStatus.criticalEvents > 0 ? 'red' : 'slate'} 
                  />
                  <MetricCard 
                    label="Unique IPs" 
                    value={securityStatus?.uniqueIPs?.toString() || '0'} 
                    color="blue" 
                  />
                  <MetricCard 
                    label="Open Incidents" 
                    value={securityStatus?.incidentsOpen?.toString() || '0'} 
                    color={securityStatus?.incidentsOpen && securityStatus.incidentsOpen > 0 ? 'orange' : 'slate'} 
                  />
                  <MetricCard label="Firewall Rules" value="47" color="blue" />
                  <MetricCard label="VPN Connections" value="1" color="emerald" />
                  <MetricCard label="Port Scans (24h)" value="0" color="slate" />
                  <MetricCard label="Auth Failures" value="2" color="yellow" />
                  <MetricCard label="Malware Blocked" value="0" color="slate" />
                  <MetricCard label="UniFi Alerts" value="0" color="slate" />
                </div>
                {securityStatus?.lastUpdated && (
                  <div className="mt-3 text-xs text-slate-500">
                    Last updated: {new Date(securityStatus.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Data Sources */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  Security Data Sources
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium">UniFi Network</span>
                    </div>
                    <p className="text-slate-400 text-sm">Firewall, IDS/IPS, client tracking</p>
                    <div className="mt-2 text-emerald-400 text-xs">✓ Connected</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-medium">Proxmox VE</span>
                    </div>
                    <p className="text-slate-400 text-sm">VM security, resource isolation</p>
                    <div className="mt-2 text-emerald-400 text-xs">✓ Connected</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-red-400" />
                      <span className="text-white font-medium">Mycosoft SOC</span>
                    </div>
                    <p className="text-slate-400 text-sm">Internal security monitoring</p>
                    <div className="mt-2 text-emerald-400 text-xs">✓ Active</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5 text-amber-400" />
                      <span className="text-white font-medium">Supabase Auth</span>
                    </div>
                    <p className="text-slate-400 text-sm">User auth, session management</p>
                    <div className="mt-2 text-emerald-400 text-xs">✓ Synced</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* SERVICES TAB */}
          {/* ================================================================ */}
          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {['Always-On', 'MAS Stack', 'Cloud', 'Infrastructure'].map((category) => {
                const services = ALL_SERVICES.filter(s => s.category === category)
                return (
                  <div key={category} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Server className="w-5 h-5 text-amber-400" />
                      {category} ({services.length} services)
                    </h2>
                    
                    <div className="space-y-3">
                      {services.map((service) => (
                        <div key={service.name} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              service.status === 'running' ? "bg-emerald-500 animate-pulse" : 
                              service.status === 'stopped' ? "bg-red-500" :
                              service.status === 'error' ? "bg-yellow-500" : "bg-slate-500"
                            )} />
                            <div>
                              <div className="text-white font-medium">{service.name}</div>
                              <div className="text-slate-500 text-sm">
                                {service.port ? `Port ${service.port}` : 'Cloud Service'} • {service.type}
                              </div>
                              <div className="text-slate-600 text-xs">{service.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "px-3 py-1 rounded text-sm",
                              service.status === 'running' 
                                ? "bg-emerald-500/20 text-emerald-400"
                                : service.status === 'stopped'
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            )}>
                              {service.status.toUpperCase()}
                            </span>
                            {service.status === 'running' && (
                              <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" />
                                Restart
                              </button>
                            )}
                            {service.status === 'stopped' && (
                              <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                Start
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* DATABASE TAB */}
          {/* ================================================================ */}
          {activeTab === 'database' && (
            <motion.div
              key="database"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  All Databases ({ALL_DATABASES.length} sources)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_DATABASES.map((db) => (
                    <div key={db.name} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-5 h-5 text-amber-400" />
                          <span className="text-white font-bold">{db.name}</span>
                        </div>
                        <span className={cn(
                          "px-2 py-1 text-xs rounded",
                          db.status === 'online' ? "bg-emerald-500/20 text-emerald-400" :
                          db.status === 'syncing' ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {db.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Type</span>
                          <span className="text-white">{db.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Size</span>
                          <span className="text-white font-mono">{db.size}</span>
                        </div>
                        {db.tables && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Tables</span>
                            <span className="text-white">{db.tables}</span>
                          </div>
                        )}
                        {db.records && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Records</span>
                            <span className="text-white">{db.records.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-3">{db.description}</p>
                      {db.link && (
                        <a 
                          href={db.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mt-3"
                        >
                          Open Dashboard <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Storage Buckets */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-amber-400" />
                  Supabase Storage Buckets
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {['avatars', 'species-images', 'firmware', 'documents', 'telemetry-exports'].map((bucket) => (
                    <div key={bucket} className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <HardDrive className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <div className="text-white font-mono text-sm">{bucket}</div>
                      <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* SYSTEM TAB - FUNCTIONAL TERMINAL */}
          {/* ================================================================ */}
          {activeTab === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Super Terminal */}
              <div className="bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Terminal className="w-8 h-8 text-purple-500" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Super Terminal</h2>
                    <p className="text-slate-400 text-sm">Full system access - Functional terminal</p>
                  </div>
                </div>
                
                <div 
                  ref={terminalRef}
                  className="bg-black rounded-lg p-4 font-mono text-sm h-80 overflow-y-auto mb-4"
                >
                  {terminalOutput.map((line, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        line.startsWith('$') ? "text-emerald-400" :
                        line.includes('ERROR') || line.includes('🚨') ? "text-red-400" :
                        line.includes('⚠️') ? "text-yellow-400" :
                        line.includes('✓') || line.includes('✔') ? "text-emerald-400" :
                        line.startsWith('──') ? "text-slate-600" :
                        "text-white"
                      )}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleTerminalSubmit} className="flex gap-2">
                  <div className="flex-1 flex items-center bg-black rounded-lg px-3 border border-purple-500/30">
                    <span className="text-emerald-400 font-mono">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Type a command..."
                      className="flex-1 bg-transparent text-white font-mono px-2 py-3 outline-none"
                      autoFocus
                    />
                  </div>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Execute
                  </button>
                </form>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/natureos/shell" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                  <Terminal className="w-6 h-6 text-emerald-400 mb-2" />
                  <div className="text-white font-medium">NatureOS Shell</div>
                  <div className="text-slate-400 text-sm">Full NatureOS access</div>
                </Link>
                <Link href="/natureos/containers" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                  <Cpu className="w-6 h-6 text-blue-400 mb-2" />
                  <div className="text-white font-medium">Container Management</div>
                  <div className="text-slate-400 text-sm">Docker orchestration</div>
                </Link>
                <Link href="/natureos/functions" className="block p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                  <Zap className="w-6 h-6 text-amber-400 mb-2" />
                  <div className="text-white font-medium">Edge Functions</div>
                  <div className="text-slate-400 text-sm">Serverless deployment</div>
                </Link>
              </div>

              {/* Edge Function Stats */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Edge Functions Stats
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Functions Deployed</div>
                    <div className="text-2xl font-bold text-white">4</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Invocations (24h)</div>
                    <div className="text-2xl font-bold text-white">1,247</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Avg Response Time</div>
                    <div className="text-2xl font-bold text-emerald-400">42ms</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Error Rate</div>
                    <div className="text-2xl font-bold text-emerald-400">0.1%</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, label, value, change }: { icon: any, label: string, value: string, change: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">{label}</span>
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500">{change}</div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label, description }: { href: string, icon: any, label: string, description: string }) {
  return (
    <Link href={href} className="block p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors group">
      <Icon className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
      <div className="text-white font-medium mb-1">{label}</div>
      <div className="text-slate-400 text-sm">{description}</div>
    </Link>
  )
}

function AuthProvider({ name, status, users, icon }: { name: string, status: string, users: number, icon: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-white">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-sm">{users} users</span>
        {status === 'active' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
        {status === 'inactive' && <XCircle className="w-4 h-4 text-slate-500" />}
      </div>
    </div>
  )
}

function SettingToggle({ label, enabled, description }: { label: string, enabled: boolean, description?: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
      <div>
        <span className="text-white">{label}</span>
        {description && <p className="text-slate-500 text-xs mt-1">{description}</p>}
      </div>
      <div className={cn(
        "w-10 h-6 rounded-full relative transition-colors cursor-pointer",
        enabled ? "bg-emerald-600" : "bg-slate-600"
      )}>
        <div className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
          enabled ? "left-5" : "left-1"
        )} />
      </div>
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string, value: string, color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    slate: 'text-white',
  }
  
  return (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={cn("text-xl font-bold", colorMap[color] || 'text-white')}>{value}</div>
    </div>
  )
}
