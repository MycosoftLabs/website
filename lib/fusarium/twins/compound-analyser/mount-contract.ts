import {
  COMPOUND_ANALYSER_APP_ID,
  COMPOUND_ANALYSER_ENTRY,
  COMPOUND_ANALYSER_FUSARIUM_ROUTE,
  COMPOUND_ANALYSER_NATUREOS_ROUTE,
} from "./manifest"

export function compoundAnalyserMountContract() {
  return {
    appId: COMPOUND_ANALYSER_APP_ID,
    natureosRoute: COMPOUND_ANALYSER_NATUREOS_ROUTE,
    fusariumRoute: COMPOUND_ANALYSER_FUSARIUM_ROUTE,
    sourceEntry: COMPOUND_ANALYSER_ENTRY.source,
    targetEntry: COMPOUND_ANALYSER_ENTRY.target,
    rendersClonedView: true as const,
    inventsLiveData: false as const,
  }
}
