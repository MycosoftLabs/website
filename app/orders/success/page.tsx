'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, CheckCircle, Truck, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import confetti from 'canvas-confetti'

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)
  
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
    }, 500)
    
    return () => clearTimeout(timer)
  }, [sessionId])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="bg-slate-900/80 border-teal-500/30 backdrop-blur-xl">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Package className="h-10 w-10 text-white" />
              </div>
            </motion.div>
            
            <CardTitle className="text-2xl text-white">
              Order Confirmed!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Thank you for your purchase. Your MycoBrain device is on its way!
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
                {/* Order Timeline */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-4">What&apos;s Next</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Order Confirmed</p>
                        <p className="text-sm text-slate-400">Your payment was successful</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Processing</p>
                        <p className="text-sm text-slate-500">We&apos;re preparing your order (1-2 days)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Shipping</p>
                        <p className="text-sm text-slate-500">Estimated delivery in 5-7 business days</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Confirmation Email</p>
                        <p className="text-sm text-slate-500">Check your inbox for order details</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Setup Info */}
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                  <h4 className="font-medium text-teal-400 mb-2">Getting Started</h4>
                  <p className="text-sm text-slate-300">
                    Once your device arrives, download the NatureOS mobile app to complete setup. 
                    Your device will automatically appear in your dashboard after pairing.
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Link href="/dashboard/devices" className="w-full">
              <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500">
                Go to Devices
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/shop" className="w-full">
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
