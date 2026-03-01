"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { NeuCard, NeuCardContent, NeuBadge } from "@/components/ui/neuromorphic"
import TronCodeStream from "@/components/demo/viz/TronCodeStream"
import { Activity, Github, FileText, Layers, Cpu, Wrench } from "lucide-react"

interface GithubEvent {
  id: string
  type?: string
  repo?: string | { name?: string }
  actor?: string | { login?: string }
  url?: string
  created_at?: string
}

interface DocumentResult {
  name?: string
  path?: string
  url_github?: string
  metadata?: {
    modified?: string
  }
}

interface TechnologySummary {
  public_files?: number
  tooling_count?: number
}

interface RepoItem {
  id: number
  name: string
}

interface ActionRunItem {
  id: number
  repo: string
  status: string
  conclusion: string | null
  created_at: string
}

interface DeploymentItem {
  id: number
  repo: string
  created_at: string
  environment: string | null
}

interface RepoProgressRow {
  repo: string
  past24h: number
  live: string
  next: string
}

function getRepoName(value: GithubEvent["repo"]) {
  if (typeof value === "string") return value.includes("/") ? value.split("/").pop() ?? value : value
  const name = value?.name ?? "MycosoftLabs"
  return name.includes("/") ? name.split("/").pop() ?? name : name
}

function ageText(value: string | undefined) {
  if (!value) return "unknown"
  const time = Date.parse(value)
  if (Number.isNaN(time)) return "unknown"
  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function feedFreshness(value: string | null) {
  if (!value) return "unknown"
  const time = Date.parse(value)
  if (Number.isNaN(time)) return "unknown"
  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (diffSeconds < 15) return "live"
  if (diffSeconds < 60) return `${diffSeconds}s lag`
  const diffMinutes = Math.floor(diffSeconds / 60)
  return `${diffMinutes}m lag`
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

export function TechnologyLiveFeed() {
  const [events, setEvents] = useState<GithubEvent[]>([])
  const [docs, setDocs] = useState<DocumentResult[]>([])
  const [tokens, setTokens] = useState<number | null>(null)
  const [summary, setSummary] = useState<TechnologySummary | null>(null)
  const [repos, setRepos] = useState<RepoItem[]>([])
  const [actions, setActions] = useState<ActionRunItem[]>([])
  const [deployments, setDeployments] = useState<DeploymentItem[]>([])
  const [repoCount, setRepoCount] = useState<number>(0)
  const [actionCount, setActionCount] = useState<number>(0)
  const [deploymentCount, setDeploymentCount] = useState<number>(0)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const normalizeGithubEvents = (rawEvents: GithubEvent[]) =>
    (rawEvents ?? []).map((event) => {
      const repoName = typeof event.repo === "string" ? event.repo : event.repo?.name
      const actorName = typeof event.actor === "string" ? event.actor : event.actor?.login
      const fallbackUrl =
        typeof repoName === "string" && repoName.includes("/")
          ? `https://github.com/${repoName}`
          : undefined
      return {
        id: String(event.id),
        type: event.type ?? "Update",
        repo: repoName ?? "MycosoftLabs",
        actor: actorName ?? "system",
        url: event.url ?? fallbackUrl,
        created_at: event.created_at,
      }
    })

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const [ghInternalRes, tokenRes, docsRes, summaryRes, reposRes, actionsRes, deploymentsRes] = await Promise.all([
          fetch("/api/github/activity?org=MycosoftLabs", { cache: "no-store" }),
          fetch("/api/public/cursor/tokens", { cache: "no-store" }),
          fetch("/api/mas/documents/search?q=technology%20report&limit=4&min_score=0.4", { cache: "no-store" }),
          fetch("/api/public/technology/summary", { cache: "no-store" }),
          fetch("/api/github/repos?org=MycosoftLabs", { cache: "no-store" }),
          fetch("/api/github/actions?org=MycosoftLabs", { cache: "no-store" }),
          fetch("/api/github/deployments?org=MycosoftLabs", { cache: "no-store" }),
        ])

        if (active) {
          if (ghInternalRes.ok) {
            const json = await ghInternalRes.json()
            setEvents(normalizeGithubEvents(json?.events ?? []))
          } else {
            const ghFallbackRes = await fetch("/api/public/github/activity?limit=20", {
              cache: "no-store",
            })
            if (ghFallbackRes.ok) {
              const fallbackJson = await ghFallbackRes.json()
              setEvents(normalizeGithubEvents(fallbackJson?.events ?? []))
            } else {
              setEvents([])
            }
          }

          if (tokenRes.ok) {
            const json = await tokenRes.json()
            const total = typeof json?.total_tokens === "number" ? json.total_tokens : null
            setTokens(total)
          } else {
            setTokens(null)
          }

          if (docsRes.ok) {
            const json = await docsRes.json()
            setDocs(json?.results ?? [])
          } else {
            setDocs([])
          }

          if (summaryRes.ok) {
            const json = await summaryRes.json()
            setSummary(json ?? null)
          } else {
            setSummary(null)
          }

          if (reposRes.ok) {
            const json = await reposRes.json()
            setRepoCount(Array.isArray(json?.repos) ? json.repos.length : 0)
            setRepos(Array.isArray(json?.repos) ? json.repos : [])
          } else {
            setRepoCount(0)
            setRepos([])
          }

          if (actionsRes.ok) {
            const json = await actionsRes.json()
            setActionCount(Array.isArray(json?.runs) ? json.runs.length : 0)
            setActions(Array.isArray(json?.runs) ? json.runs : [])
          } else {
            setActionCount(0)
            setActions([])
          }

          if (deploymentsRes.ok) {
            const json = await deploymentsRes.json()
            setDeploymentCount(Array.isArray(json?.deployments) ? json.deployments.length : 0)
            setDeployments(Array.isArray(json?.deployments) ? json.deployments : [])
          } else {
            setDeploymentCount(0)
            setDeployments([])
          }
          setLastSyncAt(new Date().toISOString())
        }
      } catch {
        if (active) {
          setEvents([])
          setTokens(null)
          setDocs([])
          setSummary(null)
          setRepos([])
          setActions([])
          setDeployments([])
          setRepoCount(0)
          setActionCount(0)
          setDeploymentCount(0)
          setLastSyncAt(new Date().toISOString())
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 10000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const tokenDisplay =
    typeof tokens === "number" ? tokens.toLocaleString() : "No data available"
  const publicFilesDisplay =
    typeof summary?.public_files === "number"
      ? summary.public_files.toLocaleString()
      : "No data available"
  const toolingDisplay =
    typeof summary?.tooling_count === "number"
      ? summary.tooling_count.toLocaleString()
      : "No data available"
  const eventRepoNames = unique(events.map((event) => getRepoName(event.repo)).filter(Boolean))
  const repoUniverse = unique([...repos.map((repo) => repo.name), ...eventRepoNames])
  const rankedRepos = repoUniverse.sort((a, b) => {
    const aLatest = events
      .filter((event) => getRepoName(event.repo) === a)
      .map((event) => Date.parse(event.created_at ?? ""))
      .filter((value) => !Number.isNaN(value))
      .sort((x, y) => y - x)[0] ?? 0
    const bLatest = events
      .filter((event) => getRepoName(event.repo) === b)
      .map((event) => Date.parse(event.created_at ?? ""))
      .filter((value) => !Number.isNaN(value))
      .sort((x, y) => y - x)[0] ?? 0
    return bLatest - aLatest
  })

  const progressRows: RepoProgressRow[] = rankedRepos.slice(0, 8).map((repoName) => {
    const repoEvents = events.filter((event) => getRepoName(event.repo) === repoName)
    const past24h = repoEvents.filter((event) => {
      const time = Date.parse(event.created_at ?? "")
      return !Number.isNaN(time) && Date.now() - time <= 24 * 60 * 60 * 1000
    }).length
    const repoRuns = actions
      .filter((run) => run.repo === repoName)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    const repoDeployments = deployments
      .filter((deployment) => deployment.repo === repoName)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    const inProgress = repoRuns.find((run) => run.status === "in_progress" || run.status === "queued")
    const latestRun = repoRuns[0]
    const latestDeploy = repoDeployments[0]
    const live = inProgress
      ? `Pipeline running (${ageText(inProgress.created_at)})`
      : latestRun
        ? `Last run: ${latestRun.conclusion ?? latestRun.status} (${ageText(latestRun.created_at)})`
        : "No workflow runs detected"
    const next = inProgress
      ? "Awaiting workflow completion"
      : latestRun?.conclusion === "success"
        ? `Next: deploy ${latestDeploy ? `(${ageText(latestDeploy.created_at)})` : "(pending)"}`
        : latestRun
          ? "Next: fix failing pipeline then deploy"
          : "Next: trigger first pipeline run"
    return { repo: repoName || "unknown-repo", past24h, live, next }
  })
  const latestEvent = events[0]

  return (
    <section className="py-10 md:py-14">
      <div className="text-center mb-8">
        <NeuBadge variant="default" className="mb-3 border border-white/20">
          Live Technology Feed
        </NeuBadge>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Codebase & Automation Activity
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mt-2">
          Real-time visibility into engineering output, tokens, and technical documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          href="https://github.com/MycosoftLabs"
          target="_blank"
          className="block min-h-[44px] touch-manipulation"
        >
          <NeuCard className="border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
            <NeuCardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4 text-green-400" />
                Public files
              </div>
              <div className="text-2xl font-bold">{publicFilesDisplay}</div>
              <div className="text-xs text-muted-foreground">
                Public assets available for investors, staff, and users.
              </div>
            </NeuCardContent>
          </NeuCard>
        </Link>

        <Link
          href="/api/public/cursor/tokens"
          target="_blank"
          className="block min-h-[44px] touch-manipulation"
        >
          <NeuCard className="border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
            <NeuCardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-purple-400" />
                Token usage
              </div>
              <div className="text-2xl font-bold">{tokenDisplay}</div>
              <div className="text-xs text-muted-foreground">
                Live Cursor export validated through internal stats.
              </div>
            </NeuCardContent>
          </NeuCard>
        </Link>

        <Link href="#cursor-stack" className="block min-h-[44px] touch-manipulation">
          <NeuCard className="border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
            <NeuCardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-blue-400" />
                Tooling coverage
              </div>
              <div className="text-2xl font-bold">{toolingDisplay}</div>
              <div className="text-xs text-muted-foreground">
                Cursor-led stack with verified automation modules.
              </div>
            </NeuCardContent>
          </NeuCard>
        </Link>
      </div>

      <NeuCard className="overflow-hidden mb-8">
        <NeuCardContent className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-bold">GitHub Activity Visualization</h3>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" />
              {loading ? "Loading" : "Live"}
            </span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="relative h-56 sm:h-64 md:h-80 rounded-xl overflow-hidden bg-black">
              <TronCodeStream />
            </div>
            <div className="mt-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">Live status:</span>{" "}
              {latestEvent ? (
                <span className="text-muted-foreground">
                  Latest event <span className="text-foreground">{latestEvent.type ?? "Update"}</span> on{" "}
                  <span className="text-foreground">{getRepoName(latestEvent.repo)}</span> by{" "}
                  <span className="text-foreground">
                    {typeof latestEvent.actor === "string"
                      ? latestEvent.actor
                      : latestEvent.actor?.login ?? "system"}
                  </span>{" "}
                  ({ageText(latestEvent.created_at)}).
                </span>
              ) : (
                <span className="text-muted-foreground">No recent events in feed.</span>
              )}{" "}
              <span className="text-muted-foreground">Feed freshness: {feedFreshness(lastSyncAt)}.</span>
            </div>
            <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">How to read this:</span>{" "}
              left-to-right particles represent recent event flow across the past 6h, the green marker is now, and
              the dotted segment + yellow node indicates near-term forecast based on recent cadence. Pipeline nodes
              reflect GitHub Actions/deployments, and the board below summarizes each repo as Past 24h activity,
              Live status, and Next expected step.
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Repos</div>
                <div className="text-sm font-semibold">{repoCount}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Events</div>
                <div className="text-sm font-semibold">{events.length}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Actions</div>
                <div className="text-sm font-semibold">{actionCount}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">Deployments</div>
                <div className="text-sm font-semibold">{deploymentCount}</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/60 bg-background/60 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-b border-border/60 bg-muted/20 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
                <div>Repository</div>
                <div>Past 24h</div>
                <div>Live now</div>
                <div>Next</div>
              </div>
              <div className="divide-y divide-border/40">
                {progressRows.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">No repo progress data available.</div>
                ) : (
                  progressRows.map((row) => (
                    <div
                      key={row.repo}
                      className="grid grid-cols-1 md:grid-cols-4 gap-2 px-3 py-3 text-xs md:text-sm"
                    >
                      <div className="font-medium text-foreground">{row.repo}</div>
                      <div className="text-muted-foreground">{row.past24h} events</div>
                      <div className="text-muted-foreground">{row.live}</div>
                      <div className="text-muted-foreground">{row.next}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "No data available"} · refresh
              every 10s · public GitHub feeds can appear with 15-60s delay
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {events.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  No data available.
                </div>
              ) : (
                events.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="text-sm font-medium truncate">
                      {typeof event.repo === "string"
                        ? event.repo
                        : event.repo?.name ?? "MycosoftLabs"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.type ?? "Update"} ·{" "}
                      {typeof event.actor === "string"
                        ? event.actor
                        : event.actor?.login ?? "system"}
                    </div>
                    {event.url ? (
                      <Link
                        href={event.url}
                        target="_blank"
                        className="inline-flex items-center text-xs text-green-400 hover:text-green-300 underline underline-offset-4 mt-2 min-h-[44px] px-2 touch-manipulation"
                      >
                        View repo
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </NeuCardContent>
      </NeuCard>

      <NeuCard className="overflow-hidden">
        <NeuCardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-bold">Latest Docs & Whitepapers</h3>
            </div>
            <span className="text-xs text-muted-foreground">{loading ? "Loading" : "Live"}</span>
          </div>
          {docs.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              No data available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {docs.map((doc, idx) => (
                <div key={`${doc.path ?? idx}`} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="text-sm font-medium truncate">{doc.name ?? doc.path ?? "Document"}</div>
                  {doc.url_github ? (
                    <Link
                      href={doc.url_github}
                      target="_blank"
                      className="inline-flex items-center text-xs text-amber-300 hover:text-amber-200 underline underline-offset-4 mt-2 min-h-[44px] px-2 touch-manipulation"
                    >
                      View source
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </NeuCardContent>
      </NeuCard>
    </section>
  )
}
