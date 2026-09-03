import { ANCESTRY_APP_ID, ANCESTRY_FUSARIUM_ROUTE, ANCESTRY_NATUREOS_ROUTE } from "./manifest"

export function ancestryMountContract() {
  return {
    appId: ANCESTRY_APP_ID,
    natureosRoute: ANCESTRY_NATUREOS_ROUTE,
    fusariumRoute: ANCESTRY_FUSARIUM_ROUTE,
    sourceEntry: "app/natureos/ancestry/**",
    targetEntry: "app/fusarium/(dashboard)/life-database/**",
    rendersClonedView: true as const,
    inventsLiveData: false as const,
  }
}
