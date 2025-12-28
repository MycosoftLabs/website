import { NextResponse } from "next/server"

type IonoActivity = "quiet" | "moderate" | "active" | "storm"

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function GET() {
  const activities: IonoActivity[] = ["quiet", "moderate", "active", "storm"]
  const ionosphere = Array.from({ length: 40 }, (_, i) => ({
    id: `iono-${i}`,
    lat: 20 + Math.random() * 40,
    lng: -130 + Math.random() * 70,
    tec: 10 + Math.random() * 50,
    activity: pick(activities),
  }))

  return NextResponse.json({
    solar: {
      kpIndex: Math.floor(Math.random() * 9),
      solarWindKps: Math.floor(300 + Math.random() * 400),
      xrayFlux: `B${Math.floor(Math.random() * 9)}`,
    },
    ionosphere,
    timestamp: new Date().toISOString(),
  })
}

