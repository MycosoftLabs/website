/**
 * Elephant Conservation API - Feb 18, 2026
 * 
 * UPDATED: Now fetches real device data from MAS Device Registry
 * Falls back to demo mode when real devices unavailable
 * Results cached for 10 minutes to prevent overwhelming the dev server
 * 
 * Data sources:
 * - MycoBrain devices: MAS Device Registry (real)
 * - Elephant trackers: Future integration with GPS tracking API
 * - Conservation events: Generated from device sensor readings
 */

import { NextResponse } from "next/server"

// MAS API for real device data
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// In-memory cache
interface CacheEntry {
  data: unknown
  timestamp: number
  expiresAt: number
}

let elephantCache: CacheEntry | null = null
const CACHE_TTL_MS = 600_000 // 10 minutes (elephant data doesn't need to be real-time)

// Ghana and Africa conservation park coordinates
const CONSERVATION_ZONES = {
  mole: { name: "Mole National Park", country: "Ghana", lat: 9.2667, lng: -1.8333 },
  kakum: { name: "Kakum National Park", country: "Ghana", lat: 5.3500, lng: -1.3833 },
  bui: { name: "Bui National Park", country: "Ghana", lat: 8.2833, lng: -2.2333 },
  kruger: { name: "Kruger National Park", country: "South Africa", lat: -23.9884, lng: 31.5547 },
  amboseli: { name: "Amboseli National Park", country: "Kenya", lat: -2.6527, lng: 37.2606 },
  chobe: { name: "Chobe National Park", country: "Botswana", lat: -18.7669, lng: 25.1545 },
}

// Demo elephants with tracking collars
const DEMO_ELEPHANTS = [
  {
    id: "elephant-001",
    name: "Kofi",
    age: 35,
    sex: "male",
    zone: "mole",
    lat: 9.2701,
    lng: -1.8287,
    heading: 45,
    speed: 2.3, // km/h
    biosignals: {
      heartRate: 28, // bpm (normal 25-35)
      temperature: 36.2, // °C
      activityLevel: "grazing",
      stressIndex: 12, // 0-100
      hydration: 85, // %
    },
    status: "healthy",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "elephant-002",
    name: "Ama",
    age: 28,
    sex: "female",
    zone: "mole",
    lat: 9.2634,
    lng: -1.8401,
    heading: 180,
    speed: 0.5,
    biosignals: {
      heartRate: 32,
      temperature: 36.8,
      activityLevel: "resting",
      stressIndex: 8,
      hydration: 92,
    },
    status: "healthy",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "elephant-003",
    name: "Kwame",
    age: 12,
    sex: "male",
    zone: "mole",
    lat: 9.2589,
    lng: -1.8156,
    heading: 270,
    speed: 4.1,
    biosignals: {
      heartRate: 45,
      temperature: 37.1,
      activityLevel: "running",
      stressIndex: 45,
      hydration: 78,
    },
    status: "warning",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "elephant-004",
    name: "Nana",
    age: 42,
    sex: "female",
    zone: "kakum",
    lat: 5.3521,
    lng: -1.3798,
    heading: 90,
    speed: 1.2,
    biosignals: {
      heartRate: 26,
      temperature: 36.4,
      activityLevel: "foraging",
      stressIndex: 5,
      hydration: 88,
    },
    status: "healthy",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "elephant-005",
    name: "Osei",
    age: 18,
    sex: "male",
    zone: "bui",
    lat: 8.2891,
    lng: -2.2298,
    heading: 315,
    speed: 3.5,
    biosignals: {
      heartRate: 38,
      temperature: 36.9,
      activityLevel: "walking",
      stressIndex: 22,
      hydration: 81,
    },
    status: "healthy",
    lastUpdate: new Date().toISOString(),
  },
]

// Smart fence segments with MycoBrain sensors
const DEMO_FENCE_SEGMENTS = [
  {
    id: "fence-mole-north-01",
    name: "Mole North Perimeter A",
    zone: "mole",
    startLat: 9.2800,
    startLng: -1.8500,
    endLat: 9.2800,
    endLng: -1.8200,
    status: "active",
    lastCheck: new Date().toISOString(),
    sensors: [
      {
        id: "sensor-fence-001",
        type: "smart_fence",
        name: "MycoBrain Fence Sensor #1",
        lat: 9.2800,
        lng: -1.8350,
        status: "online",
        firmware: "2.0.0",
        readings: {
          presence: false,
          vibration: 0.02,
          breakDetected: false,
          temperature: 28.5,
          humidity: 65,
          gasResistance: 18500,
        },
      },
    ],
  },
  {
    id: "fence-mole-east-01",
    name: "Mole East Boundary",
    zone: "mole",
    startLat: 9.2700,
    startLng: -1.8100,
    endLat: 9.2500,
    endLng: -1.8100,
    status: "breach",
    lastCheck: new Date().toISOString(),
    sensors: [
      {
        id: "sensor-fence-002",
        type: "smart_fence",
        name: "MycoBrain Fence Sensor #2",
        lat: 9.2600,
        lng: -1.8100,
        status: "online",
        firmware: "2.0.0",
        readings: {
          presence: true,
          vibration: 0.85,
          breakDetected: false,
          temperature: 29.1,
          humidity: 62,
          gasResistance: 12300,
        },
      },
    ],
  },
  {
    id: "fence-kakum-west-01",
    name: "Kakum West Corridor",
    zone: "kakum",
    startLat: 5.3600,
    startLng: -1.4000,
    endLat: 5.3400,
    endLng: -1.4000,
    status: "active",
    lastCheck: new Date().toISOString(),
    sensors: [
      {
        id: "sensor-fence-003",
        type: "smart_fence",
        name: "MycoBrain Fence Sensor #3",
        lat: 5.3500,
        lng: -1.4000,
        status: "online",
        firmware: "2.0.0",
        readings: {
          presence: false,
          vibration: 0.01,
          breakDetected: false,
          temperature: 31.2,
          humidity: 78,
          gasResistance: 22100,
        },
      },
    ],
  },
]

// Environmental monitoring stations
const DEMO_ENVIRONMENT_MONITORS = [
  {
    id: "env-monitor-mole-01",
    name: "Mole Waterhole Monitor",
    type: "environment_monitor",
    zone: "mole",
    lat: 9.2650,
    lng: -1.8280,
    status: "online",
    firmware: "2.0.0",
    sensors: {
      smell: true,
      presence: true,
      biosignal: false,
      gps: true,
    },
    readings: {
      temperature: 27.8,
      humidity: 58,
      pressure: 1013.2,
      iaq: 45,
      co2Equivalent: 480,
      vocEquivalent: 0.4,
      gasClass: 1,
      smellDetected: "elephant_dung",
      presenceDetected: true,
      lastMovement: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "env-monitor-mole-02",
    name: "Mole Salt Lick Station",
    type: "environment_monitor",
    zone: "mole",
    lat: 9.2720,
    lng: -1.8450,
    status: "online",
    firmware: "2.0.0",
    sensors: {
      smell: true,
      presence: true,
      biosignal: false,
      gps: true,
    },
    readings: {
      temperature: 26.9,
      humidity: 61,
      pressure: 1012.8,
      iaq: 52,
      co2Equivalent: 520,
      vocEquivalent: 0.6,
      gasClass: 2,
      smellDetected: "musth",
      presenceDetected: false,
      lastMovement: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "env-monitor-kakum-01",
    name: "Kakum Forest Edge Monitor",
    type: "environment_monitor",
    zone: "kakum",
    lat: 5.3480,
    lng: -1.3850,
    status: "online",
    firmware: "2.0.0",
    sensors: {
      smell: true,
      presence: true,
      biosignal: false,
      gps: true,
    },
    readings: {
      temperature: 32.1,
      humidity: 82,
      pressure: 1011.5,
      iaq: 38,
      co2Equivalent: 450,
      vocEquivalent: 0.3,
      gasClass: 0,
      smellDetected: "forest_vegetation",
      presenceDetected: false,
      lastMovement: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
  },
]

// Conservation events
const DEMO_EVENTS = [
  {
    id: "event-001",
    type: "elephant_crossing",
    title: "Herd Crossing at Mole East",
    description: "Group of 4 elephants detected crossing smart fence corridor",
    severity: "low",
    lat: 9.2600,
    lng: -1.8100,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    source: "MycoBrain Smart Fence",
    elephantIds: ["elephant-001", "elephant-002"],
    fenceSegmentId: "fence-mole-east-01",
  },
  {
    id: "event-002",
    type: "health_alert",
    title: "Elevated Stress Detected - Kwame",
    description: "Young male showing elevated heart rate and stress indicators",
    severity: "medium",
    lat: 9.2589,
    lng: -1.8156,
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    source: "GPS Collar Biosensor",
    elephantId: "elephant-003",
    biosignalData: {
      heartRate: 45,
      stressIndex: 45,
      recommendation: "Monitor closely - possible predator encounter",
    },
  },
  {
    id: "event-003",
    type: "presence_alert",
    title: "Waterhole Activity Detected",
    description: "Motion and smell sensors triggered at Mole Waterhole",
    severity: "low",
    lat: 9.2650,
    lng: -1.8280,
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    source: "MycoBrain Environment Monitor",
    monitorId: "env-monitor-mole-01",
    smellPattern: "elephant_dung",
  },
  {
    id: "event-004",
    type: "fence_breach",
    title: "Fence Perimeter Breach - Mole East",
    description: "High vibration and presence detected on eastern boundary",
    severity: "high",
    lat: 9.2600,
    lng: -1.8100,
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    source: "MycoBrain Smart Fence",
    fenceSegmentId: "fence-mole-east-01",
    actionRequired: "Ranger patrol dispatched",
  },
  {
    id: "event-005",
    type: "musth_detection",
    title: "Musth Scent Detected - Salt Lick",
    description: "BME688 sensor detected musth pheromones indicating male in breeding condition",
    severity: "medium",
    lat: 9.2720,
    lng: -1.8450,
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    source: "MycoBrain Smell Detection",
    monitorId: "env-monitor-mole-02",
    smellClass: 2,
    confidence: 0.87,
  },
]

// Combined device list for CREP map
function generateDevices() {
  const devices = []

  // Add fence sensors as devices
  for (const segment of DEMO_FENCE_SEGMENTS) {
    for (const sensor of segment.sensors) {
      devices.push({
        id: sensor.id,
        name: sensor.name,
        lat: sensor.lat,
        lng: sensor.lng,
        status: sensor.status,
        type: "smart_fence",
        port: "DEMO",
        firmware: sensor.firmware,
        protocol: "MDP",
        deviceType: "smart_fence",
        fenceSegmentId: segment.id,
        zone: segment.zone,
        sensors: {
          presence: true,
          smell: false,
          biosignal: false,
          gps: false,
        },
        readings: sensor.readings,
      })
    }
  }

  // Add environment monitors as devices
  for (const monitor of DEMO_ENVIRONMENT_MONITORS) {
    devices.push({
      id: monitor.id,
      name: monitor.name,
      lat: monitor.lat,
      lng: monitor.lng,
      status: monitor.status,
      type: "environment_monitor",
      port: "DEMO",
      firmware: monitor.firmware,
      protocol: "MDP",
      deviceType: "environment_monitor",
      zone: monitor.zone,
      sensors: monitor.sensors,
      readings: monitor.readings,
    })
  }

  return devices
}

// Fetch real devices from MAS Device Registry
async function fetchMASDevices(): Promise<{ devices: any[]; success: boolean }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const res = await fetch(`${MAS_API_URL}/api/devices/network`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    })
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      console.warn(`[ElephantConservation] MAS devices API returned ${res.status}`)
      return { devices: [], success: false }
    }
    
    const data = await res.json()
    const devices = data.devices || data.network_devices || []
    console.log(`[ElephantConservation] Fetched ${devices.length} devices from MAS`)
    return { devices, success: true }
  } catch (error) {
    console.warn("[ElephantConservation] Failed to fetch MAS devices:", error)
    return { devices: [], success: false }
  }
}

// Filter devices relevant to conservation (smart fence, environment monitor, wildlife tracker)
function filterConservationDevices(devices: any[]) {
  const conservationRoles = ["smart_fence", "environment_monitor", "wildlife_tracker", "gateway"]
  return devices.filter(d => {
    const role = d.role?.toLowerCase() || d.type?.toLowerCase() || ""
    return conservationRoles.some(r => role.includes(r))
  })
}

// Convert MAS devices to fence segment format
function convertToFenceSegments(devices: any[]) {
  const fenceDevices = devices.filter(d => 
    (d.role || d.type || "").toLowerCase().includes("fence")
  )
  
  if (fenceDevices.length === 0) return []
  
  // Group fence sensors into segments
  const segments: any[] = []
  fenceDevices.forEach((device, idx) => {
    segments.push({
      id: `fence-segment-${device.id || idx}`,
      name: device.name || `Fence Segment ${idx + 1}`,
      zone: device.zone || "unknown",
      startLat: device.lat || device.latitude || 0,
      startLng: device.lng || device.longitude || 0,
      endLat: (device.lat || device.latitude || 0) + 0.01,
      endLng: device.lng || device.longitude || 0,
      status: device.status === "online" ? "active" : "inactive",
      lastCheck: device.last_seen || new Date().toISOString(),
      sensors: [{
        id: device.id,
        type: "smart_fence",
        name: device.name,
        lat: device.lat || device.latitude,
        lng: device.lng || device.longitude,
        status: device.status,
        firmware: device.firmware || "unknown",
        readings: device.readings || device.sensors || {},
      }],
    })
  })
  
  return segments
}

// Convert MAS devices to environment monitor format
function convertToEnvironmentMonitors(devices: any[]) {
  const monitors = devices.filter(d => 
    (d.role || d.type || "").toLowerCase().includes("monitor") ||
    (d.role || d.type || "").toLowerCase().includes("environment")
  )
  
  return monitors.map(device => ({
    id: device.id,
    name: device.name || "Environment Monitor",
    type: "environment_monitor",
    zone: device.zone || "unknown",
    lat: device.lat || device.latitude || 0,
    lng: device.lng || device.longitude || 0,
    status: device.status || "unknown",
    firmware: device.firmware || "unknown",
    sensors: {
      smell: true,
      presence: true,
      biosignal: false,
      gps: true,
    },
    readings: device.readings || device.sensors || {},
  }))
}

// Generate conservation events from device readings
function generateEventsFromDevices(devices: any[], fenceSegments: any[], monitors: any[]) {
  const events: any[] = []
  const now = Date.now()
  
  // Check fence devices for breach events
  for (const segment of fenceSegments) {
    if (segment.status === "breach" || segment.status === "warning") {
      events.push({
        id: `event-fence-${segment.id}`,
        type: "fence_breach",
        title: `Fence Activity - ${segment.name}`,
        description: "Sensor triggered on fence perimeter",
        severity: segment.status === "breach" ? "high" : "medium",
        lat: segment.startLat,
        lng: segment.startLng,
        timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
        source: "MycoBrain Smart Fence",
        fenceSegmentId: segment.id,
      })
    }
  }
  
  // Check environment monitors for presence alerts
  for (const monitor of monitors) {
    if (monitor.readings?.presenceDetected) {
      events.push({
        id: `event-presence-${monitor.id}`,
        type: "presence_alert",
        title: `Presence Detected - ${monitor.name}`,
        description: "Motion and environmental sensors triggered",
        severity: "low",
        lat: monitor.lat,
        lng: monitor.lng,
        timestamp: new Date(now - 10 * 60 * 1000).toISOString(),
        source: "MycoBrain Environment Monitor",
        monitorId: monitor.id,
        smellPattern: monitor.readings?.smellDetected || "unknown",
      })
    }
  }
  
  return events
}

export async function GET(request: Request) {
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const url = new URL(request.url)
  const forceDemo = url.searchParams.get("demo") === "true"
  const forceRefresh = url.searchParams.get("refresh") === "true"
  
  // Check cache first
  if (!forceRefresh && elephantCache && nowMs < elephantCache.expiresAt) {
    console.log(`[ElephantConservation] Cache HIT (${Math.round((elephantCache.expiresAt - nowMs) / 1000)}s remaining)`)
    return NextResponse.json(elephantCache.data)
  }
  
  // Try to fetch real devices from MAS
  let useDemo = forceDemo
  let realDevices: any[] = []
  let fenceSegments: any[] = []
  let environmentMonitors: any[] = []
  let events: any[] = []
  
  if (!forceDemo) {
    const { devices, success } = await fetchMASDevices()
    
    if (success && devices.length > 0) {
      // Filter to conservation-relevant devices
      realDevices = filterConservationDevices(devices)
      fenceSegments = convertToFenceSegments(realDevices)
      environmentMonitors = convertToEnvironmentMonitors(realDevices)
      events = generateEventsFromDevices(realDevices, fenceSegments, environmentMonitors)
      
      console.log(`[ElephantConservation] Using ${realDevices.length} real conservation devices`)
    } else {
      useDemo = true
      console.log("[ElephantConservation] Falling back to demo mode - no real devices available")
    }
  }
  
  // Use demo data if no real devices or forced demo mode
  if (useDemo) {
    fenceSegments = DEMO_FENCE_SEGMENTS
    environmentMonitors = DEMO_ENVIRONMENT_MONITORS
    events = DEMO_EVENTS
    realDevices = generateDevices()
  }
  
  // Elephants: Currently using demo data
  // TODO: Integrate with real GPS tracking API when available
  const elephants = DEMO_ELEPHANTS.map(e => ({
    ...e,
    lat: e.lat + (Math.random() - 0.5) * 0.001,
    lng: e.lng + (Math.random() - 0.5) * 0.001,
    lastUpdate: now,
  }))

  const responseData = {
    ok: true,
    demo: useDemo,
    dataSource: useDemo ? "demo" : "mas_registry",
    timestamp: now,
    zones: CONSERVATION_ZONES,
    elephants,
    elephantsDataSource: "demo",
    fenceSegments,
    environmentMonitors,
    devices: useDemo ? generateDevices() : realDevices,
    events,
    available: true,
    cached: false,
    stats: {
      totalElephants: elephants.length,
      healthyElephants: elephants.filter(e => e.status === "healthy").length,
      warningElephants: elephants.filter(e => e.status === "warning").length,
      criticalElephants: elephants.filter(e => e.status === "critical").length,
      activeFences: fenceSegments.filter(f => f.status === "active").length,
      breachedFences: fenceSegments.filter(f => f.status === "breach").length,
      onlineMonitors: environmentMonitors.filter(m => m.status === "online").length,
      recentEvents: events.length,
      realDevicesCount: useDemo ? 0 : realDevices.length,
    },
    notes: {
      elephantTracking: "Using simulated GPS data. Real tracking collar integration pending.",
      deviceIntegration: useDemo 
        ? "Demo mode: Using simulated devices. Connect to MAS (192.168.0.188:8001) for real device data." 
        : "Using real devices from MAS Device Registry.",
    },
  }
  
  // Store in cache
  elephantCache = {
    data: { ...responseData, cached: true },
    timestamp: nowMs,
    expiresAt: nowMs + CACHE_TTL_MS,
  }
  console.log(`[ElephantConservation] Cache SET (TTL: ${CACHE_TTL_MS / 1000}s)`)

  return NextResponse.json(responseData)
}
