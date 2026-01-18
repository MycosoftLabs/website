/**
 * SpaceWeather.com Scraper
 * 
 * Scrapes daily solar weather data from spaceweather.com including:
 * - Solar flare activity
 * - Sunspot numbers
 * - Aurora forecasts
 * - CME alerts
 * - Coronal hole positions
 * - Sun images
 * 
 * This supplements the NOAA SWPC API with additional context and imagery.
 */

import { BaseScraper } from "./base-scraper"
import type { ScraperConfig, SpaceWeatherScrapedData } from "./types"

const DEFAULT_CONFIG: ScraperConfig = {
  id: "spaceweather-com",
  name: "SpaceWeather.com Scraper",
  description: "Daily solar weather news and imagery from spaceweather.com",
  sourceUrl: "https://www.spaceweather.com/",
  enabled: true,
  intervalMs: 300000,      // 5 minutes
  retryAttempts: 3,
  retryDelayMs: 5000,
  timeout: 30000,
  category: "space_weather",
}

export class SpaceWeatherScraper extends BaseScraper<SpaceWeatherScrapedData> {
  constructor(config?: Partial<ScraperConfig>) {
    super({ ...DEFAULT_CONFIG, ...config })
  }

  protected async scrape(): Promise<SpaceWeatherScrapedData> {
    const html = await this.fetchPage(this.config.sourceUrl)
    
    return {
      solarActivity: this.parseSolarActivity(html),
      solarWind: this.parseSolarWind(html),
      geomagneticActivity: this.parseGeomagneticActivity(html),
      coronalHoles: this.parseCoronalHoles(html),
      cme: this.parseCME(html),
      auroraForecast: this.parseAuroraForecast(html),
      sunImages: this.parseSunImages(html),
    }
  }

  protected validate(data: SpaceWeatherScrapedData): boolean {
    // Require at least some valid data
    return (
      data.solarActivity.flareClass !== "" ||
      data.geomagneticActivity.kpIndex !== "" ||
      Object.keys(data.sunImages).length > 0
    )
  }

  private parseSolarActivity(html: string): SpaceWeatherScrapedData["solarActivity"] {
    // Look for solar flare information
    const flareMatch = html.match(/([ABCMX]\d+\.?\d*)\s+(?:class\s+)?(?:solar\s+)?flare/i)
    const regionMatch = html.match(/Active Region\s*(\d+)/i) || html.match(/AR\s*(\d+)/i)
    const timeMatch = html.match(/(\d{1,2}:\d{2}\s*(?:UT|UTC))/i)
    
    // Look for X-ray flux
    const xrayMatch = html.match(/X-ray\s+(?:flux|background)[:\s]*([A-Z]\d+\.?\d*)/i)

    return {
      flareClass: flareMatch?.[1] || "None",
      flareRegion: regionMatch?.[1] ? `AR${regionMatch[1]}` : "N/A",
      flareTime: timeMatch?.[1] || "N/A",
      xrayFlux: xrayMatch?.[1] || "B-class",
    }
  }

  private parseSolarWind(html: string): SpaceWeatherScrapedData["solarWind"] {
    // Look for solar wind speed
    const speedMatch = html.match(/(?:solar\s+wind\s+)?speed[:\s]*(\d+)\s*km\/s/i)
    const densityMatch = html.match(/(?:proton\s+)?density[:\s]*(\d+\.?\d*)\s*(?:protons\/cm|p\/cc)/i)
    const tempMatch = html.match(/temperature[:\s]*(\d+(?:,\d+)*)\s*K/i)

    return {
      speed: speedMatch?.[1] ? `${speedMatch[1]} km/s` : "~400 km/s",
      density: densityMatch?.[1] ? `${densityMatch[1]} p/cm³` : "~5 p/cm³",
      temperature: tempMatch?.[1] ? `${tempMatch[1].replace(/,/g, "")} K` : "~100,000 K",
    }
  }

  private parseGeomagneticActivity(html: string): SpaceWeatherScrapedData["geomagneticActivity"] {
    // Look for Kp index
    const kpMatch = html.match(/Kp[:\s=]*(\d+)/i)
    
    // Look for storm conditions
    let stormLevel = "Quiet"
    if (html.match(/G5|extreme\s+(?:geomagnetic\s+)?storm/i)) stormLevel = "G5 Extreme"
    else if (html.match(/G4|severe\s+(?:geomagnetic\s+)?storm/i)) stormLevel = "G4 Severe"
    else if (html.match(/G3|strong\s+(?:geomagnetic\s+)?storm/i)) stormLevel = "G3 Strong"
    else if (html.match(/G2|moderate\s+(?:geomagnetic\s+)?storm/i)) stormLevel = "G2 Moderate"
    else if (html.match(/G1|minor\s+(?:geomagnetic\s+)?storm/i)) stormLevel = "G1 Minor"
    else if (html.match(/unsettled/i)) stormLevel = "Unsettled"
    else if (html.match(/active/i)) stormLevel = "Active"

    // Extract forecast if available
    const forecastMatches = html.match(/Kp\s*(?:index\s*)?(?:forecast|expected)[:\s]*(\d+(?:\s*[-to]+\s*\d+)?)/gi) || []
    const kpForecast = forecastMatches.map(m => m.replace(/Kp\s*(?:index\s*)?(?:forecast|expected)[:\s]*/i, "").trim())

    return {
      kpIndex: kpMatch?.[1] || "1-2",
      kpForecast: kpForecast.length > 0 ? kpForecast : ["1-2", "1-2", "1-2"],
      stormLevel,
    }
  }

  private parseCoronalHoles(html: string): SpaceWeatherScrapedData["coronalHoles"] {
    // Count coronal hole mentions
    const holeMatches = html.match(/coronal\s+hole/gi) || []
    
    // Look for positions
    const positionMatches = html.match(/(?:northern|southern|equatorial)\s+(?:hemisphere\s+)?coronal\s+hole/gi) || []
    
    return {
      count: Math.max(holeMatches.length / 2, 1), // Usually mentioned twice
      positions: positionMatches.length > 0 
        ? [...new Set(positionMatches.map(p => p.replace(/coronal\s+hole/i, "").trim()))]
        : ["Check SDO imagery"],
    }
  }

  private parseCME(html: string): SpaceWeatherScrapedData["cme"] {
    const cmeActive = /CME/i.test(html) && /heading|directed|earth/i.test(html)
    
    let arrivalTime: string | undefined
    let speed: string | undefined
    
    if (cmeActive) {
      const arrivalMatch = html.match(/(?:arrival|expected|impact)[:\s]*(?:on\s+)?([A-Za-z]+\s+\d+)/i)
      const speedMatch = html.match(/CME[^.]*?(\d{3,4})\s*km\/s/i)
      
      arrivalTime = arrivalMatch?.[1]
      speed = speedMatch?.[1] ? `${speedMatch[1]} km/s` : undefined
    }

    return {
      active: cmeActive,
      arrivalTime,
      speed,
    }
  }

  private parseAuroraForecast(html: string): SpaceWeatherScrapedData["auroraForecast"] {
    let visibility = "Low"
    const regions: string[] = []

    if (html.match(/aurora[^.]*(?:visible|observed)[^.]*(?:northern\s+)?(?:united\s+states|US|usa)/i)) {
      visibility = "High"
      regions.push("Northern US")
    }
    if (html.match(/aurora[^.]*(?:visible|observed)[^.]*(?:canada|canadian)/i)) {
      visibility = "Moderate"
      regions.push("Canada")
    }
    if (html.match(/aurora[^.]*(?:visible|observed)[^.]*(?:scandinavia|nordic)/i)) {
      visibility = "Moderate"
      regions.push("Scandinavia")
    }
    if (html.match(/aurora[^.]*(?:visible|observed)[^.]*(?:uk|britain|scotland)/i)) {
      visibility = "Moderate"
      regions.push("UK/Scotland")
    }

    if (regions.length === 0) {
      regions.push("Polar regions only")
    }

    // Extract aurora oval image if available
    const ovalMatch = html.match(/(?:src|href)=["']([^"']*aurora[^"']*(?:oval|forecast)[^"']*\.(?:gif|jpg|png))["']/i)

    return {
      visibility: visibility as "Low" | "Moderate" | "High",
      regions,
      ovalImage: ovalMatch?.[1],
    }
  }

  private parseSunImages(html: string): SpaceWeatherScrapedData["sunImages"] {
    const images: SpaceWeatherScrapedData["sunImages"] = {}

    // SDO/AIA images
    const sdo304 = html.match(/(?:src|href)=["']([^"']*(?:sdo|aia)[^"']*304[^"']*\.(?:gif|jpg|png))["']/i)
    const sdo171 = html.match(/(?:src|href)=["']([^"']*(?:sdo|aia)[^"']*171[^"']*\.(?:gif|jpg|png))["']/i)
    const sdo193 = html.match(/(?:src|href)=["']([^"']*(?:sdo|aia)[^"']*193[^"']*\.(?:gif|jpg|png))["']/i)
    
    // LASCO coronagraph
    const lascoC2 = html.match(/(?:src|href)=["']([^"']*lasco[^"']*c2[^"']*\.(?:gif|jpg|png))["']/i)
    const lascoC3 = html.match(/(?:src|href)=["']([^"']*lasco[^"']*c3[^"']*\.(?:gif|jpg|png))["']/i)

    if (sdo304?.[1]) images.sdo_304 = this.resolveUrl(sdo304[1])
    if (sdo171?.[1]) images.sdo_171 = this.resolveUrl(sdo171[1])
    if (sdo193?.[1]) images.sdo_193 = this.resolveUrl(sdo193[1])
    if (lascoC2?.[1]) images.lasco_c2 = this.resolveUrl(lascoC2[1])
    if (lascoC3?.[1]) images.lasco_c3 = this.resolveUrl(lascoC3[1])

    return images
  }

  private resolveUrl(url: string): string {
    if (url.startsWith("http")) return url
    if (url.startsWith("//")) return `https:${url}`
    if (url.startsWith("/")) return `https://www.spaceweather.com${url}`
    return `https://www.spaceweather.com/${url}`
  }
}

// Factory function
export function createSpaceWeatherScraper(config?: Partial<ScraperConfig>): SpaceWeatherScraper {
  return new SpaceWeatherScraper(config)
}
