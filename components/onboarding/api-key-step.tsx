'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubscriptionTier } from '@/lib/access/types'

type UserType = 'individual' | 'developer' | 'researcher' | 'organization'

interface ApiKeyStepProps {
  plan: SubscriptionTier
  userType?: UserType
  startupFeePaid?: boolean
  onComplete: () => void
}

export function ApiKeyStep({ plan, userType = 'individual', startupFeePaid = false, onComplete }: ApiKeyStepProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function onboard() {
      try {
        const res = await fetch('/api/beta/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, user_type: userType, startup_fee_paid: startupFeePaid }),
          credentials: 'include',
        })

        const data = await res.json().catch(() => ({}))
        if (cancelled) return

        if (!res.ok) {
          setError(data?.error || 'Failed to create API key')
          return
        }
        setApiKey(data.api_key ?? null)
        setError(null)
      } catch {
        if (!cancelled) setError('Network error')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    onboard()
    return () => { cancelled = true }
  }, [plan])

  const handleCopy = async () => {
    if (!apiKey) return
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <p className="text-white/80">Creating your API key...</p>
      </div>
    )
  }

  if (error || !apiKey) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'Could not create API key'}</span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-white/20 text-white font-medium hover:bg-white/30 transition-colors"
        >
          Try again
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Your API Key</h2>
        <p className="text-white/60 mt-1 text-sm">
          Save this key securely. It won&apos;t be shown again.
        </p>
      </div>

      <div className="rounded-xl bg-black/30 border border-white/20 p-4 font-mono text-sm text-white/90 break-all">
        {apiKey}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors min-h-[44px]",
          copied
            ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
            : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
        )}
      >
        {copied ? (
          <>
            <Check className="w-5 h-5" />
            Copied to clipboard
          </>
        ) : (
          <>
            <Copy className="w-5 h-5" />
            Copy API key
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onComplete}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all min-h-[44px]",
          "bg-white text-emerald-900 hover:bg-emerald-50"
        )}
      >
        Go to Dashboard
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  )
}
