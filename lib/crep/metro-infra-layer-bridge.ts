/**
 * Metro infra layer bridge — May 24, 2026
 *
 * City-specific OSM detail layers (NYC, DC, Vegas, SD/TJ) are hidden from the
 * filter panel. Their MapLibre overlays follow the generic parent toggles
 * (cell towers, data centers, hospitals, etc.) instead of separate city filters.
 */

export interface LayerToggle {
  id: string;
  enabled: boolean;
}

export const METRO_PROJECT_ANCHOR_IDS = [
  "projectNyc",
  "projectDc",
  "projectVegas",
] as const;

/** Per-city infra detail toggles — hidden from panel; driven by parent filters. */
export const METRO_INFRA_DETAIL_LAYER_IDS = new Set<string>([
  "nycHospitals",
  "nycPolice",
  "nycSewage",
  "nycCellTowers",
  "nycAmFmAntennas",
  "nycMilitary",
  "nycDataCenters",
  "nycTransitSubway",
  "nycTransitRail",
  "nycAirports",
  "nycGovtEmbassy",
  "dcHospitals",
  "dcPolice",
  "dcSewage",
  "dcCellTowers",
  "dcAmFmAntennas",
  "dcMilitary",
  "dcDataCenters",
  "dcTransitSubway",
  "dcTransitRail",
  "dcAirports",
  "dcGovtEmbassy",
  "vegasHospitals",
  "vegasPolice",
  "vegasSewage",
  "vegasCellTowers",
  "vegasAmFmAntennas",
  "vegasMilitary",
  "vegasDataCenters",
  "vegasTransitSubway",
  "vegasTransitRail",
  "vegasAirports",
  "vegasGovtEmbassy",
]);

export const SDTJ_COVERAGE_DETAIL_LAYER_IDS = new Set<string>([
  "sdtjHospitals",
  "sdtjPolice",
  "sdtjSewage",
  "sdtjCellTowers",
  "sdtjAmFmAntennas",
  "sdtjMilitary",
  "sdtjDataCenters",
]);

/** Unified data-center toggle — one control drives all DC layer ids. */
export const DATA_CENTER_LAYER_IDS = [
  "dataCenters",
  "dataCentersG",
  "im3DataCenters",
  "im3DataCenterFootprints",
] as const;

export const DATA_CENTER_DUPLICATE_PANEL_IDS = new Set<string>([
  "dataCentersG",
  "im3DataCenters",
  "im3DataCenterFootprints",
]);

/** Unified power-plant toggle — one control drives global + EIA status layers. */
export const POWER_PLANT_LAYER_IDS = [
  "powerPlants",
  "powerPlantsG",
  "eiaOperating",
  "eiaPlanned",
  "eiaRetired",
  "eiaCanceled",
] as const;

export const POWER_PLANT_DUPLICATE_PANEL_IDS = new Set<string>([
  "powerPlantsG",
  "eiaOperating",
  "eiaPlanned",
  "eiaRetired",
  "eiaCanceled",
]);

/** Unified transmission toggle — high-voltage/global and full-voltage lines. */
export const TRANSMISSION_LAYER_IDS = [
  "transmissionLines",
  "txLinesGlobal",
  "txLinesFull",
] as const;

export const TRANSMISSION_DUPLICATE_PANEL_IDS = new Set<string>([
  "transmissionLines",
  "txLinesFull",
]);

/** Unified cell-tower toggle — local/bbox towers + global PMTiles towers. */
export const CELL_TOWER_LAYER_IDS = [
  "cellTowers",
  "cellTowersG",
] as const;

export const CELL_TOWER_DUPLICATE_PANEL_IDS = new Set<string>([
  "cellTowersG",
]);

/** Device child filter chips own these parent mover layers in the panel. */
export const MOVER_DUPLICATE_PANEL_IDS = new Set<string>([
  "aviation",
  "aviationRoutes",
  "ships",
  "shipRoutes",
  "fishing",
  "containers",
  "satellites",
]);

export const REMOVED_FROM_INFRA_PANEL_IDS = new Set<string>([
  "photorealistic3D",
  "mapbox3dBuildings",
  "population",
  "humanMovement",
  "events_human",
]);

const CELL_PARENT_IDS = ["cellTowers", "cellTowersG"] as const;
const RADIO_PARENT_IDS = ["radioStations"] as const;
const HOSPITAL_PARENT_IDS = ["hospitals"] as const;
const POLICE_PARENT_IDS = ["fireStations"] as const;
const MILITARY_PARENT_IDS = ["militaryBases"] as const;
const TRANSIT_PARENT_IDS = ["liveTransit", "railwayTrains", "railwayTracks"] as const;
const SEWAGE_PARENT_IDS = ["waterPollution"] as const;
const AIRPORT_PARENT_IDS = ["aviation", "aviationRoutes"] as const;
const GOVT_PARENT_IDS = ["events_human", "universities"] as const;

const ALL_METRO_PARENT_IDS = [
  ...CELL_PARENT_IDS,
  ...RADIO_PARENT_IDS,
  ...DATA_CENTER_LAYER_IDS,
  ...HOSPITAL_PARENT_IDS,
  ...POLICE_PARENT_IDS,
  ...MILITARY_PARENT_IDS,
  ...TRANSIT_PARENT_IDS,
  ...SEWAGE_PARENT_IDS,
  ...AIRPORT_PARENT_IDS,
  ...GOVT_PARENT_IDS,
] as const;

export function isLayerEnabled(layers: LayerToggle[], id: string): boolean {
  return layers.some((layer) => layer.id === id && layer.enabled);
}

export function isAnyLayerEnabled(layers: LayerToggle[], ids: readonly string[]): boolean {
  return ids.some((id) => isLayerEnabled(layers, id));
}

export function isHiddenFromLayerPanel(layerId: string): boolean {
  return (
    METRO_INFRA_DETAIL_LAYER_IDS.has(layerId) ||
    SDTJ_COVERAGE_DETAIL_LAYER_IDS.has(layerId) ||
    DATA_CENTER_DUPLICATE_PANEL_IDS.has(layerId) ||
    POWER_PLANT_DUPLICATE_PANEL_IDS.has(layerId) ||
    TRANSMISSION_DUPLICATE_PANEL_IDS.has(layerId) ||
    CELL_TOWER_DUPLICATE_PANEL_IDS.has(layerId) ||
    MOVER_DUPLICATE_PANEL_IDS.has(layerId) ||
    REMOVED_FROM_INFRA_PANEL_IDS.has(layerId)
  );
}

/** Expand a panel toggle to all linked layer state ids (e.g. all data-center sources). */
export function expandLayerToggleIds(layerId: string): string[] {
  if (DATA_CENTER_LAYER_IDS.includes(layerId as (typeof DATA_CENTER_LAYER_IDS)[number])) {
    return [...DATA_CENTER_LAYER_IDS];
  }
  if (POWER_PLANT_LAYER_IDS.includes(layerId as (typeof POWER_PLANT_LAYER_IDS)[number])) {
    return [...POWER_PLANT_LAYER_IDS];
  }
  if (TRANSMISSION_LAYER_IDS.includes(layerId as (typeof TRANSMISSION_LAYER_IDS)[number])) {
    return [...TRANSMISSION_LAYER_IDS];
  }
  if (CELL_TOWER_LAYER_IDS.includes(layerId as (typeof CELL_TOWER_LAYER_IDS)[number])) {
    return [...CELL_TOWER_LAYER_IDS];
  }
  return [layerId];
}

export function shouldMountMetroProjectLayers(layers: LayerToggle[]): boolean {
  if (isAnyLayerEnabled(layers, METRO_PROJECT_ANCHOR_IDS)) return true;
  return isAnyLayerEnabled(layers, ALL_METRO_PARENT_IDS);
}

export function shouldMountSdtjCoverageLayers(layers: LayerToggle[]): boolean {
  return isAnyLayerEnabled(layers, ALL_METRO_PARENT_IDS);
}

export interface SdtjCoverageEnabled {
  sdtjHospitals: boolean;
  sdtjPolice: boolean;
  sdtjSewage: boolean;
  sdtjCellTowers: boolean;
  sdtjAmFmAntennas: boolean;
  sdtjMilitary: boolean;
  sdtjDataCenters: boolean;
}

export function deriveSdtjCoverageEnabled(layers: LayerToggle[]): SdtjCoverageEnabled {
  return {
    sdtjHospitals: isAnyLayerEnabled(layers, HOSPITAL_PARENT_IDS),
    sdtjPolice: isAnyLayerEnabled(layers, POLICE_PARENT_IDS),
    sdtjSewage: isAnyLayerEnabled(layers, SEWAGE_PARENT_IDS),
    sdtjCellTowers: isAnyLayerEnabled(layers, CELL_PARENT_IDS),
    sdtjAmFmAntennas: isAnyLayerEnabled(layers, RADIO_PARENT_IDS),
    sdtjMilitary: isAnyLayerEnabled(layers, MILITARY_PARENT_IDS),
    sdtjDataCenters: isAnyLayerEnabled(layers, DATA_CENTER_LAYER_IDS),
  };
}

export interface MetroProjectLayerEnabled {
  projectNyc: boolean;
  projectDc: boolean;
  projectVegas: boolean;
  nycHospitals: boolean;
  nycPolice: boolean;
  nycSewage: boolean;
  nycCellTowers: boolean;
  nycAmFmAntennas: boolean;
  nycMilitary: boolean;
  nycDataCenters: boolean;
  nycTransitSubway: boolean;
  nycTransitRail: boolean;
  nycAirports: boolean;
  nycGovtEmbassy: boolean;
  dcHospitals: boolean;
  dcPolice: boolean;
  dcSewage: boolean;
  dcCellTowers: boolean;
  dcAmFmAntennas: boolean;
  dcMilitary: boolean;
  dcDataCenters: boolean;
  dcTransitSubway: boolean;
  dcTransitRail: boolean;
  dcAirports: boolean;
  dcGovtEmbassy: boolean;
  vegasHospitals: boolean;
  vegasPolice: boolean;
  vegasSewage: boolean;
  vegasCellTowers: boolean;
  vegasAmFmAntennas: boolean;
  vegasMilitary: boolean;
  vegasDataCenters: boolean;
  vegasTransitSubway: boolean;
  vegasTransitRail: boolean;
  vegasAirports: boolean;
  vegasGovtEmbassy: boolean;
}

function deriveRegionInfraEnabled(layers: LayerToggle[]) {
  return {
    hospitals: isAnyLayerEnabled(layers, HOSPITAL_PARENT_IDS),
    police: isAnyLayerEnabled(layers, POLICE_PARENT_IDS),
    sewage: isAnyLayerEnabled(layers, SEWAGE_PARENT_IDS),
    cellTowers: isAnyLayerEnabled(layers, CELL_PARENT_IDS),
    amFmAntennas: isAnyLayerEnabled(layers, RADIO_PARENT_IDS),
    military: isAnyLayerEnabled(layers, MILITARY_PARENT_IDS),
    dataCenters: isAnyLayerEnabled(layers, DATA_CENTER_LAYER_IDS),
    transitSubway: isAnyLayerEnabled(layers, TRANSIT_PARENT_IDS),
    transitRail: isAnyLayerEnabled(layers, TRANSIT_PARENT_IDS),
    airports: isAnyLayerEnabled(layers, AIRPORT_PARENT_IDS),
    govtEmbassy: isAnyLayerEnabled(layers, GOVT_PARENT_IDS),
  };
}

export function deriveMetroProjectLayerEnabled(layers: LayerToggle[]): MetroProjectLayerEnabled {
  const region = deriveRegionInfraEnabled(layers);
  return {
    projectNyc: isLayerEnabled(layers, "projectNyc"),
    projectDc: isLayerEnabled(layers, "projectDc"),
    projectVegas: isLayerEnabled(layers, "projectVegas"),
    nycHospitals: region.hospitals,
    nycPolice: region.police,
    nycSewage: region.sewage,
    nycCellTowers: region.cellTowers,
    nycAmFmAntennas: region.amFmAntennas,
    nycMilitary: region.military,
    nycDataCenters: region.dataCenters,
    nycTransitSubway: region.transitSubway,
    nycTransitRail: region.transitRail,
    nycAirports: region.airports,
    nycGovtEmbassy: region.govtEmbassy,
    dcHospitals: region.hospitals,
    dcPolice: region.police,
    dcSewage: region.sewage,
    dcCellTowers: region.cellTowers,
    dcAmFmAntennas: region.amFmAntennas,
    dcMilitary: region.military,
    dcDataCenters: region.dataCenters,
    dcTransitSubway: region.transitSubway,
    dcTransitRail: region.transitRail,
    dcAirports: region.airports,
    dcGovtEmbassy: region.govtEmbassy,
    vegasHospitals: region.hospitals,
    vegasPolice: region.police,
    vegasSewage: region.sewage,
    vegasCellTowers: region.cellTowers,
    vegasAmFmAntennas: region.amFmAntennas,
    vegasMilitary: region.military,
    vegasDataCenters: region.dataCenters,
    vegasTransitSubway: region.transitSubway,
    vegasTransitRail: region.transitRail,
    vegasAirports: region.airports,
    vegasGovtEmbassy: region.govtEmbassy,
  };
}
