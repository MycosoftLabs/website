"use client"

import { useSyncExternalStore } from "react"
import { replay } from "@/lib/itdx/replay-store"
import { selectITDXContext } from "@/lib/itdx/session"
import { LOCAL_DATASET_ID } from "@/lib/itdx/run-narration.mjs"
import {
  SCENARIO_RUN_ID,
  SCENARIO_SIM_BANNER,
  SCENARIO_SIM_CHANNEL,
  SCENARIO_SIM_EVENT,
  type ScenarioNlmVar,
  type ScenarioSimControl,
  type ScenarioSimFrame,
} from "./contracts"
import { IDLE_NLM, buildFrame } from "./packet"
import { nlmVarFromStatus } from "./nlm-from-status"

const idleControl: ScenarioSimControl = {
  running: false,
  live: false,
  banner: SCENARIO_SIM_BANNER,
  index: 0,
}

let nlm: ScenarioNlmVar = IDLE_NLM
let temperatureC: number | null = null
let lastFrame = buildFrame({ index: 0, running: false, nlm, temperatureC })
let control: ScenarioSimControl = idleControl
const frameListeners = new Set<() => void>()
const controlListeners = new Set<() => void>()

function emit(reason: string) {
  const replayState = replay.getState()
  lastFrame = buildFrame({
    index: replayState.index,
    running: control.running,
    nlm,
    temperatureC,
  })
  control = { running: control.running, live: false, banner: SCENARIO_SIM_BANNER, index: replayState.index }
  frameListeners.forEach((fn) => fn())
  if (reason !== "tick") controlListeners.forEach((fn) => fn())
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      SCENARIO_SIM_CHANNEL,
      JSON.stringify({ running: control.running, index: control.index, live: false }),
    )
    window.dispatchEvent(new CustomEvent(SCENARIO_SIM_EVENT, { detail: { ...lastFrame, reason } }))
  } catch {
    /* session isolation */
  }
}

async function refreshNlm() {
  try {
    const response = await fetch("/api/fusarium/nlm/status", { cache: "no-store" })
    const data = await response.json().catch(() => null)
    nlm = nlmVarFromStatus(data, response.ok)
  } catch {
    nlm = nlmVarFromStatus(null, false)
  }
}

function onReplayEvent(event: Event) {
  const detail = (event as CustomEvent).detail
  if (!control.running) return
  if (detail?.reason === "overlay-off" || detail?.reason === "pause") {
    if (detail?.reason === "overlay-off") {
      control = { ...control, running: false }
      emit("stop")
      return
    }
  }
  emit(detail?.reason === "tick" || detail?.reason === "tick-quiet" ? "tick" : "replay")
}

export const scenarioSim = {
  getFrame: () => lastFrame,
  getControl: () => control,
  async start() {
    await refreshNlm()
    try {
      window.sessionStorage.setItem("itdx-run-id", SCENARIO_RUN_ID)
      selectITDXContext({
        runId: SCENARIO_RUN_ID,
        datasetId: LOCAL_DATASET_ID,
        dataOrigin: "SYNTHETIC_EXERCISE",
      })
    } catch {
      /* ignore */
    }
    replay.enable(true)
    if (!replay.getState().playing) replay.play()
    control = { running: true, live: false, banner: SCENARIO_SIM_BANNER, index: replay.getState().index }
    emit("start")
  },
  stop() {
    replay.pause()
    control = { ...idleControl, index: replay.getState().index }
    emit("stop")
  },
  async toggle() {
    if (control.running) {
      scenarioSim.stop()
      return
    }
    await scenarioSim.start()
  },
  attachNlm(next: ScenarioNlmVar) {
    nlm = { ...next, bound_to_ollama: false, forecast_qualified: false, p: null, live: false }
    emit("nlm")
  },
  attachWeatherCite(celsius: number | null) {
    temperatureC = typeof celsius === "number" && Number.isFinite(celsius) ? celsius : null
    emit("weather")
  },
}

if (typeof window !== "undefined") {
  window.addEventListener("fusarium:itdx-replay", onReplayEvent)
}

export function useScenarioSim(): ScenarioSimFrame {
  return useSyncExternalStore(
    (cb) => {
      frameListeners.add(cb)
      return () => {
        frameListeners.delete(cb)
      }
    },
    () => lastFrame,
    () => lastFrame,
  )
}

export function useScenarioSimControl(): ScenarioSimControl {
  return useSyncExternalStore(
    (cb) => {
      controlListeners.add(cb)
      return () => {
        controlListeners.delete(cb)
      }
    },
    () => control,
    () => idleControl,
  )
}
