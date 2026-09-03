import {
  AEROSOL_APP_ID,
  AEROSOL_ENTRY,
  AEROSOL_FUSARIUM_ROUTE,
  AEROSOL_NATUREOS_ROUTE,
} from "./manifest"

export interface AerosolMountContract {
  appId: typeof AEROSOL_APP_ID
  natureosRoute: typeof AEROSOL_NATUREOS_ROUTE
  fusariumRoute: typeof AEROSOL_FUSARIUM_ROUTE
  sourceEntry: typeof AEROSOL_ENTRY.source
  targetEntry: typeof AEROSOL_ENTRY.target
  preservesClonedPayload: true
  rendersFusariumMapWorkbench: true
  inventsLiveData: false
}

export function aerosolMountContract(): AerosolMountContract {
  return {
    appId: AEROSOL_APP_ID,
    natureosRoute: AEROSOL_NATUREOS_ROUTE,
    fusariumRoute: AEROSOL_FUSARIUM_ROUTE,
    sourceEntry: AEROSOL_ENTRY.source,
    targetEntry: AEROSOL_ENTRY.target,
    preservesClonedPayload: true,
    rendersFusariumMapWorkbench: true,
    inventsLiveData: false,
  }
}
