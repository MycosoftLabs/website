"use client"

import { scenarioSim, useScenarioSimControl } from "@/lib/fusarium/scenario-sim/store"
import styles from "./scenario-sim.module.css"

/** Isolated like Clocks — re-renders only on start/stop, not every tick. */
export function ScenarioSimChromeChip() {
  const control = useScenarioSimControl()
  return (
    <div className={styles.chrome} data-testid="scenario-sim-chrome">
      <span aria-hidden="true">{control.running ? "SIM ON" : "SIM"}</span>
      <button type="button" aria-pressed={control.running} onClick={() => void scenarioSim.toggle()}>
        {control.running ? "STOP TEST" : "RUN SIM TEST"}
      </button>
    </div>
  )
}
