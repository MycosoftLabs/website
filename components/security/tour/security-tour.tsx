'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Check, HelpCircle, Sparkles, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSecurityTour } from './tour-provider'

export interface TourStep {
  target: string // CSS selector for the element to highlight
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightPadding?: number
  icon?: React.ReactNode
  // Navigation options for automatic tab/page switching
  route?: string // Navigate to this route before showing the step
  tabSelector?: string // CSS selector for the tab button to click
  waitForElement?: boolean // Wait for target element to appear after navigation
}

interface SecurityTourProps {
  tourId: string
  steps: TourStep[]
  onComplete?: () => void
  autoStart?: boolean
}

// Arrow component pointing to the target
function TooltipArrow({ placement, targetRect }: { placement: string, targetRect: DOMRect | null }) {
  if (!targetRect || placement === 'center') return null
  
  const arrowSize = 12
  const ArrowIcon = placement === 'top' ? ArrowDown : 
                    placement === 'bottom' ? ArrowUp :
                    placement === 'left' ? ArrowRight : ArrowLeft
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-emerald-400"
    >
      <ArrowIcon className="w-6 h-6 animate-bounce" />
    </motion.div>
  )
}

export function SecurityTour({ tourId, steps, onComplete, autoStart = false }: SecurityTourProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, endTour, nextStep, prevStep, startTour, hasCompletedTour } = useSecurityTour()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 })
  const [isNavigating, setIsNavigating] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hasNavigatedRef = useRef(false)

  const isActive = state.currentTour === tourId
  const currentStep = state.currentStep
  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  // Auto-start tour for first-time users
  useEffect(() => {
    if (autoStart && !hasCompletedTour(tourId) && !state.currentTour) {
      const timer = setTimeout(() => {
        startTour(tourId)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoStart, hasCompletedTour, tourId, state.currentTour, startTour])

  // Handle route and tab navigation before showing the step
  useEffect(() => {
    if (!isActive || !step) return
    
    const navigateToStep = async () => {
      // Check if we need to navigate to a different route
      if (step.route && pathname !== step.route) {
        setIsNavigating(true)
        hasNavigatedRef.current = true
        router.push(step.route)
        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        setIsNavigating(false)
        return
      }
      
      // Check if we need to click a tab
      if (step.tabSelector) {
        const tabButton = document.querySelector(step.tabSelector) as HTMLButtonElement
        if (tabButton) {
          // Check if the tab is not already active (doesn't have active class or aria-selected)
          const isActive = tabButton.getAttribute('aria-selected') === 'true' || 
                          tabButton.classList.contains('active') ||
                          tabButton.getAttribute('data-state') === 'active'
          
          if (!isActive) {
            tabButton.click()
            // Wait for tab content to render
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }
    }
    
    navigateToStep()
  }, [isActive, step, pathname, router, currentStep])

  // Find and position spotlight on target element with continuous tracking
  useEffect(() => {
    if (!isActive || !step || isNavigating) return

    let animationId: number
    let retryCount = 0
    const maxRetries = 30 // Try for 3 seconds (30 * 100ms) - increased for navigation

    const findTarget = () => {
      const target = document.querySelector(step.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        
        // Only update if rect has valid dimensions and position
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect)
          
          // Scroll element into view if needed (only on first find)
          if (retryCount === 0) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          retryCount = 0 // Reset retry count on success
        }
      } else if (retryCount < maxRetries) {
        // Element not found yet, retry after a short delay
        retryCount++
        setTimeout(findTarget, 100)
      } else {
        setTargetRect(null)
      }
    }

    // Wait a bit after navigation before finding target
    const initialDelay = hasNavigatedRef.current ? 500 : 0
    hasNavigatedRef.current = false
    
    const initialTimer = setTimeout(() => {
      findTarget()
    }, initialDelay)
    
    // Continuous position tracking using requestAnimationFrame
    const trackPosition = () => {
      const target = document.querySelector(step.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect)
        }
      }
      animationId = requestAnimationFrame(trackPosition)
    }
    
    // Start tracking after initial find
    const trackingTimer = setTimeout(() => {
      animationId = requestAnimationFrame(trackPosition)
    }, 500 + initialDelay)
    
    // Also listen for scroll events on all scrollable containers
    const handleScroll = () => {
      findTarget()
    }
    
    window.addEventListener('resize', findTarget)
    window.addEventListener('scroll', handleScroll, true) // Capture phase to catch all scrolls
    
    return () => {
      clearTimeout(initialTimer)
      clearTimeout(trackingTimer)
      window.removeEventListener('resize', findTarget)
      window.removeEventListener('scroll', handleScroll, true)
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isActive, step, currentStep, isNavigating])

  // Position tooltip relative to target
  useEffect(() => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    const tooltipRect = tooltip.getBoundingClientRect()
    const padding = step?.spotlightPadding || 16
    const placement = step?.placement || 'bottom'
    const margin = 20

    let top = 0
    let left = 0
    let arrowTop = 0
    let arrowLeft = 0

    if (!targetRect || placement === 'center') {
      // Center the tooltip on screen if no target
      top = window.innerHeight / 2 - tooltipRect.height / 2
      left = window.innerWidth / 2 - tooltipRect.width / 2
    } else {
      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - padding - margin - 24
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
          arrowTop = top + tooltipRect.height
          arrowLeft = targetRect.left + targetRect.width / 2 - 12
          break
        case 'bottom':
          top = targetRect.bottom + padding + margin + 24
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
          arrowTop = top - 24
          arrowLeft = targetRect.left + targetRect.width / 2 - 12
          break
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2)
          left = targetRect.left - tooltipRect.width - padding - margin - 24
          arrowTop = targetRect.top + targetRect.height / 2 - 12
          arrowLeft = left + tooltipRect.width
          break
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2)
          left = targetRect.right + padding + margin + 24
          arrowTop = targetRect.top + targetRect.height / 2 - 12
          arrowLeft = left - 24
          break
      }
    }

    // Keep tooltip on screen
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin))
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin))

    setTooltipPosition({ top, left })
    setArrowPosition({ top: arrowTop, left: arrowLeft })
  }, [targetRect, step])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      endTour()
      onComplete?.()
    } else {
      nextStep()
    }
  }, [isLastStep, endTour, onComplete, nextStep])

  const handleSkip = useCallback(() => {
    endTour()
  }, [endTour])

  if (!isActive || !step) return null

  const placement = step.placement || 'bottom'

  return (
    <AnimatePresence>
      {/* Lighter overlay with spotlight cutout - now 35% opacity for better visibility */}
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] pointer-events-none"
      >
        {/* Lighter dark overlay - reduced from 60% to 35% */}
        <div className="absolute inset-0 bg-black/35" />
        
        {/* Spotlight cutout with pulsing border */}
        {targetRect && step.placement !== 'center' && (
          <>
            {/* Main spotlight */}
            <motion.div
              key={`spotlight-${currentStep}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-lg"
              style={{
                top: targetRect.top - (step.spotlightPadding || 16),
                left: targetRect.left - (step.spotlightPadding || 16),
                width: targetRect.width + (step.spotlightPadding || 16) * 2,
                height: targetRect.height + (step.spotlightPadding || 16) * 2,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                background: 'transparent',
              }}
            />
            {/* Pulsing highlight border */}
            <motion.div
              key={`border-${currentStep}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: [
                  '0 0 0 3px #10b981, 0 0 20px rgba(16, 185, 129, 0.5)',
                  '0 0 0 4px #10b981, 0 0 30px rgba(16, 185, 129, 0.8)',
                  '0 0 0 3px #10b981, 0 0 20px rgba(16, 185, 129, 0.5)',
                ]
              }}
              transition={{
                boxShadow: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }
              }}
              className="absolute rounded-lg pointer-events-none"
              style={{
                top: targetRect.top - (step.spotlightPadding || 16),
                left: targetRect.left - (step.spotlightPadding || 16),
                width: targetRect.width + (step.spotlightPadding || 16) * 2,
                height: targetRect.height + (step.spotlightPadding || 16) * 2,
                background: 'transparent',
              }}
            />
          </>
        )}
      </motion.div>

      {/* Bouncing Arrow pointing to target */}
      {targetRect && placement !== 'center' && (
        <motion.div
          key="tour-arrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[9999] pointer-events-none"
          style={{ top: arrowPosition.top, left: arrowPosition.left }}
        >
          <TooltipArrow placement={placement} targetRect={targetRect} />
        </motion.div>
      )}

      {/* Tooltip with clear positioning */}
      <motion.div
        key="tour-tooltip"
        ref={tooltipRef}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed z-[9999] w-[380px] max-w-[90vw] pointer-events-auto"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white font-semibold text-sm">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              {step.icon && (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {step.title}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {step.content}
                </p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    index === currentStep
                      ? "w-6 bg-emerald-500"
                      : index < currentStep
                      ? "w-1.5 bg-emerald-500/50"
                      : "w-1.5 bg-slate-600"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Skip tour
            </button>
            
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-3 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all",
                  isLastStep
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                )}
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Tour trigger button component
export function TourTriggerButton({ tourId, onClick }: { tourId: string, onClick?: () => void }) {
  const { startTour, hasCompletedTour } = useSecurityTour()
  
  const handleClick = () => {
    startTour(tourId)
    onClick?.()
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
        hasCompletedTour(tourId)
          ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
          : "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
      )}
    >
      <HelpCircle className="w-4 h-4" />
      {hasCompletedTour(tourId) ? 'Replay Tour' : 'Take Tour'}
    </button>
  )
}
