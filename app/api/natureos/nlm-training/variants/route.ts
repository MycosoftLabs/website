import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  isOwnerOrSuperuserRole,
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from "@/lib/auth/verified-identity"
import { CANONICAL_ARCHITECTURE_VARIANTS } from "@/lib/nlm/canonical-seeds"

export const dynamic = "force-dynamic"

function normalizeVariant(row: any) {
  const created = row.created_at || row.updated_at
  const createdMs = created ? new Date(created).getTime() : Date.now()
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    streams: row.streams || {},
    core: {
      ...(row.core || {}),
      backbone: row.core?.backbone || row.core?.type || "mamba-graph-hybrid",
      attention: row.core?.attention || "Sparse-Merkle",
      temporal: row.core?.temporal || "SSM/Mamba",
    },
    preconditioners: row.preconditioners || [],
    metrics: {
      ...(row.metrics || {}),
      accuracy: row.metrics?.accuracy ?? row.metrics?.target_accuracy ?? null,
      latency:
        row.metrics?.latency ??
        (row.metrics?.max_latency_ms != null ? `${row.metrics.max_latency_ms}ms` : null),
      avaniScore: row.metrics?.avaniScore ?? null,
    },
    timestamp: {
      seconds: Math.floor(createdMs / 1000),
      iso: created || null,
    },
    isCatalog: Boolean(row.isCatalog),
  }
}

function catalogVariants() {
  return CANONICAL_ARCHITECTURE_VARIANTS.map((v) =>
    normalizeVariant({
      id: v.id,
      name: v.name,
      owner_id: null,
      streams: v.streams,
      core: v.core,
      preconditioners: v.preconditioners,
      metrics: v.metrics,
      created_at: null,
      isCatalog: true,
    })
  )
}

/** Public catalog variants for logged-out; authenticated merge Supabase. */
export async function GET() {
  const variants = catalogVariants()
  const seen = new Set(variants.map((v) => v.id))

  const identity = await resolveVerifiedIdentity()
  if (
    identity.isAuthenticated &&
    (identity.isSuperuser || isOwnerOrSuperuserRole(identity.userRole))
  ) {
    try {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from("nlm_variants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
      for (const row of data || []) {
        const n = normalizeVariant(row)
        if (!seen.has(n.id)) {
          variants.push(n)
          seen.add(n.id)
        }
      }
    } catch {
      // catalog-only ok
    }
  }

  return NextResponse.json({
    variants,
    source: "catalog",
    auth: identity.isAuthenticated ? "authenticated" : "anonymous",
  })
}

export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError
  const body = await request.json()
  const supabase = await createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("nlm_variants")
    .upsert({
      id: body.id || undefined,
      name: body.name || "NLM Variant",
      owner_id: body.ownerId || identity.userId,
      streams: body.streams || {},
      core: body.core || {},
      preconditioners: body.preconditioners || [],
      metrics: body.metrics || {},
      updated_at: now,
      created_at: body.created_at || now,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variant: normalizeVariant(data), source: "supabase" }, { status: 201 })
}
