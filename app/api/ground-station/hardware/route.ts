/**
 * Ground Station Hardware API
 *
 * CRUD for SDRs, rotators, rigs, cameras.
 */

import { NextRequest, NextResponse } from "next/server"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "all"

  try {
    if (type === "all") {
      const [sdrs, rotators, rigs, cameras] = await Promise.all([
        gsDb.select().from(schema.gsSDRs),
        gsDb.select().from(schema.gsRotators),
        gsDb.select().from(schema.gsRigs),
        gsDb.select().from(schema.gsCameras),
      ])
      return NextResponse.json({
        sdrs: sdrs.map(formatSDR),
        rotators: rotators.map(formatRotator),
        rigs: rigs.map(formatRig),
        cameras: cameras.map(formatCamera),
      })
    }

    if (type === "sdrs") {
      const sdrs = await gsDb.select().from(schema.gsSDRs)
      return NextResponse.json(sdrs.map(formatSDR))
    }
    if (type === "rotators") {
      const rotators = await gsDb.select().from(schema.gsRotators)
      return NextResponse.json(rotators.map(formatRotator))
    }
    if (type === "rigs") {
      const rigs = await gsDb.select().from(schema.gsRigs)
      return NextResponse.json(rigs.map(formatRig))
    }
    if (type === "cameras") {
      const cameras = await gsDb.select().from(schema.gsCameras)
      return NextResponse.json(cameras.map(formatCamera))
    }

    return NextResponse.json({ error: `Unknown hardware type: ${type}` }, { status: 400 })
  } catch (error) {
    console.error("Ground Station hardware error:", error)
    return NextResponse.json(
      { error: "Ground Station hardware error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  if (!type) {
    return NextResponse.json({ error: "type parameter required" }, { status: 400 })
  }

  try {
    const body = await request.json()

    if (type === "sdrs") {
      const [sdr] = await gsDb.insert(schema.gsSDRs).values({
        name: body.name,
        serial: body.serial,
        host: body.host,
        port: body.port,
        type: body.type,
        driver: body.driver,
        frequencyMin: body.frequency_min,
        frequencyMax: body.frequency_max,
      }).returning()
      return NextResponse.json(formatSDR(sdr))
    }

    if (type === "rotators") {
      const [rotator] = await gsDb.insert(schema.gsRotators).values({
        name: body.name,
        host: body.host,
        port: body.port,
        minaz: body.minaz ?? 0,
        maxaz: body.maxaz ?? 360,
        minel: body.minel ?? 0,
        maxel: body.maxel ?? 90,
        aztolerance: body.aztolerance ?? 1,
        eltolerance: body.eltolerance ?? 1,
      }).returning()
      return NextResponse.json(formatRotator(rotator))
    }

    if (type === "rigs") {
      const [rig] = await gsDb.insert(schema.gsRigs).values({
        name: body.name,
        host: body.host,
        port: body.port,
        radiotype: body.radiotype,
        radioMode: body.radio_mode ?? "FM",
        vfotype: body.vfotype ?? 0,
        txControlMode: body.tx_control_mode ?? "none",
        retuneIntervalMs: body.retune_interval_ms ?? 1000,
        followDownlinkTuning: body.follow_downlink_tuning ?? true,
      }).returning()
      return NextResponse.json(formatRig(rig))
    }

    if (type === "cameras") {
      const [camera] = await gsDb.insert(schema.gsCameras).values({
        name: body.name,
        url: body.url,
        type: body.type ?? "mjpeg",
        status: body.status ?? "active",
      }).returning()
      return NextResponse.json(formatCamera(camera))
    }

    return NextResponse.json({ error: `Unknown hardware type: ${type}` }, { status: 400 })
  } catch (error) {
    console.error("Ground Station hardware create error:", error)
    return NextResponse.json(
      { error: "Ground Station hardware create failed", details: String(error) },
      { status: 500 }
    )
  }
}

function formatSDR(row: typeof schema.gsSDRs.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    serial: row.serial,
    host: row.host,
    port: row.port,
    type: row.type,
    driver: row.driver,
    frequency_min: row.frequencyMin,
    frequency_max: row.frequencyMax,
    added: row.added?.toISOString(),
    updated: row.updated?.toISOString(),
  }
}

function formatRotator(row: typeof schema.gsRotators.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    minaz: row.minaz,
    maxaz: row.maxaz,
    minel: row.minel,
    maxel: row.maxel,
    aztolerance: row.aztolerance,
    eltolerance: row.eltolerance,
    added: row.added?.toISOString(),
    updated: row.updated?.toISOString(),
  }
}

function formatRig(row: typeof schema.gsRigs.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    radiotype: row.radiotype,
    radio_mode: row.radioMode,
    vfotype: row.vfotype,
    tx_control_mode: row.txControlMode,
    retune_interval_ms: row.retuneIntervalMs,
    follow_downlink_tuning: row.followDownlinkTuning,
    added: row.added?.toISOString(),
    updated: row.updated?.toISOString(),
  }
}

function formatCamera(row: typeof schema.gsCameras.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    type: row.type,
    status: row.status,
    added: row.added?.toISOString(),
    updated: row.updated?.toISOString(),
  }
}
