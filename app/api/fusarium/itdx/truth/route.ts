import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { SAMPLE_COUNT, snapshot } from "@/lib/itdx/replay-core.mjs"
import { collectTruthBinds } from "@/lib/itdx/truth-binds.mjs"
import { scoreAsset } from "@/lib/itdx/truth-fusion.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}

export async function GET(request: Request) {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  const url = new URL(request.url)
  const index = Number(url.searchParams.get("index") || "0")
  const selectedId = url.searchParams.get("selected") || ""
  if (!Number.isInteger(index) || index < 0 || index >= SAMPLE_COUNT) {
    return NextResponse.json({ error: "Replay index must be an integer 0–120" }, { status: 400, headers: HEADERS })
  }

  const frame = snapshot(index)
  const selected = frame.assets.find((asset) => asset.id === selectedId) || frame.assets[0]
  const neighbors = frame.assets
    .filter((asset) => asset.id !== selected?.id)
    .map((asset) => ({
      id: asset.id,
      label: asset.label,
      position: asset.position,
      age_seconds: asset.age_seconds,
      circle_hold: asset.circle_hold,
      p_truth: asset.p_truth,
      data_quality: asset.data_quality,
    }))

  const binds = await collectTruthBinds({
    index,
    replay_time: frame.replay_time,
    selected: selected
      ? {
          id: selected.id,
          label: selected.label,
          position: selected.position,
          age_seconds: selected.age_seconds,
          haversine_error_m: selected.haversine_error_m,
          circle_hold: selected.circle_hold,
          data_quality: selected.data_quality,
        }
      : null,
    neighbors,
  })

  const assets = frame.assets.map((asset) => {
    const fused = scoreAsset(
      asset,
      frame.assets.filter((item) => item.id !== asset.id),
      binds.channels,
    )
    return {
      asset_id: asset.id,
      label: asset.label,
      p_truth: fused.p_truth,
      p_unsupported: fused.p_unsupported,
      p_truth_pct: fused.p_truth_pct,
      p_unsupported_pct: fused.p_unsupported_pct,
      halo_color: fused.halo_color,
      quality: fused.quality,
      quality_flags: fused.quality_flags,
      deception_status: fused.deception_status,
      coercion_status: fused.coercion_status,
      confusion_status: fused.confusion_status,
      counterintel_status: fused.counterintel_status,
      log_odds: fused.log_odds,
      active_weight_sum: fused.active_weight_sum,
      channels: fused.channels,
      who_decided: fused.who_decided,
      formula: fused.formula,
      geometry: fused.geometry,
    }
  })

  const selectedFusion = assets.find((asset) => asset.asset_id === selected?.id) || assets[0]

  return NextResponse.json(
    {
      schema: "itdx-truth-fusion/v1",
      overlay: { synthetic: true, live: false },
      class_p_is_geo_radius: false,
      index,
      replay_time: frame.replay_time,
      selected: selectedFusion,
      assets,
      byId: Object.fromEntries(assets.map((asset) => [asset.asset_id, asset])),
      binds: {
        nlm: binds.nlm,
        myca: binds.myca,
        myca_status: binds.myca_status,
        task8: binds.task8,
        task8_probes: binds.task8_probes,
        situation: binds.situation,
        situation_status: binds.situation_status,
        weather: binds.weather,
        earth2: binds.earth2,
        crep: binds.crep,
        physics: binds.physics,
        governor: binds.governor
          ? { status: binds.governor.status, approved: binds.governor.data?.approved ?? null }
          : null,
      },
    },
    { headers: HEADERS },
  )
}
