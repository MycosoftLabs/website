/**
 * Voice Command Parser
 * Parses natural language commands into structured actions
 */

export interface ParsedCommand {
  type: "navigation" | "layer" | "filter" | "device" | "query" | "action" | "unknown"
  action: string
  params: Record<string, string | number | boolean>
  confidence: number
  rawText: string
}

// Command patterns for different categories
const COMMAND_PATTERNS = {
  navigation: [
    { pattern: /go to (.+)/i, action: "flyTo", param: "location" },
    { pattern: /navigate to (.+)/i, action: "flyTo", param: "location" },
    { pattern: /show me (.+)/i, action: "flyTo", param: "location" },
    { pattern: /zoom (in|out)/i, action: "zoom", param: "direction" },
    { pattern: /zoom to level (\d+)/i, action: "setZoom", param: "level" },
    { pattern: /zoom level (\d+)/i, action: "setZoom", param: "level" },
    { pattern: /center on (.+)/i, action: "centerOn", param: "location" },
    { pattern: /focus on (.+)/i, action: "centerOn", param: "location" },
    { pattern: /pan (left|right|up|down)/i, action: "pan", param: "direction" },
    { pattern: /rotate (left|right)/i, action: "rotate", param: "direction" },
    { pattern: /reset view/i, action: "resetView", param: null },
    { pattern: /home view/i, action: "resetView", param: null },
  ],
  layer: [
    { pattern: /show (.+) layer/i, action: "showLayer", param: "layer" },
    { pattern: /hide (.+) layer/i, action: "hideLayer", param: "layer" },
    { pattern: /toggle (.+) layer/i, action: "toggleLayer", param: "layer" },
    { pattern: /show (satellites?|aircraft|vessels?|devices?|fungal)/i, action: "showLayer", param: "layer" },
    { pattern: /hide (satellites?|aircraft|vessels?|devices?|fungal)/i, action: "hideLayer", param: "layer" },
    { pattern: /toggle (satellites?|aircraft|vessels?|devices?|fungal)/i, action: "toggleLayer", param: "layer" },
    { pattern: /show all layers/i, action: "showAllLayers", param: null },
    { pattern: /hide all layers/i, action: "hideAllLayers", param: null },
    { pattern: /show weather/i, action: "showLayer", param: "weather" },
    { pattern: /hide weather/i, action: "hideLayer", param: "weather" },
  ],
  filter: [
    { pattern: /filter by (.+)/i, action: "setFilter", param: "filter" },
    { pattern: /clear filters?/i, action: "clearFilters", param: null },
    { pattern: /reset filters?/i, action: "clearFilters", param: null },
    { pattern: /show only (.+)/i, action: "filterOnly", param: "type" },
    { pattern: /filter altitude (above|below|between) (.+)/i, action: "filterAltitude", param: "value" },
    { pattern: /filter speed (above|below) (.+)/i, action: "filterSpeed", param: "value" },
  ],
  device: [
    { pattern: /where is (.+)/i, action: "locateDevice", param: "device" },
    { pattern: /find (.+)/i, action: "searchDevices", param: "query" },
    { pattern: /locate (.+)/i, action: "locateDevice", param: "device" },
    { pattern: /show device (.+)/i, action: "showDevice", param: "device" },
    { pattern: /device status (.+)/i, action: "deviceStatus", param: "device" },
    { pattern: /is (.+) online/i, action: "checkDeviceOnline", param: "device" },
    { pattern: /ping (.+)/i, action: "pingDevice", param: "device" },
  ],
  query: [
    { pattern: /what('s| is) the (status|temperature|humidity|pressure)/i, action: "queryStatus", param: "metric" },
    { pattern: /how many (.+)/i, action: "count", param: "type" },
    { pattern: /list all (.+)/i, action: "list", param: "type" },
    { pattern: /show all (.+)/i, action: "list", param: "type" },
    { pattern: /what agents are (.+)/i, action: "queryAgents", param: "status" },
    { pattern: /system status/i, action: "systemStatus", param: null },
    { pattern: /network status/i, action: "networkStatus", param: null },
  ],
  action: [
    { pattern: /spawn agent (.+)/i, action: "spawnAgent", param: "type" },
    { pattern: /create agent (.+)/i, action: "spawnAgent", param: "type" },
    { pattern: /start workflow (.+)/i, action: "startWorkflow", param: "name" },
    { pattern: /stop workflow (.+)/i, action: "stopWorkflow", param: "name" },
    { pattern: /activate (.+)/i, action: "activate", param: "target" },
    { pattern: /deactivate (.+)/i, action: "deactivate", param: "target" },
    { pattern: /refresh( data)?/i, action: "refresh", param: null },
    { pattern: /reload/i, action: "refresh", param: null },
  ],
}

// Location aliases
const LOCATION_ALIASES: Record<string, [number, number]> = {
  "tokyo": [139.6917, 35.6895],
  "new york": [-74.006, 40.7128],
  "london": [-0.1276, 51.5074],
  "paris": [2.3522, 48.8566],
  "san francisco": [-122.4194, 37.7749],
  "sydney": [151.2093, -33.8688],
  "singapore": [103.8198, 1.3521],
  "dubai": [55.2708, 25.2048],
  "hong kong": [114.1694, 22.3193],
  "berlin": [13.405, 52.52],
  "amsterdam": [4.9041, 52.3676],
  "seoul": [126.978, 37.5665],
  "mumbai": [72.8777, 19.076],
  "beijing": [116.4074, 39.9042],
  "moscow": [37.6173, 55.7558],
}

// Layer name normalization
const LAYER_ALIASES: Record<string, string> = {
  "satellites": "satellites",
  "satellite": "satellites",
  "sats": "satellites",
  "aircraft": "aircraft",
  "planes": "aircraft",
  "flights": "aircraft",
  "vessels": "vessels",
  "ships": "vessels",
  "boats": "vessels",
  "devices": "devices",
  "mycobrain": "devices",
  "fungal": "fungal",
  "mushrooms": "fungal",
  "weather": "weather",
  "terrain": "terrain",
  "labels": "labels",
}

export function parseCommand(text: string): ParsedCommand {
  const normalizedText = text.toLowerCase().trim()
  
  // Try each category of patterns
  for (const [category, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const { pattern, action, param } of patterns) {
      const match = normalizedText.match(pattern)
      if (match) {
        const params: Record<string, string | number | boolean> = {}
        
        if (param && match[1]) {
          let value: string | number = match[1].trim()
          
          // Handle special param processing
          if (param === "location") {
            const coords = LOCATION_ALIASES[value.toLowerCase()]
            if (coords) {
              params.lng = coords[0]
              params.lat = coords[1]
              params.locationName = value
            } else {
              params.locationQuery = value
            }
          } else if (param === "layer") {
            params.layer = LAYER_ALIASES[value.toLowerCase()] || value
          } else if (param === "level") {
            params.level = parseInt(value, 10)
          } else if (param === "direction") {
            params.direction = value
          } else {
            params[param] = value
          }
        }
        
        // Add second capture group if exists
        if (match[2]) {
          params.value = match[2].trim()
        }
        
        return {
          type: category as ParsedCommand["type"],
          action,
          params,
          confidence: 0.9,
          rawText: text,
        }
      }
    }
  }
  
  // No pattern matched
  return {
    type: "unknown",
    action: "unknown",
    params: { text: normalizedText },
    confidence: 0.1,
    rawText: text,
  }
}

export function getCommandSuggestions(partial: string): string[] {
  const suggestions: string[] = []
  const normalized = partial.toLowerCase()
  
  // Common command starters
  const starters = [
    "go to",
    "show",
    "hide",
    "zoom",
    "filter",
    "find",
    "where is",
    "what's the",
    "list all",
    "toggle",
    "refresh",
  ]
  
  for (const starter of starters) {
    if (starter.startsWith(normalized) || normalized.startsWith(starter.split(" ")[0])) {
      suggestions.push(starter)
    }
  }
  
  return suggestions.slice(0, 5)
}

export function formatCommandHelp(): string {
  return `
Voice Commands:
- Navigation: "Go to Tokyo", "Zoom in", "Center on device"
- Layers: "Show satellites", "Hide aircraft", "Toggle weather"
- Filters: "Filter by altitude above 10000", "Clear filters"
- Devices: "Where is Mushroom1?", "Find all devices"
- Queries: "System status", "List all agents"
- Actions: "Spawn agent", "Start workflow", "Refresh data"
  `.trim()
}
