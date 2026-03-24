'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabaseUser, useProfile } from '@/hooks/use-supabase-user'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Key,
  Wallet,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Unlock,
  Send,
  RotateCcw,
  Activity,
  DollarSign,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

interface TreasurySettings {
  [key: string]: {
    value: string
    updated_at: string | null
    updated_by: string | null
  }
}

interface TreasuryStatus {
  wallet_name: string
  balances: Record<string, number>
  total_received_24h: number
  total_transactions_24h: number
  active_wallets: number
  withdrawal_addresses: Record<string, string>
  treasury_fee_percent: number
  supported_chains: string[]
}

interface AuditEntry {
  id: number
  action: string
  success: boolean
  ip: string
  details: Record<string, unknown>
  timestamp: string | null
}

// ============================================================================
// MAS API HELPER
// ============================================================================

const MAS_API = process.env.NEXT_PUBLIC_MAS_API_URL || 'https://api.mycosoft.com'

async function masApi(path: string, opts: RequestInit = {}, treasuryKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }
  if (treasuryKey) {
    headers['X-Treasury-Key'] = treasuryKey
  }
  const res = await fetch(`${MAS_API}${path}`, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TreasuryAdminPage() {
  const { user, loading: userLoading } = useSupabaseUser()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()

  // Auth state
  const isSuperAdmin = profile?.role === 'super_admin' && user?.email === 'morgan@mycosoft.org'

  // Treasury key (stored in session only — never persisted to localStorage)
  const [treasuryKey, setTreasuryKey] = useState('')
  const [keyUnlocked, setKeyUnlocked] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Init key state
  const [initKey, setInitKey] = useState('')
  const [confirmInitKey, setConfirmInitKey] = useState('')
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null)

  // Treasury data
  const [status, setStatus] = useState<TreasuryStatus | null>(null)
  const [settings, setSettings] = useState<TreasurySettings | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Address editing
  const [editAddresses, setEditAddresses] = useState({
    solana: '',
    ethereum: '',
    bitcoin: '',
  })
  const [feePercent, setFeePercent] = useState('5.0')

  // Active tab
  const [tab, setTab] = useState<'overview' | 'addresses' | 'key' | 'audit'>('overview')

  // ========================================================================
  // AUTH CHECK
  // ========================================================================

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) {
        router.push('/login?redirectTo=/admin/treasury')
        return
      }
      if (!isSuperAdmin) {
        router.push('/admin')
        return
      }
    }
  }, [user, profile, userLoading, profileLoading, isSuperAdmin, router])

  // ========================================================================
  // CHECK IF CEO KEY IS CONFIGURED
  // ========================================================================

  useEffect(() => {
    if (!isSuperAdmin) return
    // Try to hit treasury health to see if system is up
    masApi('/api/wallet/ows/health')
      .then(() => setKeyConfigured(true))
      .catch(() => setKeyConfigured(false))
  }, [isSuperAdmin])

  // ========================================================================
  // DATA LOADERS
  // ========================================================================

  const loadTreasuryStatus = useCallback(async () => {
    try {
      const data = await masApi('/api/wallet/ows/treasury')
      setStatus(data)
    } catch (e) {
      console.error('Failed to load treasury status:', e)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    if (!treasuryKey) return
    try {
      const data = await masApi('/api/wallet/ows/treasury/settings', {}, treasuryKey)
      setSettings(data.settings)
      // Pre-fill edit fields
      const s = data.settings
      setEditAddresses({
        solana: s?.withdrawal_address_solana?.value || '',
        ethereum: s?.withdrawal_address_ethereum?.value || '',
        bitcoin: s?.withdrawal_address_bitcoin?.value || '',
      })
      setFeePercent(s?.treasury_fee_percent?.value || '5.0')
    } catch (e: any) {
      toast.error(e.message || 'Failed to load settings')
    }
  }, [treasuryKey])

  const loadAudit = useCallback(async () => {
    if (!treasuryKey) return
    try {
      const data = await masApi('/api/wallet/ows/treasury/audit?limit=30', {}, treasuryKey)
      setAudit(data.audit_entries || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load audit log')
    }
  }, [treasuryKey])

  // Load public treasury status on mount
  useEffect(() => {
    if (isSuperAdmin) loadTreasuryStatus()
  }, [isSuperAdmin, loadTreasuryStatus])

  // Load protected data when key is unlocked
  useEffect(() => {
    if (keyUnlocked && treasuryKey) {
      loadSettings()
      loadAudit()
    }
  }, [keyUnlocked, treasuryKey, loadSettings, loadAudit])

  // ========================================================================
  // ACTIONS
  // ========================================================================

  const handleUnlock = async () => {
    if (!treasuryKey.trim()) {
      toast.error('Enter your treasury key')
      return
    }
    setLoading(true)
    try {
      await masApi('/api/wallet/ows/treasury/settings', {}, treasuryKey)
      setKeyUnlocked(true)
      toast.success('Treasury unlocked')
    } catch (e: any) {
      toast.error(e.message || 'Invalid key')
      setKeyUnlocked(false)
    }
    setLoading(false)
  }

  const handleInitKey = async () => {
    if (initKey.length < 16) {
      toast.error('Key must be at least 16 characters')
      return
    }
    if (initKey !== confirmInitKey) {
      toast.error('Keys do not match')
      return
    }
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (treasuryKey) headers['X-Treasury-Key'] = treasuryKey
      await masApi('/api/wallet/ows/treasury/init-auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({ master_key: initKey }),
      })
      toast.success('CEO master key configured. Store it securely!')
      setTreasuryKey(initKey)
      setKeyUnlocked(true)
      setKeyConfigured(true)
      setInitKey('')
      setConfirmInitKey('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to set key')
    }
    setLoading(false)
  }

  const handleSaveAddresses = async () => {
    if (!treasuryKey) return
    setLoading(true)
    try {
      const body: Record<string, string | number> = {}
      if (editAddresses.solana) body.withdrawal_address_solana = editAddresses.solana
      if (editAddresses.ethereum) body.withdrawal_address_ethereum = editAddresses.ethereum
      if (editAddresses.bitcoin) body.withdrawal_address_bitcoin = editAddresses.bitcoin
      if (feePercent) body.treasury_fee_percent = parseFloat(feePercent)

      const result = await masApi('/api/wallet/ows/treasury/settings', {
        method: 'PUT',
        body: JSON.stringify(body),
      }, treasuryKey)

      toast.success(result.address_change_note || 'Settings updated')
      await loadSettings()
    } catch (e: any) {
      toast.error(e.message || 'Update failed')
    }
    setLoading(false)
  }

  const handleConfirmAddresses = async () => {
    if (!treasuryKey) return
    setLoading(true)
    try {
      const result = await masApi('/api/wallet/ows/treasury/settings/confirm', {
        method: 'POST',
      }, treasuryKey)
      toast.success(result.status === 'confirmed' ? 'Addresses confirmed and active!' : result.message)
      await loadSettings()
      await loadTreasuryStatus()
    } catch (e: any) {
      toast.error(e.message || 'Confirm failed')
    }
    setLoading(false)
  }

  const handleCancelPending = async () => {
    if (!treasuryKey) return
    setLoading(true)
    try {
      await masApi('/api/wallet/ows/treasury/settings/cancel', {
        method: 'POST',
      }, treasuryKey)
      toast.success('Pending address change cancelled')
      await loadSettings()
    } catch (e: any) {
      toast.error(e.message || 'Cancel failed')
    }
    setLoading(false)
  }

  const handleSweep = async () => {
    if (!treasuryKey) return
    if (!confirm('Sweep all treasury funds to your confirmed withdrawal addresses?')) return
    setLoading(true)
    try {
      const result = await masApi('/api/wallet/ows/treasury/sweep', {
        method: 'POST',
      }, treasuryKey)
      if (result.sweeps) {
        toast.success(`Swept ${result.sweeps.length} chain(s)`)
      } else {
        toast.info(result.message || 'Nothing to sweep')
      }
      await loadTreasuryStatus()
    } catch (e: any) {
      toast.error(e.message || 'Sweep failed')
    }
    setLoading(false)
  }

  const handleRotateKey = async () => {
    if (!treasuryKey || !initKey || initKey.length < 16) {
      toast.error('Enter current key and new key (16+ chars)')
      return
    }
    if (initKey !== confirmInitKey) {
      toast.error('New keys do not match')
      return
    }
    setLoading(true)
    try {
      await masApi('/api/wallet/ows/treasury/init-auth', {
        method: 'POST',
        headers: { 'X-Treasury-Key': treasuryKey },
        body: JSON.stringify({ master_key: initKey }),
      })
      toast.success('Key rotated. Use your new key from now on.')
      setTreasuryKey(initKey)
      setInitKey('')
      setConfirmInitKey('')
    } catch (e: any) {
      toast.error(e.message || 'Rotation failed')
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  // ========================================================================
  // LOADING / AUTH GATE
  // ========================================================================

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A1929] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdmin) return null

  // ========================================================================
  // RENDER
  // ========================================================================

  const hasPending = settings?.pending_address_expires_at?.value && settings.pending_address_expires_at.value !== ''
  const sweepLocked = settings?.sweep_locked?.value === 'true'

  return (
    <div className="min-h-screen bg-[#0A1929] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0A1929]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold">Treasury Settings</h1>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">CEO ONLY</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {keyUnlocked ? (
              <span className="flex items-center gap-1 text-green-400"><Unlock className="w-4 h-4" /> Unlocked</span>
            ) : (
              <span className="flex items-center gap-1 text-red-400"><Lock className="w-4 h-4" /> Locked</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Key not configured — first time setup */}
        {keyConfigured === false && !keyUnlocked && (
          <div className="bg-gray-900/50 border border-amber-500/30 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-amber-400">First Time Setup — Set Your CEO Master Key</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              This key protects all treasury operations. Store it securely — it cannot be recovered from the system.
            </p>
            <div className="space-y-3 max-w-md">
              <input
                type="password"
                value={initKey}
                onChange={(e) => setInitKey(e.target.value)}
                placeholder="Master key (16+ characters)"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <input
                type="password"
                value={confirmInitKey}
                onChange={(e) => setConfirmInitKey(e.target.value)}
                placeholder="Confirm master key"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={handleInitKey}
                disabled={loading || initKey.length < 16 || initKey !== confirmInitKey}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black px-4 py-2 rounded text-sm font-medium"
              >
                {loading ? 'Setting...' : 'Set Master Key'}
              </button>
            </div>
          </div>
        )}

        {/* Unlock panel */}
        {keyConfigured !== false && !keyUnlocked && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Unlock Treasury</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">Enter your CEO master key to access treasury settings.</p>
            <div className="flex gap-3 max-w-md">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={treasuryKey}
                  onChange={(e) => setTreasuryKey(e.target.value)}
                  placeholder="CEO master key"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-2 text-gray-500">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleUnlock}
                disabled={loading || !treasuryKey.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
              >
                {loading ? 'Verifying...' : 'Unlock'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {keyUnlocked && (
          <>
            <div className="flex gap-1 mb-6 border-b border-gray-800">
              {(['overview', 'addresses', 'key', 'audit'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors',
                    tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                  )}
                >
                  {t === 'key' ? 'Key Management' : t}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {tab === 'overview' && status && (
              <div className="space-y-6">
                {/* Balance cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(status.balances || {}).map(([currency, balance]) => (
                    <div key={currency} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">{currency}</div>
                      <div className="text-2xl font-bold text-white">{Number(balance).toFixed(4)}</div>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-green-400" /><span className="text-xs text-gray-400">24h Revenue</span></div>
                    <div className="text-xl font-bold">{status.total_received_24h?.toFixed(4) || '0'}</div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-400">24h Transactions</span></div>
                    <div className="text-xl font-bold">{status.total_transactions_24h || 0}</div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-purple-400" /><span className="text-xs text-gray-400">Active Wallets</span></div>
                    <div className="text-xl font-bold">{status.active_wallets || 0}</div>
                  </div>
                </div>

                {/* Confirmed withdrawal addresses */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-green-400" /> Confirmed Withdrawal Addresses
                  </h3>
                  {Object.entries(status.withdrawal_addresses || {}).length === 0 ? (
                    <p className="text-sm text-gray-500">No withdrawal addresses configured. Go to Addresses tab to set them.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(status.withdrawal_addresses).map(([chain, addr]) => (
                        <div key={chain} className="flex items-center justify-between bg-gray-800/50 rounded px-3 py-2">
                          <span className="text-sm font-medium capitalize">{chain}</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-300 font-mono">{addr.slice(0, 8)}...{addr.slice(-6)}</code>
                            <button onClick={() => copyToClipboard(addr)} className="text-gray-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sweep button */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSweep}
                    disabled={loading || sweepLocked}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Sweep Funds to My Addresses
                  </button>
                  {sweepLocked && (
                    <span className="flex items-center gap-1 text-sm text-amber-400">
                      <Lock className="w-4 h-4" /> Sweep locked — pending address change
                    </span>
                  )}
                  <button onClick={() => { loadTreasuryStatus(); loadSettings(); loadAudit() }} className="text-gray-400 hover:text-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ADDRESSES TAB */}
            {tab === 'addresses' && (
              <div className="space-y-6">
                {/* Pending alert */}
                {hasPending && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-amber-400">Address Change Pending</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      Cooldown expires: {settings?.pending_address_expires_at?.value}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleConfirmAddresses} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Confirm Addresses
                      </button>
                      <button onClick={handleCancelPending} disabled={loading} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded text-sm flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Cancel Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Address inputs */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-4">Withdrawal Addresses</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    These are YOUR wallet addresses where funds get sent on sweep. Changes enter a 24h cooldown.
                  </p>
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Solana (SOL/USDC)</label>
                      <input
                        type="text"
                        value={editAddresses.solana}
                        onChange={(e) => setEditAddresses(a => ({ ...a, solana: e.target.value }))}
                        placeholder="Your Solana wallet address (e.g. Phantom)"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Ethereum (ETH/USDC)</label>
                      <input
                        type="text"
                        value={editAddresses.ethereum}
                        onChange={(e) => setEditAddresses(a => ({ ...a, ethereum: e.target.value }))}
                        placeholder="Your Ethereum address (0x...)"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Bitcoin (BTC)</label>
                      <input
                        type="text"
                        value={editAddresses.bitcoin}
                        onChange={(e) => setEditAddresses(a => ({ ...a, bitcoin: e.target.value }))}
                        placeholder="Your Bitcoin address (bc1...)"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Treasury Fee %</label>
                      <input
                        type="number"
                        value={feePercent}
                        onChange={(e) => setFeePercent(e.target.value)}
                        min="0"
                        max="50"
                        step="0.1"
                        className="w-32 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveAddresses}
                    disabled={loading}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium"
                  >
                    {loading ? 'Saving...' : 'Save Changes (24h cooldown for addresses)'}
                  </button>
                </div>

                {/* Current confirmed vs pending */}
                {settings && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-3">Address Status</h3>
                    <div className="space-y-2 text-sm">
                      {['solana', 'ethereum', 'bitcoin'].map(chain => {
                        const confirmed = settings[`withdrawal_address_${chain}`]?.value || ''
                        const pending = settings[`pending_address_${chain}`]?.value || ''
                        return (
                          <div key={chain} className="flex items-center gap-4">
                            <span className="w-20 font-medium capitalize">{chain}</span>
                            <div className="flex-1">
                              {confirmed ? (
                                <span className="text-green-400 font-mono text-xs flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> {confirmed.slice(0, 12)}...{confirmed.slice(-6)}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-xs">Not set</span>
                              )}
                            </div>
                            {pending && (
                              <span className="text-amber-400 font-mono text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending: {pending.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KEY MANAGEMENT TAB */}
            {tab === 'key' && (
              <div className="space-y-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-blue-400" /> Rotate CEO Master Key
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Your current key is already entered (used to unlock). Enter a new key below to rotate.
                  </p>
                  <div className="space-y-3 max-w-md">
                    <input
                      type="password"
                      value={initKey}
                      onChange={(e) => setInitKey(e.target.value)}
                      placeholder="New master key (16+ characters)"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="password"
                      value={confirmInitKey}
                      onChange={(e) => setConfirmInitKey(e.target.value)}
                      placeholder="Confirm new master key"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={handleRotateKey}
                      disabled={loading || initKey.length < 16 || initKey !== confirmInitKey}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black px-4 py-2 rounded text-sm font-medium"
                    >
                      {loading ? 'Rotating...' : 'Rotate Key'}
                    </button>
                  </div>
                </div>

                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    If you lose your master key, you will need direct database access to reset it. There is no recovery flow.
                  </p>
                </div>
              </div>
            )}

            {/* AUDIT TAB */}
            {tab === 'audit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Treasury Access Log</h3>
                  <button onClick={loadAudit} className="text-gray-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left">
                        <th className="px-4 py-2 text-gray-400 font-medium">Time</th>
                        <th className="px-4 py-2 text-gray-400 font-medium">Action</th>
                        <th className="px-4 py-2 text-gray-400 font-medium">Status</th>
                        <th className="px-4 py-2 text-gray-400 font-medium">IP</th>
                        <th className="px-4 py-2 text-gray-400 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map(entry => (
                        <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-4 py-2 text-xs text-gray-400 font-mono">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono">{entry.action}</td>
                          <td className="px-4 py-2">
                            {entry.success ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-400 font-mono">{entry.ip}</td>
                          <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                            {JSON.stringify(entry.details).slice(0, 80)}
                          </td>
                        </tr>
                      ))}
                      {audit.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit entries yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
