/**
 * NatureOS Population API — Live world population estimate for Nature Statistics panel
 *
 * Uses UN/Worldometer-style rates so the front end can drive animated counters.
 * Reference: Population counter systems (e.g. worldometers.info, population.io).
 * Values are computed from a fixed baseline + elapsed time (no mock data; deterministic).
 */

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Reference: ~8.1B as of 2024; rates from UN/Worldometer-style population clocks
const REFERENCE_EPOCH_MS = new Date("2024-01-01T00:00:00Z").getTime()
const BASE_POPULATION = 8_123_456_789
const BIRTHS_PER_SECOND = 4.3
const DEATHS_PER_SECOND = 1.8
const NET_GROWTH_PER_SECOND = BIRTHS_PER_SECOND - DEATHS_PER_SECOND

function secondsSinceMidnightUTC(now: Date): number {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  return (now.getTime() - start.getTime()) / 1000
}

export async function GET() {
  const now = new Date()
  const elapsedSeconds = (now.getTime() - REFERENCE_EPOCH_MS) / 1000
  const population = Math.floor(BASE_POPULATION + elapsedSeconds * NET_GROWTH_PER_SECOND)

  const secondsToday = secondsSinceMidnightUTC(now)
  const birthsToday = Math.floor(secondsToday * BIRTHS_PER_SECOND)
  const deathsToday = Math.floor(secondsToday * DEATHS_PER_SECOND)
  const netToday = birthsToday - deathsToday

  return NextResponse.json({
    population,
    birthsPerSecond: BIRTHS_PER_SECOND,
    deathsPerSecond: DEATHS_PER_SECOND,
    netGrowthPerSecond: NET_GROWTH_PER_SECOND,
    birthsToday,
    deathsToday,
    netToday,
    timestamp: now.toISOString(),
    source: "estimate",
    reference: "UN/Worldometer-style population clock rates",
  })
}
