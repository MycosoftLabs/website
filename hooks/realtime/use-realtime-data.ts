'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket, WSEventType } from './use-websocket'

interface SignalData {
  sessionId: string
  channels: number[][]
  sampleRate: number
  timestamp: number
}

interface SimulationProgress {
  id: string
  progress: number
  eta: string
  status: string
}

interface ExperimentStep {
  id: string
  step: number
  totalSteps: number
  status: string
  message?: string
}

interface DeviceStatus {
  deviceId: string
  status: 'online' | 'offline' | 'busy' | 'error'
  lastSeen: number
}

interface SafetyAlert {
  type: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: number
}

export function useSignalStream(sessionId?: string) {
  const { subscribe, isConnected } = useWebSocket()
  const [signals, setSignals] = useState<SignalData | null>(null)
  const [signalHistory, setSignalHistory] = useState<SignalData[]>([])

  useEffect(() => {
    const unsubscribe = subscribe<SignalData>('fci.signal', (data) => {
      if (!sessionId || data.sessionId === sessionId) {
        setSignals(data)
        setSignalHistory(prev => [...prev.slice(-99), data])
      }
    })
    return unsubscribe
  }, [subscribe, sessionId])

  return { signals, signalHistory, isConnected }
}

export function useSimulationProgress(simulationId?: string) {
  const { subscribe, isConnected } = useWebSocket()
  const [progress, setProgress] = useState<SimulationProgress | null>(null)

  useEffect(() => {
    const unsubscribe = subscribe<SimulationProgress>('simulation.progress', (data) => {
      if (!simulationId || data.id === simulationId) {
        setProgress(data)
      }
    })
    return unsubscribe
  }, [subscribe, simulationId])

  return { progress, isConnected }
}

export function useExperimentSteps(experimentId?: string) {
  const { subscribe, isConnected } = useWebSocket()
  const [step, setStep] = useState<ExperimentStep | null>(null)
  const [history, setHistory] = useState<ExperimentStep[]>([])

  useEffect(() => {
    const unsubscribe = subscribe<ExperimentStep>('experiment.step', (data) => {
      if (!experimentId || data.id === experimentId) {
        setStep(data)
        setHistory(prev => [...prev, data])
      }
    })
    return unsubscribe
  }, [subscribe, experimentId])

  return { step, history, isConnected }
}

export function useDeviceStatus() {
  const { subscribe, isConnected } = useWebSocket()
  const [devices, setDevices] = useState<Map<string, DeviceStatus>>(new Map())

  useEffect(() => {
    const unsubscribe = subscribe<DeviceStatus>('device.status', (data) => {
      setDevices(prev => new Map(prev).set(data.deviceId, data))
    })
    return unsubscribe
  }, [subscribe])

  return { devices: Array.from(devices.values()), isConnected }
}

export function useSafetyAlerts() {
  const { subscribe, isConnected } = useWebSocket()
  const [alerts, setAlerts] = useState<SafetyAlert[]>([])

  useEffect(() => {
    const unsubscribe = subscribe<SafetyAlert>('safety.alert', (data) => {
      setAlerts(prev => [...prev, data].slice(-50))
    })
    return unsubscribe
  }, [subscribe])

  const clearAlerts = useCallback(() => setAlerts([]), [])

  return { alerts, clearAlerts, isConnected }
}
