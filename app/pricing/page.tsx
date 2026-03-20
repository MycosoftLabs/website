'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  ArrowRight,
  Shield,
  Database,
  Brain,
  Microscope,
  Globe2,
  Cpu,
  Loader2,
  Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import {
  BASIC_ACTIVATION_USD,
  BASIC_PREPAID_BUNDLE_USD,
  BASIC_INCLUDED_TOKENS_DISPLAY,
  PRO_MONTHLY_USD,
  PRO_ANNUAL_TOTAL_USD,
  PRO_ANNUAL_MONTHLY_EQUIV_USD,
  PRO_ANNUAL_SAVINGS_PERCENT,
  ENTERPRISE_MONTHLY_USD,
  ENTERPRISE_ANNUAL_TOTAL_USD,
  ENTERPRISE_ANNUAL_MONTHLY_EQUIV_USD,
  ENTERPRISE_ANNUAL_SAVINGS_PERCENT,
} from '@/lib/pricing/public-pricing'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: { monthly: null as number | null, annual: null as number | null },
    description: 'Activation plus prepaid usage for search and API',
    icon: Sparkles,
    color: 'emerald',
    features: [
      { name: 'Species & organism database access', limit: 'included', included: true },
      { name: 'Basic search', included: true },
      { name: 'Weather & environmental data', included: true },
      { name: 'Mobile & dashboard access', included: true },
      { name: `Token/world-state bundle (≈${(BASIC_INCLUDED_TOKENS_DISPLAY / 1_000_000).toFixed(0)}M tokens)`, included: true },
      { name: 'Worldview / world-state API', included: false },
      { name: 'Priority support', included: false },
    ],
    cta: 'Get started',
    href: '/onboarding',
    activationUsd: BASIC_ACTIVATION_USD,
    prepaidUsd: BASIC_PREPAID_BUNDLE_USD,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: PRO_MONTHLY_USD, annual: PRO_ANNUAL_MONTHLY_EQUIV_USD },
    description: 'For professionals and teams',
    icon: Zap,
    color: 'violet',
    popular: true,
    features: [
      { name: 'Everything in Basic', included: true },
      { name: 'MYCA AI Assistant', included: true },
      { name: 'Data export', included: true },
      { name: 'API access', limit: '10K/mo', included: true },
      { name: 'CREP Dashboard', included: true },
      { name: 'Priority support', included: true },
    ],
    cta: 'Start Pro',
    href: '/onboarding?plan=pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: ENTERPRISE_MONTHLY_USD, annual: ENTERPRISE_ANNUAL_MONTHLY_EQUIV_USD },
    description: 'For teams and organizations',
    icon: Building2,
    color: 'amber',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'SOC Dashboard', included: true },
      { name: 'Team management', included: true },
      { name: 'Unlimited API', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'White-label options', included: true },
      { name: 'On-premise deploy', included: true },
      { name: 'Custom training', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact?plan=enterprise',
  },
]

const CAPABILITIES = [
  {
    icon: Database,
    title: 'Organism & biosphere data',
    description: 'Access to biological organism and biosphere-wide knowledge',
  },
  {
    icon: Brain,
    title: 'Dual AI system',
    description: 'Human-fed and nature-fed data with grounded world-state intelligence',
  },
  {
    icon: Microscope,
    title: 'Scientific data',
    description: 'Physics, chemistry, biology, and environmental information',
  },
  {
    icon: Globe2,
    title: 'Global coverage',
    description: 'Real-time data and world-state from around the world',
  },
  {
    icon: Cpu,
    title: 'Device-agnostic monitoring',
    description: 'Connect sensors, instruments, and environmental endpoints',
  },
  {
    icon: Shield,
    title: 'Secure & auditable',
    description: 'Security-first architecture, authenticated and metered access',
  },
]

export default function PricingPage() {
  const { user } = useSupabaseUser()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  
  async function handleCheckout(planId: string) {
    if (planId === 'basic') {
      window.location.href = '/onboarding'
      return
    }
    
    if (planId === 'enterprise') {
      window.location.href = '/contact?plan=enterprise'
      return
    }
    
    if (!user) {
      window.location.href = `/login?redirect=/pricing&plan=${planId}`
      return
    }
    
    setCheckingOut(planId)
    
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          planId: planId.toUpperCase(),
          billingPeriod: billingCycle,
        }),
      })
      
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        const error = await res.json()
        alert(error.error || 'Checkout failed')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(null)
    }
  }
  
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      {/* Hero */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full text-emerald-600 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Transparent pricing
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold"
          >
            Simple, transparent pricing
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Choose the plan that fits your needs. Human plans include search, organism data, 
            and continuity; agent access requires a one-time connection fee and paid usage.
          </motion.p>
          
          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 pt-4"
          >
            <span className={cn("font-medium transition-colors", billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className={cn(
                "relative w-14 h-7 rounded-full transition-colors min-h-[44px] flex items-center",
                billingCycle === 'annual' ? 'bg-emerald-500' : 'bg-muted'
              )}
            >
              <motion.div
                layout
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                style={{ left: billingCycle === 'monthly' ? '4px' : 'calc(100% - 24px)' }}
              />
            </button>
            <span className={cn("font-medium transition-colors", billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground')}>
              Annual
              <span className="ml-2 text-emerald-500 text-sm font-semibold">Save 30%</span>
            </span>
          </motion.div>
        </div>
      </section>
      
      {/* Plans */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLANS.map((plan, index) => {
            const price = billingCycle === 'annual' ? plan.price.annual : plan.price.monthly
            const IconComponent = plan.icon
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={cn(
                  "relative rounded-3xl border p-8",
                  plan.popular 
                    ? "bg-gradient-to-b from-violet-500/10 to-background border-violet-500/50 shadow-xl shadow-violet-500/10" 
                    : "bg-card"
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full text-sm font-semibold text-white shadow-lg">
                    Most Popular
                  </div>
                )}
                
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    plan.color === 'emerald' && 'bg-emerald-500/20',
                    plan.color === 'violet' && 'bg-violet-500/20',
                    plan.color === 'amber' && 'bg-amber-500/20'
                  )}>
                    <IconComponent className={cn(
                      "w-6 h-6",
                      plan.color === 'emerald' && 'text-emerald-500',
                      plan.color === 'violet' && 'text-violet-500',
                      plan.color === 'amber' && 'text-amber-500'
                    )} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                
                {/* Price */}
                <div className="mb-6">
                  {plan.id === 'basic' ? (
                    <>
                      <span className="text-2xl sm:text-4xl font-bold">${(plan as { activationUsd: number }).activationUsd} activation</span>
                      <span className="text-muted-foreground"> + </span>
                      <span className="text-2xl sm:text-4xl font-bold">${(plan as { prepaidUsd: number }).prepaidUsd} prepaid</span>
                      <p className="text-sm text-muted-foreground mt-1">One-time activation, then $10 token/world-state bundle</p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl sm:text-5xl font-bold">${billingCycle === 'annual' ? (plan.id === 'pro' ? PRO_ANNUAL_MONTHLY_EQUIV_USD : ENTERPRISE_ANNUAL_MONTHLY_EQUIV_USD) : price}</span>
                      <span className="text-muted-foreground">/month</span>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Billed annually (${plan.id === 'pro' ? PRO_ANNUAL_TOTAL_USD : ENTERPRISE_ANNUAL_TOTAL_USD}/year)
                        </p>
                      )}
                    </>
                  )}
                </div>
                
                {/* CTA */}
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={checkingOut === plan.id}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all mb-8 disabled:opacity-50",
                    plan.popular
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {checkingOut === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                
                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature.name} className="flex items-center gap-3">
                      {feature.included ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <X className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className={cn(
                        "text-sm",
                        !feature.included && "text-muted-foreground"
                      )}>
                        {feature.name}
                        {'limit' in feature && feature.limit && (
                          <span className="ml-1 text-muted-foreground">({feature.limit})</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Agent Access — MYCA/AVANI live worldstate */}
        <div id="agent" className="max-w-2xl mx-auto mt-12 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-background p-8"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Key className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Agent Access — MYCA & Avani Live World State</h3>
                <p className="text-sm text-muted-foreground">
                  Every agent must pay a one-time $1 connection fee to connect to MYCA and Avani Live World State. Worldview and world-state API access are paid and metered; there is no free agent onboarding.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-2xl font-bold">$1</span>
                <span className="text-muted-foreground"> one-time connection fee</span>
              </div>
              <button
                onClick={async () => {
                  setCheckingOut('agent_worldstate')
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'agent_worldstate', minutes: 1 }),
                    })
                    if (res.ok) {
                      const { url } = await res.json()
                      if (url) window.location.href = url
                      else alert('Checkout URL missing. Configure Stripe for agent connection fee.')
                    } else {
                      const err = await res.json().catch(() => ({}))
                      alert(err.error || 'Checkout failed')
                    }
                  } catch (e) {
                    console.error(e)
                    alert('Checkout failed. Please try again.')
                  } finally {
                    setCheckingOut(null)
                  }
                }}
                disabled={checkingOut === 'agent_worldstate'}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {checkingOut === 'agent_worldstate' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay connection fee
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Capabilities */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              All plans include access to our core platform capabilities. 
              Upgrade for additional features and higher limits.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap, index) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-card border"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <cap.icon className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold mb-2">{cap.title}</h3>
                <p className="text-sm text-muted-foreground">{cap.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes. You can cancel anytime with no cancellation fees. Your access continues until the end of your billing period.'
              },
              {
                q: 'Can I upgrade or downgrade my plan?',
                a: 'Yes. You can change your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, you\'ll receive a credit for your next billing cycle.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept USDC, Solana, Bitcoin, Ethereum, USDT, Visa, Mastercard, American Express, and PayPal.'
              },
              {
                q: 'How does agent access work?',
                a: 'Every agent must pay a one-time $1 connection fee to connect to MYCA and Avani Live World State. Worldview and world-state API access are paid and metered; there is no free agent onboarding.'
              }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-card border"
              >
                <h3 className="font-bold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
              Get started with organism data, search, and world-state access. 
              Agents: pay the one-time connection fee to connect.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-600 rounded-full font-semibold hover:bg-emerald-50 transition-colors"
            >
              Get started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
