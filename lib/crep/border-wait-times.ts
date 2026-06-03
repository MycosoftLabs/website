export const CBP_WAIT_TIMES_URL = "https://bwt.cbp.gov/api/waittimes"

export type BorderLane = {
  mode: "commercial" | "passenger" | "pedestrian"
  lane_type: string
  label: string
  operational_status: string | null
  delay_minutes: number | null
  lanes_open: number | null
  update_time: string | null
  maximum_lanes: number | null
}

export type BorderCrossingWait = {
  port_number: string
  port_name: string
  crossing_name: string
  display_name: string
  border: string
  hours: string
  date: string
  time: string
  port_status: string
  construction_notice: string | null
  max_delay_minutes: number | null
  lane_groups: BorderLane[]
}

export type BorderWaitTimesPayload = {
  source: "cbp-border-wait-times"
  source_url: string
  generated_at: string
  port: "san-ysidro"
  crossings: BorderCrossingWait[]
}

type CbpLane = {
  update_time?: string
  operational_status?: string
  delay_minutes?: string
  lanes_open?: string
}

type CbpCrossing = {
  port_number?: string
  border?: string
  port_name?: string
  crossing_name?: string
  hours?: string
  date?: string
  time?: string
  port_status?: string
  commercial_vehicle_lanes?: {
    maximum_lanes?: string
    standard_lanes?: CbpLane
    FAST_lanes?: CbpLane
  }
  passenger_vehicle_lanes?: {
    maximum_lanes?: string
    standard_lanes?: CbpLane
    NEXUS_SENTRI_lanes?: CbpLane
    ready_lanes?: CbpLane
  }
  pedestrian_lanes?: {
    maximum_lanes?: string
    standard_lanes?: CbpLane
    ready_lanes?: CbpLane
  }
  construction_notice?: string
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numberOrNull(value: unknown): number | null {
  const raw = text(value)
  if (!raw || raw.toLowerCase() === "n/a") return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function statusOrNull(value: unknown): string | null {
  const raw = text(value)
  if (!raw || raw.toLowerCase() === "n/a") return null
  return raw
}

function lane(
  mode: BorderLane["mode"],
  laneType: string,
  label: string,
  item: CbpLane | undefined,
  maximumLanes: unknown,
): BorderLane {
  return {
    mode,
    lane_type: laneType,
    label,
    operational_status: statusOrNull(item?.operational_status),
    delay_minutes: numberOrNull(item?.delay_minutes),
    lanes_open: numberOrNull(item?.lanes_open),
    update_time: statusOrNull(item?.update_time),
    maximum_lanes: numberOrNull(maximumLanes),
  }
}

function normalizeCrossing(row: CbpCrossing): BorderCrossingWait {
  const portNumber = text(row.port_number)
  const crossingName = text(row.crossing_name)
  const displayName = crossingName
    ? `San Ysidro ${crossingName}`
    : "San Ysidro Point of Entry"

  const laneGroups = [
    lane("commercial", "standard", "Commercial standard", row.commercial_vehicle_lanes?.standard_lanes, row.commercial_vehicle_lanes?.maximum_lanes),
    lane("commercial", "fast", "Commercial FAST", row.commercial_vehicle_lanes?.FAST_lanes, row.commercial_vehicle_lanes?.maximum_lanes),
    lane("passenger", "standard", "Passenger standard", row.passenger_vehicle_lanes?.standard_lanes, row.passenger_vehicle_lanes?.maximum_lanes),
    lane("passenger", "sentri", "Passenger SENTRI", row.passenger_vehicle_lanes?.NEXUS_SENTRI_lanes, row.passenger_vehicle_lanes?.maximum_lanes),
    lane("passenger", "ready", "Passenger ready lane", row.passenger_vehicle_lanes?.ready_lanes, row.passenger_vehicle_lanes?.maximum_lanes),
    lane("pedestrian", "standard", "Pedestrian standard", row.pedestrian_lanes?.standard_lanes, row.pedestrian_lanes?.maximum_lanes),
    lane("pedestrian", "ready", "Pedestrian ready lane", row.pedestrian_lanes?.ready_lanes, row.pedestrian_lanes?.maximum_lanes),
  ]

  const maxDelay = laneGroups.reduce<number | null>((best, group) => {
    if (group.delay_minutes == null) return best
    return best == null ? group.delay_minutes : Math.max(best, group.delay_minutes)
  }, null)

  return {
    port_number: portNumber,
    port_name: text(row.port_name) || "San Ysidro",
    crossing_name: crossingName,
    display_name: displayName,
    border: text(row.border) || "Mexican Border",
    hours: text(row.hours) || "unknown",
    date: text(row.date),
    time: text(row.time),
    port_status: text(row.port_status) || "Unknown",
    construction_notice: statusOrNull(row.construction_notice),
    max_delay_minutes: maxDelay,
    lane_groups: laneGroups,
  }
}

export function isSanYsidroCbpRow(row: CbpCrossing): boolean {
  const portNumber = text(row.port_number)
  const portName = text(row.port_name).toLowerCase()
  return portNumber.startsWith("2504") || portName === "san ysidro"
}

export async function fetchSanYsidroWaitTimes(): Promise<BorderWaitTimesPayload> {
  const res = await fetch(CBP_WAIT_TIMES_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MycosoftCREP/1.0",
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`CBP wait-times HTTP ${res.status}`)
  }
  const rows = (await res.json()) as CbpCrossing[]
  const crossings = (Array.isArray(rows) ? rows : [])
    .filter(isSanYsidroCbpRow)
    .map(normalizeCrossing)
    .sort((a, b) => {
      const order = new Map([
        ["250401", 0],
        ["250409", 1],
        ["250407", 2],
      ])
      return (order.get(a.port_number) ?? 99) - (order.get(b.port_number) ?? 99)
    })

  return {
    source: "cbp-border-wait-times",
    source_url: CBP_WAIT_TIMES_URL,
    generated_at: new Date().toISOString(),
    port: "san-ysidro",
    crossings,
  }
}
