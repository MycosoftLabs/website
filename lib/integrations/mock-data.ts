/**
 * Mock Data for Development/Fallback
 *
 * Used when INTEGRATIONS_ENABLED=false or when APIs are unavailable
 */

import type { Device, TelemetrySample, Taxon, Observation, AgentRun, Agent } from "./types"

export const mockDevices: Device[] = [
  {
    id: "mushroom1-sf-001",
    name: "Mushroom 1 - Golden Gate Park",
    type: "mushroom1",
    status: "online",
    lastSeen: new Date().toISOString(),
    location: { latitude: 37.7694, longitude: -122.4862, region: "San Francisco, CA" },
    firmwareVersion: "2.4.1",
  },
  {
    id: "sporebase-nyc-001",
    name: "SporeBase - Central Park",
    type: "sporebase",
    status: "online",
    lastSeen: new Date().toISOString(),
    location: { latitude: 40.7829, longitude: -73.9654, region: "New York, NY" },
    firmwareVersion: "3.1.0",
  },
  {
    id: "alarm-austin-001",
    name: "ALARM - Zilker Park",
    type: "alarm",
    status: "online",
    lastSeen: new Date().toISOString(),
    location: { latitude: 30.267, longitude: -97.773, region: "Austin, TX" },
    firmwareVersion: "1.8.5",
  },
  {
    id: "petreus-lab-001",
    name: "PetriDish Pro - Research Lab",
    type: "petreus",
    status: "online",
    lastSeen: new Date().toISOString(),
    location: { latitude: 37.4275, longitude: -122.1697, region: "Palo Alto, CA" },
    firmwareVersion: "4.0.2",
  },
  {
    id: "trufflebot-001",
    name: "TruffleBot Alpha",
    type: "trufflebot",
    status: "maintenance",
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    location: { latitude: 45.5231, longitude: -122.6765, region: "Portland, OR" },
    firmwareVersion: "0.9.3-beta",
  },
]

export const mockTelemetry: TelemetrySample[] = [
  {
    deviceId: "mushroom1-sf-001",
    timestamp: new Date().toISOString(),
    metrics: {
      batteryLevel: 87,
      signalStrength: 92,
      temperature: 22.5,
      humidity: 68,
      soilMoisture: 45,
      networkConnections: 12,
    },
  },
  {
    deviceId: "sporebase-nyc-001",
    timestamp: new Date().toISOString(),
    metrics: {
      batteryLevel: 94,
      signalStrength: 88,
      sporeCount: 1245,
      temperature: 18.3,
      humidity: 65,
    },
  },
  {
    deviceId: "alarm-austin-001",
    timestamp: new Date().toISOString(),
    metrics: {
      batteryLevel: 78,
      signalStrength: 95,
      airQuality: 92,
      temperature: 28.1,
      co2Level: 412,
    },
  },
  {
    deviceId: "petreus-lab-001",
    timestamp: new Date().toISOString(),
    metrics: {
      temperature: 25.0,
      humidity: 85,
      co2Level: 800,
    },
  },
]

export const mockTaxa: Taxon[] = [
  {
    id: "taxa-001",
    scientificName: "Agaricus bisporus",
    commonName: "Button Mushroom",
    kingdom: "Fungi",
    phylum: "Basidiomycota",
    class: "Agaricomycetes",
    order: "Agaricales",
    family: "Agaricaceae",
    genus: "Agaricus",
    species: "bisporus",
    edibility: "edible",
    description: "Common cultivated mushroom, also known as portobello or cremini depending on maturity.",
  },
  {
    id: "taxa-002",
    scientificName: "Pleurotus ostreatus",
    commonName: "Oyster Mushroom",
    kingdom: "Fungi",
    phylum: "Basidiomycota",
    class: "Agaricomycetes",
    order: "Agaricales",
    family: "Pleurotaceae",
    genus: "Pleurotus",
    species: "ostreatus",
    edibility: "edible",
    description: "Popular edible mushroom with fan-shaped caps, grows on dead wood.",
  },
  {
    id: "taxa-003",
    scientificName: "Ganoderma lucidum",
    commonName: "Reishi",
    kingdom: "Fungi",
    phylum: "Basidiomycota",
    class: "Agaricomycetes",
    order: "Polyporales",
    family: "Ganodermataceae",
    genus: "Ganoderma",
    species: "lucidum",
    edibility: "inedible",
    medicinalProperties: ["immune support", "adaptogenic", "anti-inflammatory"],
    description: "Medicinal mushroom used in traditional medicine for thousands of years.",
  },
]

export const mockObservations: Observation[] = [
  {
    id: "obs-001",
    taxonId: "taxa-001",
    taxon: mockTaxa[0],
    location: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
    observedAt: new Date(Date.now() - 86400000).toISOString(),
    verified: true,
    notes: "Found growing in mulched garden bed",
    deviceId: "mushroom1-sf-001",
  },
  {
    id: "obs-002",
    taxonId: "taxa-002",
    taxon: mockTaxa[1],
    location: { latitude: 40.7128, longitude: -74.006, accuracy: 15 },
    observedAt: new Date(Date.now() - 172800000).toISOString(),
    verified: true,
    notes: "Cluster on fallen oak log",
  },
]

export const mockAgents: Agent[] = [
  {
    id: "agent-classifier",
    name: "Species Classifier",
    description: "AI-powered mushroom species identification from images",
    type: "analysis",
    status: "active",
    tools: ["vision-api", "mindex-taxa"],
    runCount: 12456,
  },
  {
    id: "agent-monitor",
    name: "Network Monitor",
    description: "Monitors mycelium network health and alerts on anomalies",
    type: "monitoring",
    status: "active",
    tools: ["telemetry-api", "alert-service"],
    runCount: 89234,
  },
  {
    id: "agent-harvester",
    name: "Data Harvester",
    description: "Aggregates and processes observation data from multiple sources",
    type: "automation",
    status: "active",
    tools: ["inaturalist-api", "gbif-api", "mindex-write"],
    runCount: 3421,
  },
]

export const mockAgentRuns: AgentRun[] = [
  {
    id: "run-001",
    agentId: "agent-classifier",
    agentName: "Species Classifier",
    status: "completed",
    startedAt: new Date(Date.now() - 300000).toISOString(),
    completedAt: new Date(Date.now() - 295000).toISOString(),
    output: { speciesId: "taxa-001", confidence: 0.94 },
  },
  {
    id: "run-002",
    agentId: "agent-monitor",
    agentName: "Network Monitor",
    status: "running",
    startedAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "run-003",
    agentId: "agent-harvester",
    agentName: "Data Harvester",
    status: "completed",
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
    output: { recordsProcessed: 1245, newObservations: 89 },
  },
  {
    id: "run-004",
    agentId: "agent-classifier",
    agentName: "Species Classifier",
    status: "failed",
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7195000).toISOString(),
    error: "Image quality too low for classification",
  },
]
