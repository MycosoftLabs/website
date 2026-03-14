'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Receipt, ArrowUpCircle, CheckCircle2 } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: 0,
    features: ['5 team members', '10 experiments/month', '1 GB storage', 'Community support'],
    current: false,
  },
  {
    name: 'Starter',
    price: 29,
    features: ['15 team members', '50 experiments/month', '10 GB storage', 'Email support', 'API access'],
    current: false,
  },
  {
    name: 'Professional',
    price: 99,
    features: ['50 team members', '200 experiments/month', '50 GB storage', 'Priority support', 'API access', 'Federation'],
    current: false,
  },
  {
    name: 'Enterprise',
    price: 299,
    features: ['Unlimited members', 'Unlimited experiments', '500 GB storage', 'Dedicated support', 'Full API access', 'Federation', 'SSO & audit logs'],
    current: true,
  },
]

const invoices = [
  { id: 'INV-2026-003', date: 'Mar 1, 2026', amount: '$299.00', status: 'Paid' },
  { id: 'INV-2026-002', date: 'Feb 1, 2026', amount: '$299.00', status: 'Paid' },
  { id: 'INV-2026-001', date: 'Jan 1, 2026', amount: '$299.00', status: 'Paid' },
  { id: 'INV-2025-012', date: 'Dec 1, 2025', amount: '$299.00', status: 'Paid' },
]

export default function PlatformBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Enterprise - $299/month</CardDescription>
            </div>
            <Badge className="bg-purple-500">Enterprise</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="font-medium">12 / Unlimited</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Experiments</p>
              <p className="font-medium">142 / Unlimited</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage</p>
              <div className="flex items-center gap-2">
                <Progress value={25} className="flex-1 h-2" />
                <span className="text-sm">12.4/500 GB</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next billing</p>
              <p className="font-medium">Apr 1, 2026</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.current ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.current ? (
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                ) : (
                  <Button variant="outline" className="w-full">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    {plan.price > 299 ? 'Contact Sales' : 'Switch'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoices
            </CardTitle>
            <CardDescription>Billing history</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Update Payment
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium">{inv.id}</span>
                  <p className="text-sm text-muted-foreground">{inv.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{inv.amount}</span>
                  <Badge variant="outline" className="text-green-600">{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
