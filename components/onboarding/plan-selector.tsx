'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Check, 
  Sparkles, 
  Zap, 
  Building2,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubscriptionTier, SUBSCRIPTION_PRICING } from '@/lib/access/types'

interface PlanSelectorProps {
  onComplete: () => void
}

const PLANS = [
  {
    id: SubscriptionTier.FREE,
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    icon: Sparkles,
    color: 'emerald',
    features: [
      'Access to 50 species/day',
      'Basic search functionality',
      'Community features',
      'Weather data',
      'Mobile app access'
    ],
    limits: [
      'Limited API calls',
      'No AI assistant',
      'No export features'
    ]
  },
  {
    id: SubscriptionTier.PRO,
    name: 'Pro',
    price: SUBSCRIPTION_PRICING[SubscriptionTier.PRO],
    description: 'For serious mycologists',
    icon: Zap,
    color: 'violet',
    popular: true,
    features: [
      'Unlimited species access',
      'MYCA AI Assistant',
      'CREP Intelligence Dashboard',
      'Full ancestry explorer',
      'Compound simulations',
      'API access (10K/mo)',
      'Flight & ship tracking',
      'Priority support',
      'Data export'
    ]
  },
  {
    id: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    price: SUBSCRIPTION_PRICING[SubscriptionTier.ENTERPRISE],
    description: 'For teams & organizations',
    icon: Building2,
    color: 'amber',
    features: [
      'Everything in Pro',
      'SOC Dashboard',
      'Team management',
      'Unlimited API calls',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated support',
      'White-label options',
      'On-premise deployment'
    ]
  }
]

export function PlanSelector({ onComplete }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(SubscriptionTier.FREE)
  const [isLoading, setIsLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  
  const handleContinue = async () => {
    setIsLoading(true)
    
    // If free plan, just continue
    if (selectedPlan === SubscriptionTier.FREE) {
      onComplete()
      return
    }
    
    // For paid plans, redirect to Stripe checkout
    // TODO: Implement Stripe checkout
    setTimeout(() => {
      onComplete()
    }, 1500)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Choose your plan</h2>
        <p className="text-white/60 mt-1">Start free, upgrade anytime</p>
      </div>
      
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm transition-colors", billingCycle === 'monthly' ? 'text-white' : 'text-white/50')}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className={cn(
            "relative w-14 h-7 rounded-full transition-colors",
            billingCycle === 'annual' ? 'bg-emerald-500' : 'bg-white/20'
          )}
        >
          <motion.div
            layout
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
            style={{ left: billingCycle === 'monthly' ? '4px' : 'calc(100% - 24px)' }}
          />
        </button>
        <span className={cn("text-sm transition-colors", billingCycle === 'annual' ? 'text-white' : 'text-white/50')}>
          Annual
          <span className="ml-1 text-emerald-400 text-xs">-20%</span>
        </span>
      </div>
      
      {/* Plans - horizontal scroll on mobile */}
      <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-2">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id
          const price = billingCycle === 'annual' 
            ? Math.floor(plan.price * 0.8) 
            : plan.price
          
          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative text-left p-4 rounded-2xl border-2 transition-all",
                isSelected 
                  ? 'bg-white/20 border-white' 
                  : 'bg-white/5 border-white/20 hover:border-white/40'
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 rounded-full text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  plan.color === 'emerald' && 'bg-emerald-500/20',
                  plan.color === 'violet' && 'bg-violet-500/20',
                  plan.color === 'amber' && 'bg-amber-500/20'
                )}>
                  <plan.icon className={cn(
                    "w-5 h-5",
                    plan.color === 'emerald' && 'text-emerald-400',
                    plan.color === 'violet' && 'text-violet-400',
                    plan.color === 'amber' && 'text-amber-400'
                  )} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="font-bold text-white">{plan.name}</h3>
                      <p className="text-white/50 text-sm">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-white">
                        ${price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-white/50 text-sm">/mo</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Features preview */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {plan.features.slice(0, 3).map((feature) => (
                      <span 
                        key={feature}
                        className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {plan.features.length > 3 && (
                      <span className="text-xs text-white/50">
                        +{plan.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Selected indicator */}
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  isSelected ? 'bg-white border-white' : 'border-white/40'
                )}>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
      
      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={isLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all",
          "bg-white text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {selectedPlan === SubscriptionTier.FREE ? (
              'Continue with Free'
            ) : (
              `Get ${PLANS.find(p => p.id === selectedPlan)?.name}`
            )}
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
      
      {/* Money back guarantee */}
      {selectedPlan !== SubscriptionTier.FREE && (
        <p className="text-center text-white/50 text-sm">
          ✓ 14-day money-back guarantee &nbsp;•&nbsp; Cancel anytime
        </p>
      )}
    </div>
  )
}
