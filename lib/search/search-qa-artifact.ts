import { classifyAndRoute } from "./search-intelligence-router"
import type { SearchPlan, SearchEntityFamily } from "./search-plan"
import type { WidgetType } from "./widget-registry"
import { WIDGET_REGISTRY } from "./widget-registry"

export type SearchQaSeverity = "pass" | "info" | "warn" | "fail" | "critical"

export interface SearchQaScenario {
  id: string
  query: string
  sourcePath: "home-to-search"
  category: string
  trendIntent: string
  expectedPrimaryWidget: WidgetType | null
  expectedWidgets: WidgetType[]
  expectedEarthLayers: string[]
  forbiddenEarthLayers: string[]
  expectedLiveResultTypes: string[]
  expectedWidgetData: Record<string, SearchQaWidgetExpectation>
  mycaCoordination: SearchQaMycaExpectation
  latencyBudgetMs: SearchQaLatencyBudget
  acceptanceChecks: string[]
  routeWhy: string[]
  searchPlan: SearchPlan | null
}

export interface SearchQaWidgetExpectation {
  required: boolean
  dataRequired: boolean
  priority: number
  expectedContent: string[]
  emptyState: "hide" | "show-acquiring" | "show-source-health" | "allowed"
  clickThroughRequired: boolean
  etlIfEmpty: boolean
}

export interface SearchQaMycaExpectation {
  shouldCoordinate: boolean
  actions: string[]
  promptContext: string[]
}

export interface SearchQaLatencyBudget {
  homeSubmitToSearchMs: number
  firstWidgetMs: number
  primaryDataMs: number
  earthInteractiveMs: number
  fullHydrationMs: number
}

export interface SearchQaObservation {
  scenarioId: string
  query: string
  url?: string
  homeSubmitted?: boolean
  navigationMs?: number
  firstWidgetMs?: number
  fullHydrationMs?: number
  renderedWidgets: WidgetType[]
  widgetsWithData: Record<string, number>
  widgetsWithNoData: WidgetType[]
  earthLayers: string[]
  visibleTextSample?: string
  linkAudit?: {
    total: number
    broken: Array<{ href: string; status?: number; reason: string }>
  }
  rawTimeoutVisible?: boolean
  chunkErrorVisible?: boolean
  consoleErrors?: string[]
  qaSnapshot?: Record<string, unknown>
}

export interface SearchQaFinding {
  severity: SearchQaSeverity
  scenarioId: string
  query: string
  code: string
  message: string
  expected?: unknown
  observed?: unknown
  recommendedFix: string
  likelyFiles: string[]
}

export interface SearchQaReport {
  generatedAt: string
  scenarioCount: number
  observationCount: number
  passCount: number
  findingCount: number
  criticalCount: number
  scenarios: SearchQaScenario[]
  observations: SearchQaObservation[]
  findings: SearchQaFinding[]
  prioritizedFixes: string[]
  agentPrompt: string
}

const TRENDING_QUALIFIERS = [
  "active",
  "live",
  "latest",
  "near me",
  "near {place}",
  "over {place}",
  "risk to",
  "damage to",
  "show me all",
  "hide {layer} show {layer}",
]

const WORD_BANK = {
  events: ["earthquakes", "wildfires", "storms", "tornadoes", "volcanoes", "floods", "landslides", "drought", "lightning", "oil spills", "disease outbreaks"],
  infrastructure: ["power lines", "transmission lines", "power plants", "substations", "data centers", "cell towers", "ports", "factories", "bridges", "dams", "pipelines", "submarine cables", "rail lines", "airports"],
  species: ["Amanita muscaria", "Lion's mane", "endangered birds", "invasive plants", "bees", "dolphins", "fungi", "crop diseases", "migratory birds", "rare orchids"],
  vehicles: ["aircraft", "flights", "vessels", "ships", "cargo vessels", "fishing boats", "trains", "satellites", "Starlink", "ISS"],
  weather: ["weather", "radar", "precipitation", "smoke", "air quality", "hurricanes", "wind", "temperature", "snowpack", "flood warnings"],
  science: ["genes", "genomes", "variants", "compounds", "toxins", "metabolites", "research papers", "chemistry", "genetic pathways"],
  devices: ["MYCOSOFT devices", "sensors", "cameras", "MycoBrain", "Sporebase", "field nodes", "telemetry"],
  places: ["California", "Los Angeles", "Oregon", "Japan", "Ukraine", "North Atlantic", "Amazon", "Gulf of Mexico", "Seattle", "Hawaii", "San Diego", "Pacific Northwest"],
  layers: ["aircraft", "vessels", "weather", "power lines", "wildfires", "species", "cameras", "satellites"],
} as const

const TEMPLATE_QUERIES = [
  "{event}",
  "{event} near {place}",
  "{event} near {infrastructure}",
  "{event} near {species} habitat",
  "{weather} over {infrastructure}",
  "{weather} near {place}",
  "{vehicle} over {place}",
  "{vehicle} near {infrastructure}",
  "{vehicle} near {layer}",
  "{species} in {place}",
  "{species} genetics chemistry research",
  "{species} near {event}",
  "{science} for {species}",
  "{infrastructure} near {place}",
  "{infrastructure} at risk from {event}",
  "{devices} near {event}",
  "show me all {layer} on the map",
  "show me everything on the map",
  "hide {layer} and show {layer}",
  "latest {event} news and research",
]

const CATEGORY_BY_FAMILY: Record<SearchEntityFamily, string> = {
  events: "active-event",
  species: "species-organism",
  genetics: "genetics",
  chemistry: "chemistry",
  infrastructure: "infrastructure-risk",
  vehicles: "vehicle-tracking",
  weather: "weather-hazard",
  devices: "device-telemetry",
  space: "space-assets",
  emissions: "emissions",
  marine: "marine",
  transport: "transport",
  economy_content: "content",
  general: "general",
}

function valuesForToken(token: string): readonly string[] {
  if (token === "event") return WORD_BANK.events
  if (token === "infrastructure") return WORD_BANK.infrastructure
  if (token === "species") return WORD_BANK.species
  if (token === "vehicle") return WORD_BANK.vehicles
  if (token === "weather") return WORD_BANK.weather
  if (token === "science") return WORD_BANK.science
  if (token === "devices") return WORD_BANK.devices
  if (token === "place") return WORD_BANK.places
  if (token === "layer") return WORD_BANK.layers
  return [token]
}

function expandTemplate(template: string, cap = 5000): string[] {
  const token = template.match(/\{([^}]+)\}/)?.[1]
  if (!token) return [template]
  const out: string[] = []
  for (const value of valuesForToken(token)) {
    for (const expanded of expandTemplate(template.replace(`{${token}}`, value), cap)) {
      out.push(expanded)
      if (out.length >= cap) return out
    }
  }
  return out
}

export function generateSearchQaQueries(limit = 2500): string[] {
  const direct = [
    "Active earthquakes",
    "earthquakes near power lines and power plants",
    "show me everything on the map",
    "Amanita muscaria near Oregon",
    "aircraft over Los Angeles",
    "vessels near submarine cables",
    "satellites over Ukraine",
    "endangered species near wildfires",
    "weather over power plants",
    "cameras near active events",
  ]
  const generated = TEMPLATE_QUERIES.flatMap((template) => expandTemplate(template, limit))
  const qualified = TRENDING_QUALIFIERS.flatMap((prefix) =>
    WORD_BANK.events.slice(0, 6).flatMap((event) =>
      WORD_BANK.places.slice(0, 6).map((place) =>
        prefix.replace("{place}", place).replace("{layer}", "weather") + " " + event
      )
    )
  )
  return [...new Set([...direct, ...generated, ...qualified].map((q) => q.replace(/\s+/g, " ").trim()))].slice(0, limit)
}

export function buildSearchQaScenario(query: string, index = 0): SearchQaScenario {
  const route = classifyAndRoute(query)
  const plan = route.searchPlan ?? null
  const families = plan?.entityFamilies ?? ["general"]
  const category = CATEGORY_BY_FAMILY[families[0] ?? "general"] ?? "general"
  const expectedWidgets = plan?.widgetOrder ?? []
  const expectedWidgetData = Object.fromEntries(
    expectedWidgets.map((widget, idx) => {
      const entry = WIDGET_REGISTRY[widget]
      const isEarth = widget === "earth"
      const isAnswer = widget === "answers"
      const isStrategic = ["risk", "power_grid", "supply_chain", "biosecurity", "conservation", "geology", "hydrology", "wildfire", "air_quality", "space_assets", "marine", "transport", "source_health"].includes(widget)
      return [widget, {
        required: idx < 6 || isEarth,
        dataRequired: isEarth || (!isAnswer && !isStrategic && entry?.emptyPolicy !== "show_empty"),
        priority: idx + 1,
        expectedContent: expectedContentForWidget(widget, plan),
        emptyState: isStrategic ? "show-acquiring" : entry?.emptyPolicy === "hide" ? "hide" : "allowed",
        clickThroughRequired: ["events", "news", "research", "aircraft", "vessels", "satellites", "infrastructure", "cameras"].includes(widget),
        etlIfEmpty: widget !== "answers" && widget !== "earth",
      } satisfies SearchQaWidgetExpectation]
    })
  )

  return {
    id: `sqa-${String(index + 1).padStart(5, "0")}`,
    query,
    sourcePath: "home-to-search",
    category,
    trendIntent: families.join("+"),
    expectedPrimaryWidget: plan?.primaryWidget ?? null,
    expectedWidgets,
    expectedEarthLayers: plan?.earth?.enabledLayers ?? [],
    forbiddenEarthLayers: plan?.earth?.disabledLayers ?? [],
    expectedLiveResultTypes: plan?.liveResultTypes ?? [],
    expectedWidgetData,
    mycaCoordination: buildMycaExpectation(plan, query),
    latencyBudgetMs: {
      homeSubmitToSearchMs: 2200,
      firstWidgetMs: 3500,
      primaryDataMs: 8000,
      earthInteractiveMs: 9000,
      fullHydrationMs: 15000,
    },
    acceptanceChecks: buildAcceptanceChecks(plan),
    routeWhy: buildRouteWhy(plan, query),
    searchPlan: plan,
  }
}

export function buildSearchQaArtifact(limit = 2500) {
  const scenarios = generateSearchQaQueries(limit).map(buildSearchQaScenario)
  return {
    generatedAt: new Date().toISOString(),
    version: "search-qa-artifact-v1",
    scenarioCount: scenarios.length,
    wordBank: WORD_BANK,
    templates: TEMPLATE_QUERIES,
    scenarios,
    exportContract: {
      observationWindow: "__MYCOSOFT_SEARCH_QA__",
      jsonOutput: "artifacts/search-qa/search-qa-results-<timestamp>.json",
      fixPromptOutput: "artifacts/search-qa/search-qa-fix-prompt-<timestamp>.md",
    },
    agentPrompt: buildAgentPrompt({ scenarios, observations: [], findings: [] }),
  }
}

export function evaluateSearchQaObservations(
  scenarios: SearchQaScenario[],
  observations: SearchQaObservation[],
): SearchQaReport {
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const findings = observations.flatMap((observation) => {
    const scenario = scenarioById.get(observation.scenarioId)
    return scenario ? evaluateObservation(scenario, observation) : []
  })
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length
  const passCount = observations.length - new Set(findings.map((finding) => finding.scenarioId)).size
  const prioritizedFixes = prioritizeFixes(findings)
  return {
    generatedAt: new Date().toISOString(),
    scenarioCount: scenarios.length,
    observationCount: observations.length,
    passCount,
    findingCount: findings.length,
    criticalCount,
    scenarios,
    observations,
    findings,
    prioritizedFixes,
    agentPrompt: buildAgentPrompt({ scenarios, observations, findings }),
  }
}

function evaluateObservation(scenario: SearchQaScenario, observation: SearchQaObservation): SearchQaFinding[] {
  const findings: SearchQaFinding[] = []
  const rendered = new Set(observation.renderedWidgets)
  const layers = new Set(observation.earthLayers)
  if (!observation.homeSubmitted) {
    findings.push(finding("fail", scenario, "HOME_SUBMIT_FAILED", "Home page search did not submit into the search page.", true, observation.homeSubmitted, "Fix homepage search form navigation and Enter/click handlers.", ["components/home/hero-search.tsx"]))
  }
  if (scenario.expectedPrimaryWidget && observation.renderedWidgets[0] !== scenario.expectedPrimaryWidget) {
    findings.push(finding("fail", scenario, "PRIMARY_WIDGET_ORDER", "Primary widget did not render first.", scenario.expectedPrimaryWidget, observation.renderedWidgets[0], "Adjust SearchPlan widget priority or mobile/desktop widget ordering.", ["lib/search/search-plan.ts", "components/search/fluid/FluidSearchCanvas.tsx"]))
  }
  for (const widget of scenario.expectedWidgets.filter((w) => scenario.expectedWidgetData[w]?.required)) {
    if (!rendered.has(widget)) {
      findings.push(finding("fail", scenario, "MISSING_WIDGET", `Expected ${widget} widget did not render.`, widget, observation.renderedWidgets, "Wire the widget into the SearchPlan, registry, and FluidSearchCanvas expansion rules.", ["lib/search/search-plan.ts", "lib/search/widget-registry.ts", "components/search/fluid/FluidSearchCanvas.tsx"]))
    }
  }
  for (const [widget, expectation] of Object.entries(scenario.expectedWidgetData)) {
    const count = observation.widgetsWithData[widget] ?? 0
    if (expectation.dataRequired && rendered.has(widget as WidgetType) && count === 0) {
      findings.push(finding("fail", scenario, "EMPTY_REQUIRED_WIDGET", `${widget} rendered without required data.`, expectation.expectedContent, count, "Connect the widget to authoritative data, trigger ETL acquisition, or hide until hydrated.", ["app/api/search/unified/route.ts", "lib/search/earth-search-connectors.ts", "components/search/fluid/FluidSearchCanvas.tsx"]))
    }
  }
  if (scenario.expectedEarthLayers.length) {
    for (const layer of scenario.expectedEarthLayers) {
      if (!layers.has(layer)) {
        findings.push(finding("critical", scenario, "MISSING_EARTH_LAYER", `Earth layer ${layer} is missing.`, scenario.expectedEarthLayers, observation.earthLayers, "Fix EarthSearchRule layer mapping and CREP embedded layer gating.", ["lib/search/earth-search-rules.ts", "app/dashboard/crep/CREPDashboardClient.tsx"]))
      }
    }
    const forbiddenVisible = scenario.forbiddenEarthLayers.filter((layer) => layers.has(layer))
    if (forbiddenVisible.length) {
      findings.push(finding("critical", scenario, "FORBIDDEN_EARTH_LAYER", "Unrelated Earth layers are visible for scoped search.", scenario.forbiddenEarthLayers, forbiddenVisible, "Tighten search-controlled layer filters and embedded CREP gating.", ["lib/search/earth-search-rules.ts", "app/dashboard/crep/CREPDashboardClient.tsx"]))
    }
  }
  if (observation.rawTimeoutVisible || observation.chunkErrorVisible) {
    findings.push(finding("critical", scenario, "USER_VISIBLE_RUNTIME_ERROR", "Search surfaced a raw timeout or chunk load error.", false, { rawTimeoutVisible: observation.rawTimeoutVisible, chunkErrorVisible: observation.chunkErrorVisible }, "Wrap slow fetches in user-safe acquiring states and eliminate stale chunk reload paths.", ["lib/fetch-with-timeout.ts", "components/search/fluid/FluidSearchCanvas.tsx"]))
  }
  const runtimeConsoleErrors = (observation.consoleErrors ?? []).filter((message) => /ChunkLoadError|Failed to fetch RSC payload|Timeout \d+ms exceeded|Should not already be working|Loading chunk/i.test(message))
  if (runtimeConsoleErrors.length) {
    findings.push(finding("critical", scenario, "CONSOLE_RUNTIME_ERROR", "Search emitted runtime console errors during QA.", "no runtime console errors", runtimeConsoleErrors.slice(0, 3), "Stabilize Next chunk loading, HMR refresh paths, and long-running widget hydration before deployment.", ["app/search/SearchPageContent.tsx", "components/search/fluid/FluidSearchCanvas.tsx", "next.config.js"]))
  }
  if ((observation.navigationMs ?? 0) > scenario.latencyBudgetMs.homeSubmitToSearchMs) {
    findings.push(finding("warn", scenario, "NAVIGATION_LATENCY", "Home-to-search navigation exceeded budget.", scenario.latencyBudgetMs.homeSubmitToSearchMs, observation.navigationMs, "Profile homepage submit path, route chunk size, and search page warmup.", ["components/home/hero-search.tsx", "app/search/SearchPageContent.tsx"]))
  }
  for (const broken of observation.linkAudit?.broken ?? []) {
    findings.push(finding("warn", scenario, "BROKEN_LINK", `Broken click-through link: ${broken.href}`, "valid link", broken, "Fix source URL generation and link validation for widget results.", ["components/search/fluid/widgets", "app/api/search/unified/route.ts"]))
  }
  return findings
}

function expectedContentForWidget(widget: WidgetType, plan: SearchPlan | null): string[] {
  if (widget === "earth") return ["search-controlled layers", "physical base layers", "clickable markers", "source popups"]
  if (widget === "events") return ["title", "time", "location", "magnitude/severity", "source link", "lat/lng/depth when available"]
  if (widget === "answers") return ["summary of visible widgets", "Earth layer summary", "source health", "user-safe empty states"]
  if (widget === "species") return ["common/scientific name", "observations or range", "location", "source"]
  if (widget === "research") return ["title", "source", "date/year", "link/doi"]
  if (widget === "news") return ["headline", "publisher", "date", "link"]
  if (widget === "infrastructure" || widget === "power_grid") return ["asset name", "asset type", "lat/lng or geometry", "source"]
  if (widget === "aircraft" || widget === "vessels" || widget === "satellites") return ["identifier", "position", "time", "source", "map focus action"]
  return [`${widget} domain fields`, ...(plan?.earth?.enabledLayers.length ? ["Earth context"] : [])]
}

function buildMycaExpectation(plan: SearchPlan | null, query: string): SearchQaMycaExpectation {
  const spatial = Boolean(plan?.earth)
  const emptyWidgets = plan?.etlRequests.map((request) => request.widget) ?? []
  return {
    shouldCoordinate: spatial || emptyWidgets.length > 0 || /\bturn on|hide|show me|near me|why\b/i.test(query),
    actions: [
      spatial ? "Explain active Earth filters and map focus." : "Summarize visible widget context.",
      "Answer follow-up questions using the current SearchPlan and widget data.",
      emptyWidgets.length ? "Create ETL acquisition requests for empty authoritative data." : "Report source freshness when data is present.",
    ],
    promptContext: [
      `query: ${query}`,
      `widgets: ${(plan?.widgetOrder ?? []).join(", ")}`,
      `layers: ${(plan?.earth?.enabledLayers ?? []).join(", ")}`,
    ],
  }
}

function buildAcceptanceChecks(plan: SearchPlan | null): string[] {
  const checks = ["Home search submits to /search?q=...", "Typing alone does not mutate widgets", "No raw timeout/chunk error text"]
  if (plan?.earth) checks.push("Earth uses only expected filters plus physical base layers", "Markers are clickable and source-backed")
  if (plan?.widgetOrder.includes("answers")) checks.push("Answers summarizes visible widgets and missing data states")
  return checks
}

function buildRouteWhy(plan: SearchPlan | null, query: string): string[] {
  if (!plan) return [`No SearchPlan created for "${query}".`]
  return [
    `Intent normalized as "${plan.normalizedIntent}".`,
    `Entity families: ${plan.entityFamilies.join(", ")}.`,
    `Primary widget: ${plan.primaryWidget ?? "none"}.`,
    plan.earth ? `Earth layers: ${plan.earth.enabledLayers.join(", ")}.` : "No geospatial Earth plan.",
  ]
}

function finding(
  severity: SearchQaSeverity,
  scenario: SearchQaScenario,
  code: string,
  message: string,
  expected: unknown,
  observed: unknown,
  recommendedFix: string,
  likelyFiles: string[],
): SearchQaFinding {
  return { severity, scenarioId: scenario.id, query: scenario.query, code, message, expected, observed, recommendedFix, likelyFiles }
}

function prioritizeFixes(findings: SearchQaFinding[]): string[] {
  const groups = new Map<string, { count: number; severity: SearchQaSeverity; fix: string; files: Set<string> }>()
  for (const finding of findings) {
    const current = groups.get(finding.code) ?? { count: 0, severity: finding.severity, fix: finding.recommendedFix, files: new Set<string>() }
    current.count += 1
    if (finding.severity === "critical") current.severity = "critical"
    finding.likelyFiles.forEach((file) => current.files.add(file))
    groups.set(finding.code, current)
  }
  return [...groups.entries()]
    .sort((a, b) => severityScore(b[1].severity) - severityScore(a[1].severity) || b[1].count - a[1].count)
    .map(([code, group]) => `${group.severity.toUpperCase()} ${code} (${group.count}): ${group.fix} Likely files: ${[...group.files].join(", ")}`)
}

function severityScore(severity: SearchQaSeverity) {
  return { pass: 0, info: 1, warn: 2, fail: 3, critical: 4 }[severity]
}

export function buildAgentPrompt(input: {
  scenarios: SearchQaScenario[]
  observations: SearchQaObservation[]
  findings: SearchQaFinding[]
}) {
  const topFindings = input.findings.slice(0, 40)
  return [
    "# MYCOSOFT Search QA Fix Prompt",
    "",
    "You are improving the functional search system. Use the attached JSON report as ground truth.",
    "",
    "Primary rules:",
    "- Preserve the shared SearchPlan router as the source of widget order and Earth filters.",
    "- Any geospatial query must include Earth with only relevant filters plus physical base layers.",
    "- Widgets with authoritative empty data must show user-safe acquiring copy, create ETL requests, and rehydrate if data arrives.",
    "- Do not expose raw timeout, chunk, MINDEX internals, MAS internals, cache paths, or engineering queue text to users.",
    "- Fix the highest severity recurring failures first, then add or update tests.",
    "",
    `Scenarios included: ${input.scenarios.length}`,
    `Observations included: ${input.observations.length}`,
    `Findings included: ${input.findings.length}`,
    "",
    "Top findings:",
    ...topFindings.map((finding, index) => `${index + 1}. [${finding.severity}] ${finding.code} on "${finding.query}": ${finding.message} Fix: ${finding.recommendedFix}`),
    "",
    "Expected output from the coding agent:",
    "1. Identify root causes by file.",
    "2. Patch router/widget/Earth/ETL code.",
    "3. Add focused tests for scenario categories that failed.",
    "4. Run the QA artifact again and compare JSON deltas.",
  ].join("\n")
}
