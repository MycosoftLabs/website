"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, ShoppingCart, Package, Check, Calendar, Zap, Network, Database } from "lucide-react"

interface PreOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PreOrderModal({ isOpen, onClose }: PreOrderModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-5xl bg-slate-950 border border-white/10 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">Pre-Order Mushroom 1</h2>
                <p className="text-white/60 mt-1">The world's first real droid</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Device Video */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-4 text-center">Device Overview</h3>
                <div className="w-full rounded-xl overflow-hidden border border-emerald-500/20 bg-slate-900">
                  <video
                    src="/assets/mushroom1/close 1.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* What You Get */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="h-6 w-6 text-emerald-400" />
                  What You Get
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Device Package</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>1x Mushroom 1 unit (fully assembled)</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>2m soil probe array</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>4x solar panels</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>6600mAh Li-Po battery</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Quadruped walking system</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Included Services</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>NatureOS cloud platform access</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>MINDEX data integration</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Setup & deployment guide</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>1 year warranty</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/80">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Technical support</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Features & Details */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Features & Specifications</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5 text-amber-400" />
                        Power
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm text-white/70">
                        <li>• Solar-powered operation</li>
                        <li>• 6-month battery life</li>
                        <li>• Auto-recharge capability</li>
                        <li>• IP67 weatherproof</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Network className="h-5 w-5 text-blue-400" />
                        Connectivity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm text-white/70">
                        <li>• 5km mesh range</li>
                        <li>• LoRa 915MHz</li>
                        <li>• WiFi & Bluetooth</li>
                        <li>• Cloud sync enabled</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Database className="h-5 w-5 text-purple-400" />
                        Sensing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm text-white/70">
                        <li>• Dual BME688 sensors</li>
                        <li>• 2m soil probe</li>
                        <li>• Light & UV sensors</li>
                        <li>• Real-time monitoring</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Deployment Timeline */}
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-amber-400" />
                    Deployment Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/90 text-lg leading-relaxed">
                    <span className="font-semibold text-amber-400">Important:</span> Mushroom 1 is currently in final development and testing phases. 
                    Pre-orders are now being accepted for devices that will be deployed and shipped starting in <span className="font-semibold">mid-to-end of 2026</span>.
                  </p>
                  <div className="space-y-2 text-white/80">
                    <p>
                      By pre-ordering now, you secure your place in the deployment queue and help us finalize production specifications 
                      based on real-world requirements from early adopters like you.
                    </p>
                    <p>
                      We will keep all pre-order customers updated on development progress, provide early access to software features, 
                      and ensure priority support when your device ships.
                    </p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                    Expected Deployment: Mid-to-End 2026
                  </Badge>
                </CardContent>
              </Card>

              {/* Pricing & CTA */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div>
                  <div className="text-3xl font-bold text-emerald-400">$2,000</div>
                  <div className="text-white/60">Pre-order price (final pricing may vary)</div>
                </div>
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Complete Pre-Order
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
