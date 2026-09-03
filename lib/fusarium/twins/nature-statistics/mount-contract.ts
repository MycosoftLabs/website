import {
  NATURE_STATISTICS_APP_ID,
  NATURE_STATISTICS_ENTRY,
  NATURE_STATISTICS_FUSARIUM_ROUTE,
  NATURE_STATISTICS_NATUREOS_ROUTE,
} from "./manifest"

export interface NatureStatisticsMountContract {
  appId: typeof NATURE_STATISTICS_APP_ID
  natureosRoute: typeof NATURE_STATISTICS_NATUREOS_ROUTE
  fusariumRoute: typeof NATURE_STATISTICS_FUSARIUM_ROUTE
  sourceEntry: typeof NATURE_STATISTICS_ENTRY.source
  targetEntry: typeof NATURE_STATISTICS_ENTRY.target
  rendersClonedView: true
  rendersOperationalView: false
  addsInventedLiveData: false
  usesEdgeToEdgeResponsiveLayout: true
  labelsPopulationAsEstimate: true
}

export function natureStatisticsMountContract(): NatureStatisticsMountContract {
  return {
    appId: NATURE_STATISTICS_APP_ID,
    natureosRoute: NATURE_STATISTICS_NATUREOS_ROUTE,
    fusariumRoute: NATURE_STATISTICS_FUSARIUM_ROUTE,
    sourceEntry: NATURE_STATISTICS_ENTRY.source,
    targetEntry: NATURE_STATISTICS_ENTRY.target,
    rendersClonedView: true,
    rendersOperationalView: false,
    addsInventedLiveData: false,
    usesEdgeToEdgeResponsiveLayout: true,
    labelsPopulationAsEstimate: true,
  }
}
