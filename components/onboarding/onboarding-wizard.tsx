'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Leaf, 
  Microscope, 
  Globe2, 
  Brain, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  Shield,
  Database,
  Dna,
  CloudSun,
  Cpu,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignupForm } from './signup-form'
import { PlanSelector } from './plan-selector'

interface OnboardingWizardProps {
  onComplete?: () => void
}

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to NatureOS',
    subtitle: 'The Operating System for Earth',
    description: 'Connect with nature through AI-powered discovery, real-time environmental monitoring, and the world\'s largest fungal database.',
    icon: Leaf,
    gradient: 'from-emerald-500 via-green-600 to-teal-600',
    features: [
      { icon: Database, label: '15,000+ Species', desc: 'Comprehensive fungal database' },
      { icon: Microscope, label: 'AI Identification', desc: 'Instant species recognition' },
      { icon: Globe2, label: 'Live Earth View', desc: 'Real-time global monitoring' }
    ]
  },
  {
    id: 'discover',
    title: 'Discover & Identify',
    subtitle: 'MINDEX Fungal Database',
    description: 'Access the world\'s most comprehensive fungal species database. From common mushrooms to rare specimens, identify anything in seconds.',
    icon: Microscope,
    gradient: 'from-violet-500 via-purple-600 to-indigo-600',
    features: [
      { icon: Dna, label: 'Genetic Data', desc: 'Full phylogenetic trees' },
      { icon: Sparkles, label: 'AI Powered', desc: 'Smart search & identification' },
      { icon: Database, label: 'Research Papers', desc: 'Linked scientific literature' }
    ]
  },
  {
    id: 'monitor',
    title: 'Monitor Everything',
    subtitle: 'MycoBrain Sensor Network',
    description: 'Connect IoT devices to monitor growing conditions, track weather patterns, and receive real-time alerts. Perfect for cultivation.',
    icon: Cpu,
    gradient: 'from-amber-500 via-orange-600 to-red-500',
    features: [
      { icon: CloudSun, label: 'Weather Intel', desc: 'Hyperlocal forecasting' },
      { icon: Zap, label: 'Real-time Data', desc: 'Sensor telemetry streaming' },
      { icon: Shield, label: 'Smart Alerts', desc: 'Automated notifications' }
    ]
  },
  {
    id: 'ai',
    title: 'AI That Understands',
    subtitle: 'MYCA AI Assistant',
    description: 'Your personal mycology expert. Ask questions, get cultivation tips, identify specimens, and explore the fungal kingdom with AI guidance.',
    icon: Brain,
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    features: [
      { icon: Sparkles, label: 'Natural Chat', desc: 'Conversational AI' },
      { icon: Microscope, label: 'Expert Knowledge', desc: 'Trained on scientific data' },
      { icon: Zap, label: 'Instant Answers', desc: 'Fast, accurate responses' }
    ]
  },
  {
    id: 'signup',
    title: 'Join the Network',
    subtitle: 'Create Your Account',
    description: 'Start exploring for free. Upgrade anytime for unlimited access to all features and premium AI capabilities.',
    icon: Sparkles,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    isSignup: true
  }
]

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  
  const slide = SLIDES[currentSlide]
  const isLastSlide = currentSlide === SLIDES.length - 1
  const isFirstSlide = currentSlide === 0
  
  const goNext = useCallback(() => {
    if (!isLastSlide) {
      setDirection(1)
      setCurrentSlide(prev => prev + 1)
    }
  }, [isLastSlide])
  
  const goPrev = useCallback(() => {
    if (!isFirstSlide) {
      setDirection(-1)
      setCurrentSlide(prev => prev - 1)
    }
  }, [isFirstSlide])
  
  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
  }, [currentSlide])
  
  const handleComplete = useCallback(() => {
    setIsComplete(true)
    onComplete?.()
  }, [onComplete])
  
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900"
      >
        <div className="text-center space-y-6 p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto bg-emerald-500 rounded-full flex items-center justify-center"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white">Welcome to NatureOS!</h1>
          <p className="text-emerald-200 text-lg">Check your email to verify your account.</p>
          <motion.a
            href="/dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 rounded-full font-semibold hover:bg-emerald-50 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </motion.a>
        </div>
      </motion.div>
    )
  }
  
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  }
  
  const IconComponent = slide.icon
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        key={slide.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          slide.gradient
        )}
      />
      
      {/* Animated particles/shapes */}
      <ParticleBackground />
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with logo */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">NatureOS</span>
          </div>
          
          {/* Skip button */}
          {!isLastSlide && (
            <button
              onClick={() => goToSlide(SLIDES.length - 1)}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Skip to signup →
            </button>
          )}
        </header>
        
        {/* Slide content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-4xl"
            >
              {slide.isSignup ? (
                <SignupSlide slide={slide} onComplete={handleComplete} />
              ) : (
                <FeatureSlide slide={slide} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Navigation */}
        <footer className="p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    index === currentSlide 
                      ? "w-8 bg-white" 
                      : "bg-white/30 hover:bg-white/50"
                  )}
                />
              ))}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-4">
              {!isFirstSlide && (
                <button
                  onClick={goPrev}
                  className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              
              {!isLastSlide && (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-full font-semibold transition-all"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

// Feature slide component
function FeatureSlide({ slide }: { slide: typeof SLIDES[0] }) {
  const IconComponent = slide.icon
  
  return (
    <div className="text-center space-y-8">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center"
      >
        <IconComponent className="w-12 h-12 text-white" />
      </motion.div>
      
      {/* Text */}
      <div className="space-y-4">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/70 text-sm font-medium uppercase tracking-wider"
        >
          {slide.subtitle}
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-6xl font-bold text-white"
        >
          {slide.title}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
        >
          {slide.description}
        </motion.p>
      </div>
      
      {/* Features */}
      {slide.features && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 pt-8"
        >
          {slide.features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur rounded-2xl"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">{feature.label}</p>
                <p className="text-white/60 text-sm">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// Particle background component (SSR-safe)
function ParticleBackground() {
  const [mounted, setMounted] = useState(false)
  const [particles, setParticles] = useState<Array<{ x: number; y: number; duration: number; delay: number }>>([])
  
  useEffect(() => {
    setMounted(true)
    // Generate particles only on client side
    const newParticles = [...Array(20)].map(() => ({
      x: Math.random() * 100, // Use percentage instead of pixels
      y: Math.random() * 100,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }))
    setParticles(newParticles)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/10 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -100],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay
          }}
        />
      ))}
    </div>
  )
}

// Signup slide component
function SignupSlide({ slide, onComplete }: { slide: typeof SLIDES[0], onComplete: () => void }) {
  const [step, setStep] = useState<'form' | 'plan'>('form')
  const IconComponent = slide.icon
  
  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      {/* Left side - info */}
      <div className="text-left space-y-6 hidden md:block">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center"
        >
          <IconComponent className="w-10 h-10 text-white" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white"
        >
          {slide.title}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-white/80"
        >
          {slide.description}
        </motion.p>
        
        {/* Features list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 pt-4"
        >
          {[
            'Free forever plan available',
            '15,000+ species in our database',
            'AI-powered identification',
            'Real-time monitoring tools',
            'Community access'
          ].map((feature, i) => (
            <div key={feature} className="flex items-center gap-3 text-white/90">
              <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-900" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* Right side - form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20"
      >
        {step === 'form' ? (
          <SignupForm onSuccess={() => setStep('plan')} />
        ) : (
          <PlanSelector onComplete={onComplete} />
        )}
      </motion.div>
    </div>
  )
}
