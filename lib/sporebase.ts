/**
 * SporeBase v4 centralized specifications and configuration.
 * Aligned with docs/sporebase-whitepaper.md and whitepaper product definition.
 */

export const SPOREBASE_SPECS = {
  sampling: {
    flowRate: "10 L/min",
    segments: "15-60 min",
    coverage: "~100m",
    segmentResolution: "15-60 minute time-indexed segments",
    pcrReady: true,
  },
  hardware: {
    mcu: "ESP32-S3",
    sensors: ["BME688", "BME690", "BMV080"],
    connectivity: ["WiFi", "LoRa", "BLE"],
    storage: "microSD / eMMC",
    power: "Solar + LiFePO₄/Li-ion + BMS",
  },
  enclosure: {
    rating: "IP65",
    material: "UV-stable polymer",
  },
  tape: {
    medium: "Polyester (Melinex-type) adhesive tape",
    segmentIntervalMinutes: 15,
    maxSegmentsPerCassette: 2880,
    cassetteDays: 30,
  },
} as const

export const SPOREBASE_PRICING = {
  research: {
    hardwareMsrp: 3500,
    subscriptionMonthly: 50,
    subscriptionYearly: 600,
    consumablesMonthly: 25,
    consumablesYearly: 300,
  },
  enterprise: {
    hardwareMsrp: 6900,
    subscriptionMonthly: 150,
    subscriptionYearly: 1800,
    consumablesMonthly: 50,
    consumablesYearly: 600,
  },
} as const

export const SPOREBASE_STATUSES = [
  "collected",
  "in_transit",
  "at_lab",
  "analyzing",
  "results_ready",
  "archived",
] as const

export type SporeBaseSampleStatus = (typeof SPOREBASE_STATUSES)[number]

export const SPOREBASE_ANALYSIS_TYPES = [
  "microscopy",
  "qpcr",
  "sequencing",
  "culture",
] as const

export type SporeBaseAnalysisType = (typeof SPOREBASE_ANALYSIS_TYPES)[number]
