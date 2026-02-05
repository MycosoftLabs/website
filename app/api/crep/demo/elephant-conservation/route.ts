/**
 * Elephant Conservation Demo API - Feb 05, 2026
 * 
 * Returns demo data for Ghana/Africa elephant conservation demonstration:
 * - Smart fence sensors with MycoBrain devices
 * - Elephant trackers with GPS and biosignals
 * - Environmental monitors with smell detection
 * - Conservation events (crossings, breaches, health alerts)
 */

import { NextResponse } from "next/server"

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

export async function GET() {
  const now = new Date().toISOString()
  
  // Simulate slight position changes for elephants
  const elephants = DEMO_ELEPHANTS.map(e => ({
    ...e,
    lat: e.lat + (Math.random() - 0.5) * 0.001,
    lng: e.lng + (Math.random() - 0.5) * 0.001,
    lastUpdate: now,
  }))

  return NextResponse.json({
    ok: true,
    demo: true,
    timestamp: now,
    zones: CONSERVATION_ZONES,
    elephants,
    fenceSegments: DEMO_FENCE_SEGMENTS,
    environmentMonitors: DEMO_ENVIRONMENT_MONITORS,
    devices: generateDevices(),
    events: DEMO_EVENTS,
    stats: {
      totalElephants: elephants.length,
      healthyElephants: elephants.filter(e => e.status === "healthy").length,
      warningElephants: elephants.filter(e => e.status === "warning").length,
      criticalElephants: elephants.filter(e => e.status === "critical").length,
      activeFences: DEMO_FENCE_SEGMENTS.filter(f => f.status === "active").length,
      breachedFences: DEMO_FENCE_SEGMENTS.filter(f => f.status === "breach").length,
      onlineMonitors: DEMO_ENVIRONMENT_MONITORS.filter(m => m.status === "online").length,
      recentEvents: DEMO_EVENTS.length,
    },
  })
}
