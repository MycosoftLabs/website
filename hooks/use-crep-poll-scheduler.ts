"use client"

import { useEffect, useRef } from "react"

export interface CrepPollTask {
  id: string
  intervalMs: number
  enabled?: boolean
  run: () => void | Promise<void>
}

interface UseCrepPollSchedulerOptions {
  masterTickMs?: number
  shouldPause?: () => boolean
}

function scheduleIdleWork(fn: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => fn(), { timeout: 2_000 })
    return
  }
  window.setTimeout(fn, 0)
}

export function useCrepPollScheduler(
  tasks: CrepPollTask[],
  options?: UseCrepPollSchedulerOptions,
) {
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const lastRunRef = useRef<Record<string, number>>({})
  const shouldPauseRef = useRef(options?.shouldPause)
  shouldPauseRef.current = options?.shouldPause

  useEffect(() => {
    const masterTickMs = options?.masterTickMs ?? 60_000

    const tick = () => {
      if (shouldPauseRef.current?.()) return
      if (typeof document !== "undefined" && document.hidden) return

      const now = Date.now()
      for (const task of tasksRef.current) {
        if (task.enabled === false) continue
        const last = lastRunRef.current[task.id] ?? 0
        if (now - last < task.intervalMs) continue
        lastRunRef.current[task.id] = now
        scheduleIdleWork(() => {
          void task.run()
        })
      }
    }

    tick()
    const intervalId = window.setInterval(tick, masterTickMs)
    const onVisibility = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [options?.masterTickMs])
}
