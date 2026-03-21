"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign, CreditCard, Loader2, RefreshCw, Users,
  TrendingUp, ExternalLink, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"

interface BillingData {
  mrr: number
  activeUsers: number
  apiCalls: number
  subscribers: {
    free: number
    pro: number
    enterprise: number
  }
  recentPayments: Array<{
    id: string
    amount: number
    email: string
    plan: string
    date: string
    status: string
  }>
  stripeConnected: boolean
}

export function BillingModule() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mrrRes, billingRes] = await Promise.allSettled([
        fetch("/api/billing/mrr"),
        fetch("/api/billing"),
      ])

      const mrr = mrrRes.status === "fulfilled" && mrrRes.value.ok ? await mrrRes.value.json() : null
      const billing = billingRes.status === "fulfilled" && billingRes.value.ok ? await billingRes.value.json() : null

      setData({
        mrr: mrr?.mrr ?? 0,
        activeUsers: mrr?.active_users ?? 0,
        apiCalls: mrr?.api_calls ?? 0,
        subscribers: billing?.subscribers ?? { free: 0, pro: 0, enterprise: 0 },
        recentPayments: billing?.recentPayments ?? [],
        stripeConnected: billing?.stripeConnected ?? false,
      })
    } catch {
      toast.error("Failed to load billing data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Billing & Revenue</h2>
          <p className="text-slate-400 text-sm">{format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          {data?.stripeConnected && (
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Stripe
            </a>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-amber-400" />
              <div>
                <div className="text-2xl font-bold text-amber-400">${data?.mrr ?? 0}</div>
                <div className="text-sm text-slate-400">Monthly Recurring Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-blue-400">{data?.activeUsers ?? 0}</div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-emerald-400">{data?.apiCalls ?? 0}</div>
                <div className="text-sm text-slate-400">API Calls</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriber Distribution */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Subscriber Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-300">{data?.subscribers.free ?? 0}</div>
              <div className="text-sm text-slate-500">Free</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{data?.subscribers.pro ?? 0}</div>
              <div className="text-sm text-slate-500">Pro</div>
            </div>
            <div className="text-center p-4 bg-purple-500/10 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{data?.subscribers.enterprise ?? 0}</div>
              <div className="text-sm text-slate-500">Enterprise</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {(!data?.recentPayments || data.recentPayments.length === 0) ? (
            <div className="text-sm text-slate-500">No recent payments</div>
          ) : (
            <div className="space-y-2">
              {data.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <div className="text-sm text-white">{payment.email}</div>
                    <div className="text-xs text-slate-500">{payment.plan} · {new Date(payment.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-400">${(payment.amount / 100).toFixed(2)}</span>
                    <Badge className={cn("text-xs",
                      payment.status === "succeeded" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                    )}>{payment.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
