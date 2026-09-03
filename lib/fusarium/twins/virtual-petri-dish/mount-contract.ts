import {
  VIRTUAL_PETRI_DISH_APP_ID,
  VIRTUAL_PETRI_DISH_ENTRY,
  VIRTUAL_PETRI_DISH_FUSARIUM_ROUTE,
  VIRTUAL_PETRI_DISH_NATUREOS_ROUTE,
} from "./manifest"

export function virtualPetriDishMountContract() {
  return {
    appId: VIRTUAL_PETRI_DISH_APP_ID,
    natureosRoute: VIRTUAL_PETRI_DISH_NATUREOS_ROUTE,
    fusariumRoute: VIRTUAL_PETRI_DISH_FUSARIUM_ROUTE,
    sourceEntry: VIRTUAL_PETRI_DISH_ENTRY.source,
    targetEntry: VIRTUAL_PETRI_DISH_ENTRY.target,
    rendersClonedView: true as const,
    inventsLiveData: false as const,
  }
}
