import { classifyAndRoute } from "@/lib/search/search-intelligence-router"
import { WORLD_VIEW_SUGGESTIONS } from "@/lib/search/world-view-suggestions"
import { recordMindexEtlImprovement } from "@/lib/mindex/etl-improvement"
import { createAdminClient } from "@/lib/supabase/server"
import type { WidgetType } from "@/lib/search/widget-registry"

export type TrendGeo = "US" | "GLOBAL" | string

export interface RawTrendTopic {
  topic: string
  geo: TrendGeo
  source: "google_trends_rss" | "google_trends_page" | "static"
  traffic?: string
  relatedQueries?: string[]
  startedAt?: string
  link?: string
}

export interface TrendReadinessPlan {
  topic: string
  normalizedQuery: string
  geo: TrendGeo
  relevanceScore: number
  categories: string[]
  primaryWidget: WidgetType | null
  widgetOrder: WidgetType[]
  enabledEarthFilters: Array<Record<string, unknown>>
  liveResultTypes: string[]
  preloadSequence: Array<{
    widget: WidgetType
    phase: "instant" | "warm" | "background"
    sourceHints: string[]
  }>
  etlMissing: string[]
  source: RawTrendTopic["source"]
  traffic?: string
  relatedQueries: string[]
}

const RELEVANT_CATEGORY_PATTERNS: Array<{ category: string; re: RegExp; weight: number }> = [
  { category: "events", re: /\b(earthquakes?|quake|seismic|volcano(?:es)?|eruption|wildfires?|fires?|floods?|tsunami|landslide|storm|hurricane|tornado|cyclone|typhoon|lightning)\b/i, weight: 5 },
  { category: "weather", re: /\b(weather|radar|forecast|temperature|heat\s*wave|cold\s*wave|drought|rain|snow|wind|air\s+quality|aqi|smoke)\b/i, weight: 5 },
  { category: "species", re: /\b(species|wildlife|animal|animals|birds?|insects?|fish|whales?|dolphins?|sharks?|bees?|coral|migration|population|biodiversity|endangered|invasive|plants?|trees?|fungi|mushrooms?)\b/i, weight: 5 },
  { category: "satellite", re: /\b(satellites?|iss|starlink|orbit|space\s+station|space\s+weather|solar\s+flare|aurora|geomagnetic)\b/i, weight: 5 },
  { category: "vehicles", re: /\b(planes?|aircraft|flights?|airport|vessels?|ships?|ports?|coast|maritime|ais|ads-?b)\b/i, weight: 5 },
  { category: "infrastructure", re: /\b(power\s+plants?|power\s+lines?|grid|substation|dams?|reservoir|nuclear|oil\s+rigs?|pipelines?|refinery|factories|cell\s+towers?|data\s+centers?|submarine\s+cables?|sea\s+cables?|railways?|military\s+bases?)\b/i, weight: 5 },
  { category: "emissions", re: /\b(co2|carbon|methane|emissions?|greenhouse|pollution|plumes?|carbon\s+mapper)\b/i, weight: 5 },
  { category: "science", re: /\b(science|research|nasa|noaa|usgs|study|discovery|climate|ocean|atmospheric|geology|hydrology)\b/i, weight: 3 },
  { category: "location", re: /\b(near\s+me|nearby|map|where|location|tracking|live|status|alert|warning|watch)\b/i, weight: 2 },
]

const IRRELEVANT_PATTERNS = [
  /\b(nba|nfl|mlb|nhl|ufc|soccer|football|basketball|baseball|golf|tennis|wwe)\b/i,
  /\b(movie|tv|netflix|hulu|disney|celebrity|actor|actress|singer|album|concert|ticket|box\s+office)\b/i,
  /\b(stock|crypto|bitcoin|price|lottery|coupon|sale|shopping|recipe|restaurant|game|gaming)\b/i,
]

const GOOGLE_TRENDS_RSS_ENDPOINTS = [
  (geo: string) => `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`,
  (geo: string) => `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${encodeURIComponent(geo)}`,
]

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim()
}

function decodeXml(value: string) {
  return stripCdata(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function firstTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match ? decodeXml(match[1] || "") : undefined
}

function allTags(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => decodeXml(match[1] || ""))
    .filter(Boolean)
}

function parseGoogleTrendsRss(xml: string, geo: TrendGeo): RawTrendTopic[] {
  return Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi))
    .map((match): RawTrendTopic | null => {
      const item = match[1] || ""
      const title = firstTag(item, "title")
      if (!title) return null
      return {
        topic: title,
        geo,
        source: "google_trends_rss",
        traffic: firstTag(item, "ht:approx_traffic") || firstTag(item, "approx_traffic"),
        relatedQueries: allTags(item, "ht:news_item_title").slice(0, 4),
        startedAt: firstTag(item, "pubDate"),
        link: firstTag(item, "link"),
      }
    })
    .filter((item): item is RawTrendTopic => Boolean(item))
}

export async function fetchGoogleTrendTopics(geos: TrendGeo[] = ["US", "GLOBAL"], limitPerGeo = 25): Promise<RawTrendTopic[]> {
  const out: RawTrendTopic[] = []
  for (const geo of geos) {
    const googleGeo = geo === "GLOBAL" ? "" : String(geo)
    for (const endpoint of GOOGLE_TRENDS_RSS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint(googleGeo), {
          signal: AbortSignal.timeout(4500),
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; MycosoftSearch/1.0; +https://mycosoft.com)",
          },
          next: { revalidate: 600 },
        })
        if (!res.ok) continue
        const xml = await res.text()
        const parsed = parseGoogleTrendsRss(xml, geo).slice(0, limitPerGeo)
        if (parsed.length > 0) {
          out.push(...parsed)
          break
        }
      } catch {
        // Try the next public Trends export endpoint.
      }
    }
  }
  return dedupeRawTrends(out)
}

export function dedupeRawTrends(trends: RawTrendTopic[]) {
  const seen = new Set<string>()
  const out: RawTrendTopic[] = []
  for (const trend of trends) {
    const key = `${trend.geo}:${trend.topic.toLowerCase().replace(/\s+/g, " ").trim()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trend)
  }
  return out
}

export function scoreTrendRelevance(query: string): { score: number; categories: string[] } {
  const normalized = query.toLowerCase()
  if (IRRELEVANT_PATTERNS.some((re) => re.test(normalized))) return { score: 0, categories: [] }
  const categories: string[] = []
  let score = 0
  for (const rule of RELEVANT_CATEGORY_PATTERNS) {
    if (rule.re.test(normalized)) {
      categories.push(rule.category)
      score += rule.weight
    }
  }
  if (/\bpower\s+plants?\b|\bnuclear\s+plants?\b|\btreatment\s+plants?\b/i.test(normalized)) {
    const idx = categories.indexOf("species")
    if (idx >= 0) categories.splice(idx, 1)
  }
  return { score, categories }
}

function sourceHintsForWidget(widget: WidgetType, categories: string[]) {
  const hints: Record<string, string[]> = {
    earth: ["CREP Earth Simulator", "MINDEX earth index", "Supabase search_trend_readiness"],
    species: ["MINDEX taxa", "iNaturalist", "GBIF"],
    research: ["MINDEX research", "OpenAlex", "CrossRef"],
    news: ["search news connector"],
    answers: ["MYCA narrative synthesis"],
    events: ["USGS", "NASA EONET", "NOAA/NWS"],
    weather: ["NOAA/NWS", "Open-Meteo", "NASA GIBS"],
    aircraft: ["ADS-B/FlightRadar24", "MINDEX aircraft"],
    vessels: ["AISstream", "MINDEX vessels"],
    satellites: ["CelesTrak/SatNOGS", "TLE propagation"],
    space_assets: ["CelesTrak", "orbital registry"],
    space_weather: ["NOAA SWPC"],
    emissions: ["Carbon Mapper", "OpenAQ"],
    infrastructure: ["OpenStreetMap", "EIA/HIFLD", "MINDEX infrastructure"],
    air_quality: ["OpenAQ", "AirNow"],
  }
  return hints[widget] ?? [`${categories.join(", ") || "search"} connector`]
}

function phaseForWidget(widget: WidgetType): "instant" | "warm" | "background" {
  if (widget === "earth" || widget === "answers") return "instant"
  if (["species", "events", "aircraft", "vessels", "satellites", "emissions", "infrastructure", "weather"].includes(widget)) return "warm"
  return "background"
}

export function buildTrendReadinessPlan(trend: RawTrendTopic): TrendReadinessPlan | null {
  const normalizedQuery = trend.topic.replace(/\s+/g, " ").trim()
  if (!normalizedQuery) return null
  const relevance = scoreTrendRelevance([normalizedQuery, ...(trend.relatedQueries ?? [])].join(" "))
  if (relevance.score < 5) return null
  const route = classifyAndRoute(normalizedQuery)
  const widgetOrder = (route.searchPlan?.widgetOrder?.length
    ? route.searchPlan.widgetOrder
    : [route.primaryWidget, ...route.secondaryWidgets].filter(Boolean)) as WidgetType[]
  const uniqueWidgetOrder = Array.from(new Set(widgetOrder)).slice(0, 8)
  return {
    topic: trend.topic,
    normalizedQuery,
    geo: trend.geo,
    relevanceScore: relevance.score,
    categories: relevance.categories,
    primaryWidget: route.primaryWidget,
    widgetOrder: uniqueWidgetOrder,
    enabledEarthFilters: route.earthContextFilters.enabledFilters as unknown as Array<Record<string, unknown>>,
    liveResultTypes: route.liveResultTypes,
    preloadSequence: uniqueWidgetOrder.map((widget) => ({
      widget,
      phase: phaseForWidget(widget),
      sourceHints: sourceHintsForWidget(widget, relevance.categories),
    })),
    etlMissing: route.searchPlan?.etlRequests?.map((request) => request.missingDataKind) ?? [],
    source: trend.source,
    traffic: trend.traffic,
    relatedQueries: trend.relatedQueries ?? [],
  }
}

export async function getTrendReadinessPlans(options: {
  geos?: TrendGeo[]
  limit?: number
  includeStaticFallback?: boolean
} = {}) {
  const geos = options.geos ?? ["US", "GLOBAL"]
  const limit = options.limit ?? 20
  const fetched = await fetchGoogleTrendTopics(geos, Math.max(limit, 25))
  const fallback = options.includeStaticFallback === false
    ? []
    : Object.values(WORLD_VIEW_SUGGESTIONS).flat().map((topic): RawTrendTopic => ({
        topic,
        geo: "GLOBAL",
        source: "static",
        relatedQueries: [],
      }))
  const plans = dedupeRawTrends([...fetched, ...fallback])
    .map(buildTrendReadinessPlan)
    .filter((plan): plan is TrendReadinessPlan => Boolean(plan))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
  return plans.slice(0, limit)
}

export async function queueTrendReadinessEtl(plans: TrendReadinessPlan[], route = "/api/search/trends") {
  const queued = []
  for (const plan of plans) {
    const missing = plan.etlMissing.length > 0
      ? plan.etlMissing
      : plan.preloadSequence
          .filter((step) => step.phase !== "background")
          .map((step) => `${step.widget} live data cache`)
    const result = await recordMindexEtlImprovement({
      source: "google-trends-readiness",
      app: "search",
      route,
      query: plan.normalizedQuery,
      missing,
      context: {
        geo: plan.geo,
        traffic: plan.traffic,
        categories: plan.categories,
        widgetOrder: plan.widgetOrder,
        enabledEarthFilters: plan.enabledEarthFilters,
        liveResultTypes: plan.liveResultTypes,
        preloadSequence: plan.preloadSequence,
      },
    })
    queued.push({ query: plan.normalizedQuery, ...result })
  }
  return queued
}

export async function persistTrendReadinessPlans(plans: TrendReadinessPlan[]) {
  if (plans.length === 0) return { recorded: 0 }
  try {
    const supabase = await createAdminClient()
    const rows = plans.map((plan) => ({
      geo: plan.geo,
      source: plan.source,
      topic: plan.topic,
      normalized_query: plan.normalizedQuery,
      relevance_score: plan.relevanceScore,
      categories: plan.categories,
      primary_widget: plan.primaryWidget,
      widget_order: plan.widgetOrder,
      enabled_earth_filters: plan.enabledEarthFilters,
      live_result_types: plan.liveResultTypes,
      preload_sequence: plan.preloadSequence,
      etl_missing: plan.etlMissing,
      traffic: plan.traffic || null,
      related_queries: plan.relatedQueries,
      warm_status: "planned",
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase
      .from("search_trend_readiness")
      .upsert(rows, { onConflict: "geo,normalized_query" })
    if (error) throw error
    return { recorded: rows.length }
  } catch (error) {
    console.warn("[trend-readiness] Could not persist plans:", error)
    return { recorded: 0, error: error instanceof Error ? error.message : String(error) }
  }
}
