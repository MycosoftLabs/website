import { fieldLayerId } from "@/lib/crep/fields/registry"

export type GcsWxLayerKey =
  | "wxTemp"
  | "wxPrecip"
  | "wxRadar"
  | "wxMrms"
  | "wxSolar"
  | "wxGpp"
  | "wxNdvi"
  | "wxBiomass"

export interface GcsWxCatalogEntry {
  key: GcsWxLayerKey
  label: string
  dataset: string
  variable: string
  layerId: string
  staticDataset: boolean
  opacity: number
}

/** Climate/weather GCS layers bound to the shared Arraylake field catalog. */
export const GCS_WX_CATALOG: readonly GcsWxCatalogEntry[] = [
  { key: "wxMrms", label: "Radar (MRMS 1 km)", dataset: "mrms", variable: "refc", layerId: fieldLayerId("mrms", "refc"), staticDataset: false, opacity: 0.85 },
  { key: "wxRadar", label: "Radar forecast (HRRR)", dataset: "hrrr", variable: "refc", layerId: fieldLayerId("hrrr", "refc"), staticDataset: false, opacity: 0.8 },
  { key: "wxTemp", label: "Air temperature (ERA5)", dataset: "era5", variable: "t2m", layerId: fieldLayerId("era5", "t2m"), staticDataset: false, opacity: 0.65 },
  { key: "wxPrecip", label: "Precipitation (ERA5)", dataset: "era5", variable: "tp", layerId: fieldLayerId("era5", "tp"), staticDataset: false, opacity: 0.8 },
  { key: "wxSolar", label: "Solar irradiance (Helios)", dataset: "helios", variable: "ghi", layerId: fieldLayerId("helios", "ghi"), staticDataset: false, opacity: 0.6 },
  { key: "wxGpp", label: "Carbon uptake · GPP", dataset: "alive", variable: "gpp", layerId: fieldLayerId("alive", "gpp"), staticDataset: false, opacity: 0.6 },
  { key: "wxNdvi", label: "Greenness · NDVI", dataset: "sentinel2", variable: "ndvi", layerId: fieldLayerId("sentinel2", "ndvi"), staticDataset: false, opacity: 0.7 },
  { key: "wxBiomass", label: "Biomass carbon (AGB)", dataset: "biomass-global", variable: "agb", layerId: fieldLayerId("biomass-global", "agb"), staticDataset: true, opacity: 0.7 },
]

export const GCS_WX_LAYER_IDS = GCS_WX_CATALOG.map((entry) => entry.layerId)
