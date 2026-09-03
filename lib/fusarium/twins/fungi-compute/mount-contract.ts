import {
  FUNGI_COMPUTE_APP_ID,
  FUNGI_COMPUTE_FUSARIUM_ROUTE,
  FUNGI_COMPUTE_NATUREOS_ROUTE,
} from "./manifest"

export function fungiComputeMountContract() {
  return {
    appId: FUNGI_COMPUTE_APP_ID,
    natureosRoute: FUNGI_COMPUTE_NATUREOS_ROUTE,
    fusariumRoute: FUNGI_COMPUTE_FUSARIUM_ROUTE,
    sourceEntry: "app/natureos/fungi-compute/{layout,page,loading}.tsx",
    targetEntry: "app/fusarium/(dashboard)/fungi-compute/{layout,page,loading}.tsx",
    rendersClonedView: true as const,
    evidenceAdapter: "components/fusarium/twins/fungi-compute/truthful-dashboard.tsx",
    inventsLiveData: false as const,
  }
}
