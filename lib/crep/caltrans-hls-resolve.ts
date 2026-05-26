/**
 * Caltrans HLS resolver — May 26, 2026
 *
 * Baked registry rows often have stream_url:null while Caltrans JSON still
 * publishes streamingVideoURL. Resolve HLS from embed/snapshot/id hints.
 */

type CaltransCam = {
  stream_url: string | null
  embed_url: string | null
  snapshot_url: string | null
}

const districtCache = new Map<number, { ts: number; rows: CaltransCam[] }>()
const DISTRICT_TTL_MS = 5 * 60_000

function parseDistrictFromEmbed(embedUrl: string | null | undefined): number | null {
  if (!embedUrl) return null
  const m = /cwwp2\.dot\.ca\.gov\/vm\/loc\/(d\d+)\//i.exec(embedUrl)
  if (!m) return null
  const n = Number(m[1].replace(/^d/i, ""))
  return Number.isFinite(n) ? n : null
}

function parseSlugFromEmbed(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null
  const m = /cwwp2\.dot\.ca\.gov\/vm\/loc\/d\d+\/([^/.?#]+)\.htm/i.exec(embedUrl)
  return m ? m[1].toLowerCase() : null
}

function parseSlugFromSnapshot(snapshotUrl: string | null | undefined): string | null {
  if (!snapshotUrl) return null
  const m = /cwwp2\.dot\.ca\.gov\/data\/(d\d+)\/cctv\/image\/([^/]+)\//i.exec(snapshotUrl)
  return m ? m[2].toLowerCase() : null
}

function parseDistrictFromSourceId(sourceId: string): number | null {
  const m = /^caltrans-d(\d+)-/i.exec(sourceId)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function decodeProxiedSnapshot(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl) return null
  if (mediaUrl.startsWith("http")) return mediaUrl
  try {
    const q = mediaUrl.split("?")[1] || ""
    const params = new URLSearchParams(q)
    const upstream = params.get("url")
    return upstream ? decodeURIComponent(upstream) : null
  } catch {
    return null
  }
}

async function fetchDistrictCams(district: number): Promise<CaltransCam[]> {
  const now = Date.now()
  const hit = districtCache.get(district)
  if (hit && now - hit.ts < DISTRICT_TTL_MS) return hit.rows

  const url = `https://cwwp2.dot.ca.gov/data/d${district}/cctv/cctvStatusD${String(district).padStart(2, "0")}.json`
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  })
  if (!res.ok) return hit?.rows || []
  const j = await res.json()
  const items: any[] = j?.data || []
  const rows: CaltransCam[] = items
    .map((entry: any): CaltransCam | null => {
      const cctv = entry?.cctv
      if (!cctv) return null
      const snapshot = cctv?.imageData?.static?.currentImageURL || null
      const stream = cctv?.imageData?.streamingVideoURL || null
      let embed: string | null = null
      if (snapshot) {
        const m = /cwwp2\.dot\.ca\.gov\/data\/(d\d+)\/cctv\/image\/([^/]+)\//i.exec(snapshot)
        if (m) embed = `https://cwwp2.dot.ca.gov/vm/loc/${m[1]}/${m[2]}.htm`
      }
      if (!embed && cctv?.indexCctv) {
        embed = `https://cwwp2.dot.ca.gov/vm/iframemap.htm?code=${encodeURIComponent(cctv.indexCctv)}`
      }
      return {
        stream_url: stream,
        embed_url: embed,
        snapshot_url: snapshot,
      }
    })
    .filter((r): r is CaltransCam => !!r)

  districtCache.set(district, { ts: now, rows })
  return rows
}

function pickBySlug(rows: CaltransCam[], slug: string): CaltransCam | null {
  const s = slug.toLowerCase()
  for (const row of rows) {
    const embedSlug = parseSlugFromEmbed(row.embed_url)
    const snapSlug = parseSlugFromSnapshot(row.snapshot_url)
    if (embedSlug === s || snapSlug === s) return row
    if (row.snapshot_url?.toLowerCase().includes(`/${s}/`)) return row
    if (row.embed_url?.toLowerCase().includes(`/${s}.htm`)) return row
  }
  return null
}

export interface CaltransResolveInput {
  sourceId?: string
  stream_url?: string | null
  embed_url?: string | null
  media_url?: string | null
}

/** Returns HLS m3u8 URL when Caltrans publishes one for this camera. */
export async function resolveCaltransHls(input: CaltransResolveInput): Promise<string | null> {
  const existing = (input.stream_url || "").trim()
  if (existing && /\.m3u8/i.test(existing)) return existing

  const snapshot =
    decodeProxiedSnapshot(input.media_url) ||
    parseSlugFromSnapshot(input.media_url || "") ||
    null
  const embed = input.embed_url || null
  const slug =
    parseSlugFromEmbed(embed) ||
    parseSlugFromSnapshot(snapshot) ||
    null
  const district =
    parseDistrictFromEmbed(embed) ||
    parseDistrictFromSnapshot(snapshot) ||
    parseDistrictFromSourceId(input.sourceId || "") ||
    null

  if (!district || !slug) return null

  const rows = await fetchDistrictCams(district)
  const match = pickBySlug(rows, slug)
  const stream = match?.stream_url || null
  return stream && /\.m3u8/i.test(stream) ? stream : null
}

export function caltransProxiedSnapshot(
  embedUrl: string | null | undefined,
  mediaUrl: string | null | undefined,
): string | null {
  const upstream = decodeProxiedSnapshot(mediaUrl)
  if (upstream?.startsWith("http")) {
    return `/api/eagle/cam-image?url=${encodeURIComponent(upstream)}`
  }
  const slug = parseSlugFromEmbed(embedUrl)
  const district = parseDistrictFromEmbed(embedUrl)
  if (slug && district) {
    const upstreamJpg = `https://cwwp2.dot.ca.gov/data/${district}/cctv/image/${slug}/${slug}.jpg`
    return `/api/eagle/cam-image?url=${encodeURIComponent(upstreamJpg)}`
  }
  return null
}
