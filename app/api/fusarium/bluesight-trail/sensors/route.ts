import { NextResponse } from "next/server"
import type { SensorBind } from "@/lib/fusarium/bluesight/trail-ar"

export const dynamic = "force-dynamic"

async function probe(url: string, ms = 1500): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  const mycobrain = await probe("http://127.0.0.1:8003/health")
  const sidecar = await probe("http://127.0.0.1:8767/health")
  const sensors: SensorBind[] = [
    {
      id: "camera",
      label: "Camera (PXL replay)",
      bind: "BOUND",
      detail: "PXL_20260913_211840104.mp4 · recorded exercise · live:false",
    },
    {
      id: "radar",
      label: "Radar",
      bind: "UNBOUND",
      detail: "No radar BFF on this Trail AR surface",
    },
    {
      id: "lidar",
      label: "LiDAR",
      bind: "UNBOUND",
      detail: mycobrain ? "MycoBrain up; no LiDAR device attached" : "MycoBrain health unreachable",
    },
    {
      id: "wifi-sense",
      label: "WiFi Sense",
      bind: "UNBOUND",
      detail: "No WiFi Sense stream bound to this replay",
    },
    {
      id: "tof",
      label: "ToF / laser / depth",
      bind: "UNBOUND",
      detail: "No metric depth. Monocular metres unqualified",
    },
    {
      id: "voc",
      label: "VOC",
      bind: "UNBOUND",
      detail: "No VOC stream on this clip",
    },
    {
      id: "bme688",
      label: "BME688 gas",
      bind: "UNBOUND",
      detail: mycobrain ? "MycoBrain service ok; 0 gas devices in this probe" : "MycoBrain UNBOUND",
    },
    {
      id: "bme690",
      label: "BME690 gas",
      bind: "UNBOUND",
      detail: "No BME690 telemetry on this replay",
    },
    {
      id: "temperature",
      label: "Temperature",
      bind: "UNBOUND",
      detail: "No temperature series for the PXL file",
    },
    {
      id: "yolo26-sahi",
      label: "YOLO26 + SAHI sidecar",
      bind: sidecar ? "BOUND" : "UNBOUND",
      detail: sidecar ? "http://127.0.0.1:8767" : "Sidecar not running — boxes stay empty until inferred",
    },
  ]
  return NextResponse.json({
    live: false,
    banner: "SYNTHETIC EXERCISE",
    forecast_p: null,
    bound_to_ollama: false,
    mycobrain_health: mycobrain,
    sidecar_8767: sidecar,
    sensors,
  })
}
