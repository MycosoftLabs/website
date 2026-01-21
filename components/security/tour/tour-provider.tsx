'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface TourState {
  hasSeenWelcome: boolean
  completedTours: string[]
  currentTour: string | null
  currentStep: number
}

interface TourContextType {
  state: TourState
  startTour: (tourId: string) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  markWelcomeSeen: () => void
  hasCompletedTour: (tourId: string) => boolean
  resetAllTours: () => void
}

const TourContext = createContext<TourContextType | null>(null)

const STORAGE_KEY = 'mycosoft-security-tour-state'

const defaultState: TourState = {
  hasSeenWelcome: false,
  completedTours: [],
  currentTour: null,
  currentStep: 0
}

export function SecurityTourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>(defaultState)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setState({
          ...defaultState,
          ...parsed,
          currentTour: null,
          currentStep: 0
        })
      }
    } catch (e) {
      console.error('Failed to load tour state:', e)
    }
    setIsLoaded(true)
  }, [])

  // Save state to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          hasSeenWelcome: state.hasSeenWelcome,
          completedTours: state.completedTours
        }))
      } catch (e) {
        console.error('Failed to save tour state:', e)
      }
    }
  }, [state.hasSeenWelcome, state.completedTours, isLoaded])

  const startTour = useCallback((tourId: string) => {
    setState(prev => ({
      ...prev,
      currentTour: tourId,
      currentStep: 0
    }))
  }, [])

  const endTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      completedTours: prev.currentTour && !prev.completedTours.includes(prev.currentTour)
        ? [...prev.completedTours, prev.currentTour]
        : prev.completedTours,
      currentTour: null,
      currentStep: 0
    }))
  }, [])

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1)
    }))
  }, [])

  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: step
    }))
  }, [])

  const markWelcomeSeen = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSeenWelcome: true
    }))
  }, [])

  const hasCompletedTour = useCallback((tourId: string) => {
    return state.completedTours.includes(tourId)
  }, [state.completedTours])

  const resetAllTours = useCallback(() => {
    setState(defaultState)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  if (!isLoaded) {
    return <>{children}</>
  }

  return (
    <TourContext.Provider value={{
      state,
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
      markWelcomeSeen,
      hasCompletedTour,
      resetAllTours
    }}>
      {children}
    </TourContext.Provider>
  )
}

// Default context values for when provider isn't ready
const defaultContextValue: TourContextType = {
  state: defaultState,
  startTour: () => {},
  endTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
  markWelcomeSeen: () => {},
  hasCompletedTour: () => false,
  resetAllTours: () => {}
}

export function useSecurityTour() {
  const context = useContext(TourContext)
  // Return default values instead of throwing error when context isn't available
  // This can happen during SSR or when component mounts before provider is ready
  if (!context) {
    return defaultContextValue
  }
  return context
}
