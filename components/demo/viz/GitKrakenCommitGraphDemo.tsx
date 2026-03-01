"use client"

import { useEffect, useMemo, useState } from "react"

interface GithubEvent {
  id: string
  type: string
  repo: { name: string }
  actor: { login: string; avatar_url: string }
  created_at: string
  payload?: Record<string, unknown>
}

interface ActivityResponse {
  org: string
  repo?: string
  events: GithubEvent[]
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return date.toLocaleString()
}

function buildSparkline(events: GithubEvent[]) {
  const now = Date.now()
  const buckets = new Array(24).fill(0)

  events.forEach((event) => {
    const ts = new Date(event.created_at).getTime()
    const hoursAgo = Math.floor((now - ts) / (1000 * 60 * 60))
    if (hoursAgo >= 0 && hoursAgo < 24) {
      buckets[23 - hoursAgo] += 1
    }
  })

  const maxValue = Math.max(1, ...buckets)
  return buckets.map((value) => value / maxValue)
}

export default function GitKrakenCommitGraphDemo() {
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    fetch("/api/github/activity?org=MycosoftLabs")
      .then((res) => res.json())
      .then((payload) => {
        if (!active) return
        if (payload?.error) {
          setError(payload.error)
          setData(null)
          return
        }
        setData(payload)
      })
      .catch(() => {
        if (!active) return
        setError("Failed to load GitHub activity.")
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const sparkline = useMemo(() => buildSparkline(data?.events ?? []), [data])

  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh] bg-black">
      <div className="absolute top-3 left-3 z-10 max-w-[360px] rounded-md border border-border bg-background/80 p-3 text-xs backdrop-blur">
        <div className="font-medium">GitKraken Commit Graph — Live Activity</div>
        <p className="mt-1 text-muted-foreground">
          Showing live GitHub activity from the MycosoftLabs organization. This mirrors the
          GitKraken commit graph concept with real events (no mock data).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href="https://www.gitkraken.com/features/commit-graph"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded border border-border bg-background/70 px-2 text-[11px]"
          >
            GitKraken commit graph
          </a>
          <a
            href="https://github.com/MycosoftLabs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded border border-border bg-background/70 px-2 text-[11px]"
          >
            MycosoftLabs org
          </a>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-10 rounded-md border border-border bg-background/80 p-3 text-xs backdrop-blur">
        <div className="text-[11px] text-muted-foreground">Last 24h activity</div>
        <svg width="140" height="40" viewBox="0 0 140 40">
          {sparkline.map((value, index) => {
            const barHeight = Math.max(2, Math.round(value * 34))
            return (
              <rect
                key={index}
                x={index * 5 + 2}
                y={38 - barHeight}
                width={3}
                height={barHeight}
                fill="#22c55e"
                opacity={0.9}
              />
            )
          })}
        </svg>
      </div>

      <div className="h-full w-full overflow-auto pt-24">
        <div className="mx-auto max-w-4xl space-y-3 px-4 pb-6">
          {loading && (
            <div className="rounded-md border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              Loading GitHub activity...
            </div>
          )}
          {!loading && error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && (data?.events?.length ?? 0) === 0 && (
            <div className="rounded-md border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              No recent activity returned from GitHub.
            </div>
          )}
          {!loading &&
            !error &&
            data?.events?.map((event) => (
              <div
                key={event.id}
                className="rounded-md border border-border bg-background/70 p-4 text-sm"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={event.actor.avatar_url}
                    alt={event.actor.login}
                    className="h-8 w-8 rounded-full"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-medium">{event.type.replace("Event", "")}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.repo.name} · {event.actor.login}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatTimestamp(event.created_at)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
