import {
  BIOLOGY_SIMULATOR_APP_ID,
  BIOLOGY_SIMULATOR_ENTRY,
  BIOLOGY_SIMULATOR_FUSARIUM_ROUTE,
  BIOLOGY_SIMULATOR_NATUREOS_ROUTE,
} from "./manifest"

export function biologySimulatorMountContract() {
  return {
    appId: BIOLOGY_SIMULATOR_APP_ID,
    natureosRoute: BIOLOGY_SIMULATOR_NATUREOS_ROUTE,
    fusariumRoute: BIOLOGY_SIMULATOR_FUSARIUM_ROUTE,
    sourceEntry: BIOLOGY_SIMULATOR_ENTRY.source,
    targetEntry: BIOLOGY_SIMULATOR_ENTRY.target,
    rendersClonedView: true as const,
    inventsLiveData: false as const,
  }
}
