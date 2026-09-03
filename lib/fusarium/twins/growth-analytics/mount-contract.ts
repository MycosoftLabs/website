import {
  GROWTH_ANALYTICS_APP_ID,
  GROWTH_ANALYTICS_ENTRY,
  GROWTH_ANALYTICS_FUSARIUM_ROUTE,
  GROWTH_ANALYTICS_NATUREOS_ROUTE,
} from "./manifest"

export function growthAnalyticsMountContract() {
  return {
    appId: GROWTH_ANALYTICS_APP_ID,
    natureosRoute: GROWTH_ANALYTICS_NATUREOS_ROUTE,
    fusariumRoute: GROWTH_ANALYTICS_FUSARIUM_ROUTE,
    sourceEntry: GROWTH_ANALYTICS_ENTRY.source,
    targetEntry: GROWTH_ANALYTICS_ENTRY.target,
    rendersClonedView: true as const,
    inventsLiveData: false as const,
  }
}
