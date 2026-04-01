/**
 * Search Scenario Definitions — 130 scenarios across 17 categories
 *
 * Each scenario defines:
 *  - The search query
 *  - Expected primary widget, size, and secondary widgets
 *  - Expected API result bucket and entity type
 *  - Data validation rules for liveness checking
 */

import type { SearchScenario, WidgetType, EntityType } from "./widget-test-utils"

// ---------------------------------------------------------------------------
// Helper to build scenarios concisely
// ---------------------------------------------------------------------------

function s(
  id: number,
  query: string,
  category: string,
  primaryWidget: WidgetType,
  primarySize: SearchScenario["expectedPrimarySize"],
  secondaryWidgets: WidgetType[],
  apiResultBucket: string,
  entityType: EntityType,
  dataValidation: SearchScenario["dataValidation"] = {},
): SearchScenario {
  return {
    id,
    query,
    category,
    expectedPrimaryWidget: primaryWidget,
    expectedPrimarySize: primarySize,
    expectedSecondaryWidgets: secondaryWidgets,
    expectedApiResultBucket: apiResultBucket,
    expectedEntityType: entityType,
    dataValidation,
  }
}

// Reusable size constants
const SIZE_2x2 = { width: 2 as const, height: 2 as const }
const SIZE_2x3 = { width: 2 as const, height: 3 as const }
const SIZE_2x1 = { width: 2 as const, height: 1 as const }

// Reusable secondary widget sets
const BIO_SECONDARY: WidgetType[] = ["chemistry", "research"]
const EARTH_SECONDARY: WidgetType[] = ["map", "weather", "events"]
const ANSWER_SECONDARY: WidgetType[] = ["answers"]

// ============================================================================
// CATEGORY 1: FUNGI (1-12)
// ============================================================================

export const FUNGI_SCENARIOS: SearchScenario[] = [
  s(1, "Amanita muscaria", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(2, "chanterelle mushrooms", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(3, "lion's mane benefits", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(4, "psilocybe cubensis", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(5, "poisonous mushrooms in Oregon", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(6, "edible fungi Pacific Northwest", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(7, "death cap identification", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(8, "cordyceps medicinal properties", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(9, "turkey tail cancer research", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(10, "morel mushroom season California", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(11, "reishi vs chaga", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(12, "mycelium network underground", "fungi", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 2: FLORA (13-24)
// ============================================================================

export const FLORA_SCENARIOS: SearchScenario[] = [
  s(13, "sequoia tree", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(14, "orchid species Japan", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(15, "oak tree identification", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(16, "sunflower growth cycle", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(17, "fern species diversity", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(18, "cactus desert plants", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(19, "moss on rocks", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(20, "algae bloom toxic", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(21, "maple tree autumn leaves", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(22, "pine tree resin compounds", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(23, "rose cultivation tips", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(24, "grass species identification guide", "flora", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 3: FAUNA — MAMMALS (25-34)
// ============================================================================

export const MAMMALS_SCENARIOS: SearchScenario[] = [
  s(25, "gray wolf", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(26, "whale migration patterns", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(27, "elephant conservation", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(28, "bear species North America", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(29, "dolphin intelligence", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(30, "tiger endangered status", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(31, "fox habitat urban", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(32, "bat echolocation", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(33, "otter river ecosystem", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(34, "seal vs sea lion", "fauna-mammals", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 4: FAUNA — BIRDS (35-42)
// ============================================================================

export const BIRDS_SCENARIOS: SearchScenario[] = [
  s(35, "bald eagle", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(36, "owl species identification", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(37, "hummingbird migration", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(38, "parrot intelligence", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(39, "penguin Antarctica", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(40, "bird songs identification", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(41, "crow problem solving", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(42, "raven vs crow difference", "fauna-birds", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 5: FAUNA — MARINE (43-50)
// ============================================================================

export const MARINE_SCENARIOS: SearchScenario[] = [
  s(43, "great white shark", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(44, "coral reef biodiversity", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(45, "jellyfish bioluminescence", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(46, "octopus camouflage", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(47, "sea turtle conservation", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(48, "lobster deep ocean", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(49, "starfish regeneration", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(50, "shark species list", "fauna-marine", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 6: FAUNA — INSECTS & REPTILES (51-58)
// ============================================================================

export const INSECTS_REPTILES_SCENARIOS: SearchScenario[] = [
  s(51, "monarch butterfly migration", "fauna-insects", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(52, "bee colony collapse", "fauna-insects", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(53, "dragonfly lifecycle", "fauna-insects", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(54, "snake venomous species", "fauna-reptiles", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(55, "frog amphibian habitats", "fauna-amphibians", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(56, "beetle diversity", "fauna-insects", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(57, "firefly bioluminescence", "fauna-insects", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(58, "crocodile vs alligator", "fauna-reptiles", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 7: CHEMISTRY & COMPOUNDS (59-65)
// ============================================================================

export const CHEMISTRY_SCENARIOS: SearchScenario[] = [
  s(59, "psilocybin molecule", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
  s(60, "amatoxin poisoning mechanism", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
  s(61, "muscimol effects", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
  s(62, "beta-glucan immune system", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
  s(63, "chitin structure", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
  s(64, "ergotamine chemical formula", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
  s(65, "antioxidant compounds in fungi", "chemistry", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
]

// ============================================================================
// CATEGORY 8: WEATHER & CLIMATE (66-72)
// ============================================================================

export const WEATHER_SCENARIOS: SearchScenario[] = [
  s(66, "weather in San Diego", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(67, "forecast New York", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(68, "temperature Seattle today", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(69, "rain forecast Portland", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(70, "hurricane season Atlantic", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(71, "drought conditions California", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(72, "climate change trends", "weather", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
]

// ============================================================================
// CATEGORY 9: AIRCRAFT (73-78)
// ============================================================================

export const AIRCRAFT_SCENARIOS: SearchScenario[] = [
  s(73, "flights over Pacific", "aircraft", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft", { minEntries: 1, hasLiveIndicator: true }),
  s(74, "aircraft near Los Angeles", "aircraft", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
  s(75, "planes over San Francisco", "aircraft", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
  s(76, "aviation traffic Denver", "aircraft", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
  s(77, "jet airspace Chicago", "aircraft", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
  s(78, "airline flights Miami", "aircraft", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
]

// ============================================================================
// CATEGORY 10: VESSELS & MARITIME (79-84)
// ============================================================================

export const VESSELS_SCENARIOS: SearchScenario[] = [
  s(79, "ships in Pacific", "vessels", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel", { minEntries: 1, hasLiveIndicator: true }),
  s(80, "cargo vessels near port", "vessels", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel"),
  s(81, "tanker shipping routes", "vessels", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel"),
  s(82, "maritime traffic San Diego", "vessels", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel"),
  s(83, "cruise ships Caribbean", "vessels", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel"),
  s(84, "naval vessels", "vessels", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel"),
]

// ============================================================================
// CATEGORY 11: NATURAL EVENTS (85-90)
// ============================================================================

export const EVENTS_SCENARIOS: SearchScenario[] = [
  s(85, "earthquakes today", "events", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event", { minEntries: 1, containsText: ["earthquake"] }),
  s(86, "volcanic eruptions recent", "events", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event"),
  s(87, "wildfire California", "events", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event"),
  s(88, "tornado warnings", "events", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event"),
  s(89, "tsunami Pacific", "events", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event"),
  s(90, "flooding events this week", "events", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event"),
]

// ============================================================================
// CATEGORY 12: SATELLITES & SPACE (91-96)
// ============================================================================

export const SATELLITES_SPACE_SCENARIOS: SearchScenario[] = [
  s(91, "ISS tracking", "satellites", "satellites", SIZE_2x2,
    ANSWER_SECONDARY, "satellites", "satellite"),
  s(92, "Starlink satellites", "satellites", "satellites", SIZE_2x2,
    ANSWER_SECONDARY, "satellites", "satellite"),
  s(93, "satellite orbit tracking", "satellites", "satellites", SIZE_2x2,
    ANSWER_SECONDARY, "satellites", "satellite"),
  s(94, "space debris near Earth", "satellites", "satellites", SIZE_2x2,
    ANSWER_SECONDARY, "satellites", "satellite"),
  s(95, "solar flare activity", "space-weather", "space_weather", SIZE_2x2,
    ANSWER_SECONDARY, "space_weather", "space_weather", { containsText: ["solar"] }),
  s(96, "aurora forecast northern lights", "space-weather", "space_weather", SIZE_2x2,
    ANSWER_SECONDARY, "space_weather", "space_weather"),
]

// ============================================================================
// CATEGORY 13: EMISSIONS & INFRASTRUCTURE (97-102)
// ============================================================================

export const EMISSIONS_INFRA_SCENARIOS: SearchScenario[] = [
  s(97, "air quality San Diego", "emissions", "emissions", SIZE_2x2,
    ANSWER_SECONDARY, "emissions", "emissions"),
  s(98, "carbon emissions California", "emissions", "emissions", SIZE_2x2,
    ANSWER_SECONDARY, "emissions", "emissions"),
  s(99, "methane plume detection", "emissions", "emissions", SIZE_2x2,
    ANSWER_SECONDARY, "emissions", "emissions"),
  s(100, "power plant locations", "infrastructure", "infrastructure", SIZE_2x2,
    ANSWER_SECONDARY, "infrastructure", "infrastructure"),
  s(101, "nuclear facilities map", "infrastructure", "infrastructure", SIZE_2x2,
    ANSWER_SECONDARY, "infrastructure", "infrastructure"),
  s(102, "wind farm solar farm", "infrastructure", "infrastructure", SIZE_2x2,
    ANSWER_SECONDARY, "infrastructure", "infrastructure"),
]

// ============================================================================
// CATEGORY 14: MAP & LOCATION (103-108)
// ============================================================================

export const MAP_LOCATION_SCENARIOS: SearchScenario[] = [
  s(103, "mushrooms near San Diego", "map-location", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(104, "wildlife in Yellowstone", "map-location", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(105, "observation map Pacific Northwest", "map-location", "crep", SIZE_2x2,
    ANSWER_SECONDARY, "crep", "crep", { hasMap: true }),
  s(106, "earth2 weather forecast", "map-location", "earth2", SIZE_2x3,
    ANSWER_SECONDARY, "earth2", "general", { hasMap: true }),
  s(107, "CREP monitoring dashboard", "map-location", "crep", SIZE_2x2,
    ANSWER_SECONDARY, "crep", "crep"),
  s(108, "tracking radar global", "map-location", "crep", SIZE_2x2,
    ANSWER_SECONDARY, "crep", "crep"),
]

// ============================================================================
// CATEGORY 15: MEDIA & RESEARCH (109-114)
// ============================================================================

export const MEDIA_RESEARCH_SCENARIOS: SearchScenario[] = [
  s(109, "mushroom documentaries", "media", "media", SIZE_2x2,
    ANSWER_SECONDARY, "media", "media"),
  s(110, "fungi movie Fantastic Fungi", "media", "media", SIZE_2x2,
    ANSWER_SECONDARY, "media", "media"),
  s(111, "mycology research papers", "research", "research", SIZE_2x2,
    ["news"], "research", "research"),
  s(112, "peer-reviewed mushroom studies", "research", "research", SIZE_2x2,
    ["news"], "research", "research"),
  s(113, "psilocybin clinical trial results", "research", "research", SIZE_2x2,
    ["news"], "research", "research"),
  s(114, "biodiversity journal publications", "research", "research", SIZE_2x2,
    ["news"], "research", "research"),
]

// ============================================================================
// CATEGORY 16: CROSS-DOMAIN & EDGE CASES (115-124)
// ============================================================================

export const CROSS_DOMAIN_SCENARIOS: SearchScenario[] = [
  s(115, "Amanita muscaria psilocybin chemistry", "cross-domain", "species", SIZE_2x2,
    ["chemistry", "research"], "species", "species"),
  s(116, "weather effects on mushroom growth", "cross-domain", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(117, "flights over earthquake zone", "cross-domain", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
  s(118, "ships near volcanic island", "cross-domain", "vessels", SIZE_2x3,
    EARTH_SECONDARY, "vessels", "vessel"),
  s(119, "embedding atlas mushroom similarity", "cross-domain", "embedding_atlas", SIZE_2x2,
    ANSWER_SECONDARY, "embeddings", "general"),
  s(120, "webcam nature live stream", "cross-domain", "cameras", SIZE_2x3,
    ANSWER_SECONDARY, "cameras", "cameras", { hasLiveIndicator: true }),
  s(121, "mycobrain sensor telemetry", "cross-domain", "devices", SIZE_2x2,
    ANSWER_SECONDARY, "devices", "device"),
  s(122, "what is a chanterelle?", "cross-domain", "species", SIZE_2x2,
    ["answers", "chemistry", "research"], "species", "species"),
  s(123, "hello", "cross-domain", "answers", SIZE_2x2,
    [], "answers", "general"),
  s(124, "compare eagle and hawk", "cross-domain", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
]

// ============================================================================
// CATEGORY 17: WIDGET MECHANICS (125-130)
// ============================================================================

export const WIDGET_MECHANICS_SCENARIOS: SearchScenario[] = [
  s(125, "Amanita muscaria", "mechanics", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species", { hasImages: true }),
  s(126, "flights over Pacific", "mechanics", "aircraft", SIZE_2x3,
    EARTH_SECONDARY, "aircraft", "aircraft"),
  s(127, "weather San Diego", "mechanics", "weather", SIZE_2x1,
    EARTH_SECONDARY, "weather", "weather"),
  s(128, "earthquakes today", "mechanics", "events", SIZE_2x3,
    EARTH_SECONDARY, "events", "event"),
  s(129, "Amanita muscaria", "mechanics", "species", SIZE_2x2,
    BIO_SECONDARY, "species", "species"),
  s(130, "psilocybin", "mechanics", "chemistry", SIZE_2x2,
    ANSWER_SECONDARY, "compounds", "compound"),
]

// ============================================================================
// ALL SCENARIOS combined export
// ============================================================================

export const ALL_SCENARIOS: SearchScenario[] = [
  ...FUNGI_SCENARIOS,
  ...FLORA_SCENARIOS,
  ...MAMMALS_SCENARIOS,
  ...BIRDS_SCENARIOS,
  ...MARINE_SCENARIOS,
  ...INSECTS_REPTILES_SCENARIOS,
  ...CHEMISTRY_SCENARIOS,
  ...WEATHER_SCENARIOS,
  ...AIRCRAFT_SCENARIOS,
  ...VESSELS_SCENARIOS,
  ...EVENTS_SCENARIOS,
  ...SATELLITES_SPACE_SCENARIOS,
  ...EMISSIONS_INFRA_SCENARIOS,
  ...MAP_LOCATION_SCENARIOS,
  ...MEDIA_RESEARCH_SCENARIOS,
  ...CROSS_DOMAIN_SCENARIOS,
  ...WIDGET_MECHANICS_SCENARIOS,
]

/**
 * Get scenarios by category name.
 */
export function getScenariosByCategory(category: string): SearchScenario[] {
  return ALL_SCENARIOS.filter((s) => s.category === category)
}

/**
 * Get a single scenario by ID.
 */
export function getScenario(id: number): SearchScenario | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id)
}
