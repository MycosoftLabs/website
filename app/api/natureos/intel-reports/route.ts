/**
 * Intel Reports API - Defense and Environmental Intelligence Reports
 * 
 * Provides structured intelligence reports using military/defense acronyms:
 * - ETA: Environmental Threat Assessment
 * - ESI: Environmental Stability Index
 * - BAR: Biological Anomaly Report
 * - RER: Remediation Effectiveness Report
 * - EEW: Environmental Early Warning
 * 
 * These reports support dual-use military and environmental intelligence goals.
 */

import { NextResponse } from "next/server";

export interface IntelReport {
  id: string;
  type: "eta" | "esi" | "bar" | "rer" | "eew";
  title: string;
  summary: string;
  details?: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  classification: "UNCLASSIFIED" | "CUI" | "CONFIDENTIAL";
  timestamp: string;
  expiresAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    region?: string;
    country?: string;
  };
  source: string;
  analyst?: string;
  confidence: number; // 0-100
  indicators?: {
    name: string;
    value: number | string;
    status: "normal" | "elevated" | "warning" | "critical";
  }[];
  recommendations?: string[];
  relatedReports?: string[];
  link?: string;
}

// Generate realistic intel reports
function generateIntelReports(): IntelReport[] {
  const now = Date.now();
  const reports: IntelReport[] = [];

  // Environmental Threat Assessments (ETA)
  reports.push({
    id: `eta-${now}-001`,
    type: "eta",
    title: "ETA-2026-0114-A: PFAS Contamination Spread Model",
    summary: "Predictive model indicates 23% expansion of PFAS contamination plume in aquifer system over next 90 days without intervention.",
    details: "Analysis of groundwater monitoring data from 47 sensors shows accelerating migration of per- and polyfluoroalkyl substances. Recommended immediate activation of remediation protocols at Grid Reference 34N-118W.",
    severity: "high",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      name: "Los Angeles Basin Aquifer",
      region: "Southern California",
      country: "USA",
    },
    source: "OEI Sensor Network",
    analyst: "MYCA-ENVIRO-001",
    confidence: 87,
    indicators: [
      { name: "PFAS Concentration", value: "45 ppt", status: "critical" },
      { name: "Migration Rate", value: "2.3 m/day", status: "warning" },
      { name: "Affected Wells", value: 12, status: "elevated" },
    ],
    recommendations: [
      "Activate carbon filtration at municipal wells 7-12",
      "Deploy mobile treatment unit to Grid 34N-118W",
      "Issue public advisory for private well users",
    ],
  });

  reports.push({
    id: `eta-${now}-002`,
    type: "eta",
    title: "ETA-2026-0114-B: Microbial Corrosion Risk - Pipeline Alpha",
    summary: "Elevated MIC indicators detected on critical infrastructure. Probability of structural compromise: 34% over 180 days.",
    severity: "medium",
    classification: "CUI",
    timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 33.7000,
      longitude: -117.8000,
      name: "Pipeline Segment Alpha-7",
      region: "Orange County",
      country: "USA",
    },
    source: "MycoNode Biofilm Sensors",
    analyst: "MYCA-INFRA-003",
    confidence: 76,
    indicators: [
      { name: "Sulfate-Reducing Bacteria", value: "2.4e6 CFU/mL", status: "warning" },
      { name: "Metal Loss Rate", value: "0.8 mm/yr", status: "elevated" },
      { name: "pH Level", value: 5.2, status: "warning" },
    ],
    recommendations: [
      "Schedule inline inspection within 30 days",
      "Apply biocide treatment to affected segment",
      "Increase cathodic protection current",
    ],
  });

  // Environmental Stability Index (ESI)
  reports.push({
    id: `esi-${now}-001`,
    type: "esi",
    title: "ESI Daily Brief: Pacific Northwest Region",
    summary: "Regional ESI score: 72/100 (STABLE). Slight degradation from atmospheric river forecast.",
    severity: "info",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 47.6062,
      longitude: -122.3321,
      name: "Pacific Northwest",
      region: "WA/OR",
      country: "USA",
    },
    source: "NatureOS Stability Model",
    analyst: "MYCA-STABILITY-001",
    confidence: 91,
    indicators: [
      { name: "ESI Score", value: 72, status: "normal" },
      { name: "Trend", value: "-3 pts (7d)", status: "elevated" },
      { name: "Forest Health", value: "84%", status: "normal" },
      { name: "Water Quality", value: "91%", status: "normal" },
      { name: "Air Quality Index", value: 45, status: "normal" },
    ],
  });

  // Biological Anomaly Reports (BAR)
  reports.push({
    id: `bar-${now}-001`,
    type: "bar",
    title: "BAR-2026-0114: Unusual Fungal Bloom - Cordyceps sp.",
    summary: "Anomalous Cordyceps fruiting detected 6 weeks ahead of typical season. Investigating environmental triggers.",
    severity: "low",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 45.5152,
      longitude: -122.6784,
      name: "Forest Park",
      region: "Portland Metro",
      country: "USA",
    },
    source: "MycoBrain Field Sensors",
    analyst: "MYCA-BIO-007",
    confidence: 82,
    indicators: [
      { name: "Species", value: "Cordyceps militaris", status: "normal" },
      { name: "Density", value: "23/m²", status: "elevated" },
      { name: "Seasonal Deviation", value: "+42 days", status: "warning" },
    ],
    recommendations: [
      "Deploy additional spore sensors to region",
      "Cross-reference with climate anomaly data",
      "Monitor for host population impacts",
    ],
  });

  reports.push({
    id: `bar-${now}-002`,
    type: "bar",
    title: "BAR-2026-0114: Invasive Phytophthora Detection",
    summary: "Phytophthora ramorum (Sudden Oak Death) DNA detected in new watershed. Immediate containment recommended.",
    severity: "critical",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
    location: {
      latitude: 37.8044,
      longitude: -122.2712,
      name: "East Bay Hills",
      region: "Alameda County",
      country: "USA",
    },
    source: "eDNA Water Sampling",
    analyst: "MYCA-PATHOGEN-002",
    confidence: 94,
    indicators: [
      { name: "Pathogen Load", value: "High", status: "critical" },
      { name: "Spread Rate", value: "Unknown", status: "warning" },
      { name: "At-Risk Trees", value: "~50,000", status: "critical" },
    ],
    recommendations: [
      "Establish 500m quarantine zone",
      "Notify California Dept of Food & Agriculture",
      "Begin emergency host removal protocol",
    ],
  });

  // Remediation Effectiveness Reports (RER)
  reports.push({
    id: `rer-${now}-001`,
    type: "rer",
    title: "RER-2026-Q1: Mycoremediation Site Alpha - Progress Report",
    summary: "Pleurotus ostreatus deployment achieving 67% PAH reduction after 90 days. On track for target metrics.",
    severity: "info",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      name: "Brownfield Site Alpha",
      region: "New Jersey",
      country: "USA",
    },
    source: "Remediation Monitoring System",
    analyst: "MYCA-REMEDIATION-001",
    confidence: 88,
    indicators: [
      { name: "PAH Reduction", value: "67%", status: "normal" },
      { name: "Target", value: "85%", status: "normal" },
      { name: "Days Remaining", value: 90, status: "normal" },
      { name: "Mycelium Coverage", value: "94%", status: "normal" },
    ],
  });

  // Environmental Early Warnings (EEW)
  reports.push({
    id: `eew-${now}-001`,
    type: "eew",
    title: "EEW ALERT: Harmful Algal Bloom Predicted",
    summary: "URGENT: HAB formation likely in Lake Erie within 72-96 hours based on nutrient loading and temperature models.",
    severity: "critical",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 96 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 41.5,
      longitude: -82.5,
      name: "Western Lake Erie Basin",
      region: "Ohio/Michigan",
      country: "USA",
    },
    source: "NOAA/NatureOS HAB Forecast",
    analyst: "MYCA-AQUATIC-001",
    confidence: 79,
    indicators: [
      { name: "Microcystin Risk", value: "HIGH", status: "critical" },
      { name: "Water Temp", value: "24°C", status: "warning" },
      { name: "Phosphorus", value: "0.12 mg/L", status: "critical" },
      { name: "Wind Direction", value: "SW", status: "warning" },
    ],
    recommendations: [
      "Issue recreational water advisory",
      "Alert municipal water treatment facilities",
      "Deploy satellite monitoring assets",
      "Prepare microcystin testing resources",
    ],
  });

  reports.push({
    id: `eew-${now}-002`,
    type: "eew",
    title: "EEW ADVISORY: Atmospheric River Event",
    summary: "Category 4 atmospheric river forecast to impact Pacific Northwest in 48-72 hours. Flood and landslide risk elevated.",
    severity: "high",
    classification: "UNCLASSIFIED",
    timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    location: {
      latitude: 46.0,
      longitude: -123.0,
      name: "Pacific Northwest Coast",
      region: "WA/OR",
      country: "USA",
    },
    source: "NOAA/NWS",
    analyst: "MYCA-WEATHER-001",
    confidence: 85,
    indicators: [
      { name: "Precipitation", value: "150-250mm", status: "critical" },
      { name: "Duration", value: "36-48 hrs", status: "warning" },
      { name: "Landslide Risk", value: "HIGH", status: "critical" },
      { name: "Flood Risk", value: "MODERATE", status: "warning" },
    ],
    recommendations: [
      "Activate emergency operations centers",
      "Pre-position swift water rescue assets",
      "Issue flood watches for coastal rivers",
      "Monitor slope stability sensors",
    ],
  });

  return reports;
}

export async function GET() {
  const reports = generateIntelReports();
  
  // Sort by severity and timestamp
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  reports.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  return NextResponse.json({
    reports,
    generatedAt: new Date().toISOString(),
    totalCount: reports.length,
    bySeverity: {
      critical: reports.filter(r => r.severity === "critical").length,
      high: reports.filter(r => r.severity === "high").length,
      medium: reports.filter(r => r.severity === "medium").length,
      low: reports.filter(r => r.severity === "low").length,
      info: reports.filter(r => r.severity === "info").length,
    },
    byType: {
      eta: reports.filter(r => r.type === "eta").length,
      esi: reports.filter(r => r.type === "esi").length,
      bar: reports.filter(r => r.type === "bar").length,
      rer: reports.filter(r => r.type === "rer").length,
      eew: reports.filter(r => r.type === "eew").length,
    },
  });
}
