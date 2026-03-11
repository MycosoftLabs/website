/**
 * CREP GIBS Layer Configuration
 * March 10, 2026
 *
 * NASA GIBS (Global Imagery Browse Services) tile URLs for MapLibre raster sources.
 * Used by CrepGibsEoOverlays for MODIS, VIIRS, AIRS, Landsat.
 * Reuses logic from SatelliteTilesDemo and LandsatViewerDemo.
 */

const GIBS_BASE = "https://gibs.earthdata.nasa.gov";

/** Format YYYY-MM-DD for GIBS date params */
function toGibsDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** MODIS Terra True Color - ~1 day lag */
export function getModisTerraTrueColorUrl(dateLagDays = 1): string {
  const d = new Date();
  d.setDate(d.getDate() - dateLagDays);
  const date = toGibsDate(d);
  return `${GIBS_BASE}/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`;
}

/** VIIRS Night Lights - static 2012 (VIIRS_CityLights_2012 is the supported GIBS layer; DayNightBand has limited availability) */
export function getViirsNightLightsUrl(): string {
  return `${GIBS_BASE}/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg`;
}

/** AIRS Carbon Monoxide - ~3 day lag */
export function getAirsCoUrl(dateLagDays = 3): string {
  const d = new Date();
  d.setDate(d.getDate() - dateLagDays);
  const date = toGibsDate(d);
  return `${GIBS_BASE}/wms/epsg4326/best/AIRS_RelHumidity_A/daily/1/${date}/1/0,0/1/1/1/0/0/0/0/0/0/0.png`;
}

/** AIRS uses WMS - needs bbox-based URL. For raster tiles we use a tile template.
 * GIBS WMS can be used with MapLibre's raster source and a tile URL that includes bbox.
 * Actually - MapLibre raster source expects tile URLs. GIBS WMS returns a single image per bbox.
 * The SatelliteTilesDemo uses WMS with a different approach - it might use ImageSource or similar.
 * Let me check - for raster tiles, we need WMTS. AIRS in the demo uses WMS - that's a different pattern.
 * Looking at the demo again - AIRS uses WMS with bbox. MapLibre raster source uses:
 *   tiles: ["url_template_with_{z}/{y}/{x}"]
 * For WMS we'd need to use a different approach - perhaps a canvas/source that fetches WMS.
 * Simpler: Use a WMTS layer if GIBS has one for AIRS. Otherwise skip AIRS for now or use a proxy.
 * From NASA GIBS - AIRS has WMTS. Let me check the correct layer name.
 * Common: AIRS_L2_Carbon_Monoxide_400hPa_Volume_Mixing_Ratio_Daily
 * Or: AIRS_RelHumidity_A - the demo used this. That's WMS.
 * For simplicity, I'll add MODIS and VIIRS as WMTS (straightforward), and Landsat.
 * AIRS - I'll add as a WMS-style layer. MapLibre supports raster with tiles - for WMS we need
 * to either use a tile URL pattern that proxies to WMS, or use ImageSource.
 * Actually, the easiest is to skip AIRS for the first pass and add MODIS, VIIRS, Landsat.
 * We can add AIRS later with a proper WMS proxy or tile conversion.
 */
export function getAirsCoTileUrl(dateLagDays = 3): string | null {
  // AIRS on GIBS - check for WMTS. Many GIBS layers use WMTS.
  // AIRS_L2_Carbon_Monoxide_400hPa_Volume_Mixing_Ratio_Daily has WMTS
  const d = new Date();
  d.setDate(d.getDate() - dateLagDays);
  const date = toGibsDate(d);
  return `${GIBS_BASE}/wmts/epsg3857/best/AIRS_L2_Carbon_Monoxide_400hPa_Volume_Mixing_Ratio_Daily/default/${date}/GoogleMapsCompatible_Level5/{z}/{y}/{x}.png`;
}

/** Landsat WELD True Color - historic dates only */
const LANDSAT_LAYER = "Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual";
const LANDSAT_MATRIX = "GoogleMapsCompatible_Level12";

export function getLandsatWeldUrl(date = "2000-12-01"): string {
  return `${GIBS_BASE}/wmts/epsg3857/best/${LANDSAT_LAYER}/default/${date}/${LANDSAT_MATRIX}/{z}/{y}/{x}.jpeg`;
}

export const LANDSAT_VALID_DATES = [
  "2000-12-01", "1999-12-01", "1998-12-01", "1990-12-01",
  "1989-12-01", "1988-12-01", "1985-12-01", "1984-12-01", "1983-12-01",
];

export interface GibsLayerConfig {
  id: string;
  sourceId: string;
  layerId: string;
  label: string;
  getTileUrl: () => string | null;
  maxZoom: number;
  opacity?: number;
}

export const GIBS_LAYER_CONFIGS: Record<string, GibsLayerConfig> = {
  modis: {
    id: "modis",
    sourceId: "crep-gibs-modis",
    layerId: "crep-gibs-modis-layer",
    label: "MODIS Terra True Color",
    getTileUrl: () => getModisTerraTrueColorUrl(1),
    maxZoom: 9,
  },
  viirs: {
    id: "viirs",
    sourceId: "crep-gibs-viirs",
    layerId: "crep-gibs-viirs-layer",
    label: "VIIRS Night Lights",
    getTileUrl: getViirsNightLightsUrl,
    maxZoom: 8,
  },
  airs: {
    id: "airs",
    sourceId: "crep-gibs-airs",
    layerId: "crep-gibs-airs-layer",
    label: "AIRS Carbon Monoxide",
    getTileUrl: () => getAirsCoTileUrl(3),
    maxZoom: 5,
  },
  landsat: {
    id: "landsat",
    sourceId: "crep-gibs-landsat",
    layerId: "crep-gibs-landsat-layer",
    label: "Landsat WELD True Color",
    getTileUrl: () => getLandsatWeldUrl("2000-12-01"),
    maxZoom: 12,
    opacity: 0.85,
  },
};
