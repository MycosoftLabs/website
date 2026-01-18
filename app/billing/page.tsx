'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  Settings, 
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import Link from 'next/link'

interface BillingData {
  subscription: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trialEnd: string | null
  } | null
  tier: string
  plan: {
    name: string
    price: { monthly: number; annual: number }
    features: string[]
    limits: Record<string, number>
  }
  invoices: Array<{
    id: string
    number: string
    amount: number
    currency: string
    status: string
    created: string
    pdfUrl: string | null
    hostedUrl: string | null
  }>
  upcomingInvoice: {
    amount: number
    currency: string
    dueDate: string | null
  } | null
}

interface UsageData {
  tier: string
  usage: Array<{
    type: string
    name: string
    used: number
    limit: number
    unlimited: boolean
    percentUsed: number
  }>
  billingPeriod: {
    start: string
    end: string
  }
}

export default function BillingPage() {
  const { user, loading: userLoading } = useSupabaseUser()
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  
  useEffect(() => {
    if (user) {
      fetchBillingData()
      fetchUsageData()
    }
  }, [user])
  
  async function fetchBillingData() {
    try {
      const res = await fetch('/api/billing')
      if (res.ok) {
        const data = await res.json()
        setBilling(data)
      }
    } catch (error) {
      console.error('Failed to fetch billing:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function fetchUsageData() {
    try {
      const res = await fetch('/api/usage/track')
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }
  
  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      }
    } catch (error) {
      console.error('Failed to open portal:', error)
    } finally {
      setPortalLoading(false)
    }
  }
  
  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your billing information.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'trialing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'past_due':
      case 'unpaid':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'canceled':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto py-10 px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Billing & Usage</h1>
              <p className="text-slate-400 mt-1">Manage your subscription and view usage</p>
            </div>
            <Button onClick={openPortal} disabled={portalLoading || !billing?.subscription}>
              <Settings className="mr-2 h-4 w-4" />
              {portalLoading ? 'Opening...' : 'Manage Subscription'}
            </Button>
          </div>
          
          {/* Current Plan Card */}
          <Card className="mb-8 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-white flex items-center gap-2">
                    {billing?.plan.name || 'Free'} Plan
                    {billing?.subscription?.status === 'trialing' && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
                        Trial
                      </Badge>
                    )}
                    {billing?.subscription?.cancelAtPeriodEnd && (
                      <Badge variant="secondary" className="bg-red-500/10 text-red-400">
                        Canceling
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {billing?.subscription
                      ? `Renews on ${formatDate(billing.subscription.currentPeriodEnd)}`
                      : 'Free forever • Upgrade anytime'}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    ${billing?.plan.price.monthly || 0}
                    <span className="text-lg text-slate-400">/mo</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {billing?.subscription?.trialEnd && new Date(billing.subscription.trialEnd) > new Date() && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Clock className="h-5 w-5" />
                    <span>Trial ends on {formatDate(billing.subscription.trialEnd)}</span>
                  </div>
                </div>
              )}
              {!billing?.subscription && (
                <Link href="/pricing">
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
                    <Zap className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
          
          <Tabs defaultValue="usage" className="space-y-6">
            <TabsList className="bg-slate-800/50">
              <TabsTrigger value="usage">
                <TrendingUp className="mr-2 h-4 w-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="invoices">
                <Receipt className="mr-2 h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="payment">
                <CreditCard className="mr-2 h-4 w-4" />
                Payment Method
              </TabsTrigger>
            </TabsList>
            
            {/* Usage Tab */}
            <TabsContent value="usage" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {usage?.usage.map((item) => (
                  <Card key={item.type} className="bg-slate-900/50 border-slate-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white">{item.name}</CardTitle>
                      <CardDescription>
                        {item.unlimited ? 'Unlimited usage' : `${item.used.toLocaleString()} / ${item.limit.toLocaleString()}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!item.unlimited && (
                        <>
                          <Progress 
                            value={item.percentUsed} 
                            className={`h-2 ${item.percentUsed > 80 ? '[&>div]:bg-red-500' : item.percentUsed > 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-emerald-500'}`}
                          />
                          <p className="text-xs text-slate-400 mt-2">
                            {100 - item.percentUsed}% remaining this month
                          </p>
                        </>
                      )}
                      {item.unlimited && (
                        <div className="flex items-center text-emerald-400">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Unlimited
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {usage && (
                <p className="text-sm text-slate-400 text-center">
                  Billing period: {formatDate(usage.billingPeriod.start)} - {formatDate(usage.billingPeriod.end)}
                </p>
              )}
            </TabsContent>
            
            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Invoice History</CardTitle>
                  <CardDescription>Download or view your past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {billing?.invoices && billing.invoices.length > 0 ? (
                    <div className="space-y-4">
                      {billing.invoices.map((invoice) => (
                        <div 
                          key={invoice.id}
                          className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Receipt className="h-8 w-8 text-slate-400" />
                            <div>
                              <p className="font-medium text-white">
                                Invoice #{invoice.number}
                              </p>
                              <p className="text-sm text-slate-400">
                                {formatDate(invoice.created)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-medium text-white">
                                {formatCurrency(invoice.amount, invoice.currency)}
                              </p>
                              <Badge className={getStatusColor(invoice.status)}>
                                {invoice.status}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              {invoice.pdfUrl && (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {invoice.hostedUrl && (
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No invoices yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {billing?.upcomingInvoice && (
                <Card className="mt-4 bg-blue-900/10 border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-400" />
                      Upcoming Invoice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(billing.upcomingInvoice.amount, billing.upcomingInvoice.currency)}
                        </p>
                        {billing.upcomingInvoice.dueDate && (
                          <p className="text-slate-400">
                            Due on {formatDate(billing.upcomingInvoice.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Payment Method Tab */}
            <TabsContent value="payment">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Payment Method</CardTitle>
                  <CardDescription>Manage your payment methods in the customer portal</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={openPortal} disabled={portalLoading}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {portalLoading ? 'Opening...' : 'Manage Payment Methods'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
