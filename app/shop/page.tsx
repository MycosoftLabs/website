'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ShoppingCart, 
  Cpu, 
  Wifi, 
  Thermometer, 
  Wind,
  Check,
  Plus,
  Minus,
  Truck,
  Shield,
  Headphones
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import Link from 'next/link'

const PRODUCTS = [
  {
    id: 'mycobrain-basic',
    name: 'MycoBrain Basic',
    description: 'Entry-level environmental sensor for mushroom cultivation',
    price: 149,
    image: '/images/mycobrain-basic.png',
    features: [
      'Temperature & Humidity sensors',
      'WiFi connectivity',
      'Basic telemetry dashboard',
      'Mobile app access',
      'OTA firmware updates',
    ],
    specs: {
      sensors: ['BME280 (Temp/Humidity/Pressure)'],
      connectivity: 'WiFi 2.4GHz',
      power: 'USB-C (5V)',
      range: 'Indoor only',
    },
    badge: null,
    popular: false,
  },
  {
    id: 'mycobrain-pro',
    name: 'MycoBrain Pro',
    description: 'Advanced sensor with CO2, VOC, and air quality monitoring',
    price: 299,
    image: '/images/mycobrain-pro.png',
    features: [
      'All Basic features',
      'CO2 monitoring (0-5000 ppm)',
      'VOC & gas detection',
      'Dual BME688 sensors',
      'BSEC AI gas analysis',
      'Advanced analytics',
      'NeoPixel status LED',
      'Buzzer alerts',
    ],
    specs: {
      sensors: ['Dual BME688 (AI Gas Sensing)', 'CO2 sensor'],
      connectivity: 'WiFi 2.4GHz + BLE',
      power: 'USB-C (5V) / Battery option',
      range: 'Indoor + Greenhouse',
    },
    badge: 'Most Popular',
    popular: true,
  },
  {
    id: 'mycobrain-enterprise',
    name: 'MycoBrain Enterprise Pack',
    description: '5-device pack with gateway for commercial operations',
    price: 1199,
    image: '/images/mycobrain-enterprise.png',
    features: [
      '5x MycoBrain Pro units',
      'Mesh networking gateway',
      'Industrial-grade sensors',
      'LoRa long-range option',
      'Priority support',
      'Custom calibration',
      'API integration support',
      'Dedicated account manager',
    ],
    specs: {
      sensors: ['5x Dual BME688', '5x CO2 sensors'],
      connectivity: 'WiFi + LoRa + Gateway',
      power: 'PoE or USB-C',
      range: 'Commercial farm coverage',
    },
    badge: 'Best Value',
    popular: false,
  },
]

const BENEFITS = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free shipping on all orders over $200',
  },
  {
    icon: Shield,
    title: '2-Year Warranty',
    description: 'Full coverage for peace of mind',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Technical support when you need it',
  },
]

export default function ShopPage() {
  const { user } = useSupabaseUser()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  
  const getQuantity = (productId: string) => quantities[productId] || 1
  
  const setQuantity = (productId: string, qty: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, Math.min(10, qty)),
    }))
  }
  
  async function handleCheckout(productId: string) {
    if (!user) {
      window.location.href = '/login?redirect=/shop'
      return
    }
    
    setCheckingOut(productId)
    
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product',
          productId,
          quantity: getQuantity(productId),
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
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Hardware
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              MycoBrain Sensors
            </h1>
            <p className="text-xl text-slate-400">
              Professional environmental monitoring for your mushroom cultivation. 
              Real-time data, AI-powered insights, and seamless NatureOS integration.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Benefits Bar */}
      <div className="border-y border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <benefit.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Products Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {PRODUCTS.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col bg-slate-900/50 border-slate-700/50 hover:border-emerald-500/30 transition-colors ${product.popular ? 'ring-2 ring-emerald-500/50' : ''}`}>
                {product.badge && (
                  <Badge 
                    className={`absolute top-4 right-4 ${
                      product.popular 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}
                  >
                    {product.badge}
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center mb-4">
                    <Cpu className="h-20 w-20 text-emerald-500/50" />
                  </div>
                  <CardTitle className="text-xl text-white">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-grow">
                  <div className="text-3xl font-bold text-white mb-6">
                    ${product.price}
                    <span className="text-lg text-slate-400 font-normal"> USD</span>
                  </div>
                  
                  <ul className="space-y-2 mb-6">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="space-y-2 text-xs text-slate-500 border-t border-slate-800 pt-4">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      <span>{product.specs.sensors.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span>{product.specs.connectivity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4" />
                      <span>{product.specs.range}</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-3">
                  {/* Quantity Selector */}
                  <div className="flex items-center gap-4 w-full">
                    <span className="text-sm text-slate-400">Qty:</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(product.id, getQuantity(product.id) - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-white font-medium">
                        {getQuantity(product.id)}
                      </span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(product.id, getQuantity(product.id) + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-slate-400 ml-auto">
                      ${product.price * getQuantity(product.id)}
                    </span>
                  </div>
                  
                  <Button 
                    className={`w-full ${
                      product.popular 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                        : ''
                    }`}
                    onClick={() => handleCheckout(product.id)}
                    disabled={checkingOut === product.id}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {checkingOut === product.id ? 'Processing...' : 'Buy Now'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="border-t border-slate-800 bg-slate-900/50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Need a Custom Solution?
          </h2>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto">
            Contact our team for bulk orders, custom configurations, or enterprise integrations.
          </p>
          <Link href="/contact">
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
