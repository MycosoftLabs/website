'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import confetti from 'canvas-confetti'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Trigger confetti on load
    const timer = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#14b8a6', '#0ea5e9'],
      })
      setVerified(true)
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [sessionId])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-900/80 border-emerald-500/30 backdrop-blur-xl">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4"
            >
              {loading ? (
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              )}
            </motion.div>
            
            <CardTitle className="text-2xl text-white">
              {loading ? 'Processing...' : 'Welcome to NatureOS Pro!'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {loading 
                ? 'Verifying your subscription...'
                : 'Your subscription has been activated successfully.'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {verified && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    What&apos;s Unlocked
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Unlimited species identifications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      1,000 API calls per day
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Full MINDEX database access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Advanced AI features & CREP Dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Priority support
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Link href="/dashboard" className="w-full">
              <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/billing" className="w-full">
              <Button variant="outline" className="w-full">
                View Billing Details
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
