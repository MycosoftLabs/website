"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  Brain,
  Circle,
  Inbox,
  ListChecks,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"

type AnyRecord = Record<string, unknown>

interface CoordinationSnapshot {
  ok: true
  generated_at: string
  storage_root: string
  counts: Record<string, number>
  messages: AnyRecord[]
  statuses: AnyRecord[]
  latest_status_by_agent: Record<string, AnyRecord>
  memories: AnyRecord[]
  tasks: AnyRecord[]
  latest_task_by_id: Record<string, AnyRecord>
}

const stateClass: Record<string, string> = {
  idle: "text-sky-300",
  working: "text-emerald-300",
  blocked: "text-red-300",
  waiting: "text-amber-300",
  done: "text-zinc-300",
  error: "text-red-300",
}

function text(value: unknown, fallback = "") {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : []
}

function time(value: unknown) {
  const raw = text(value)
  if (!raw) return ""
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function AgentCoordinationPage() {
  const [snapshot, setSnapshot] = useState<CoordinationSnapshot | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState("")

  async function loadSnapshot() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/agent/coordination?limit=120", {
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data.error || `Request failed: ${response.status}`)
        setSnapshot(null)
        return
      }
      setSnapshot(data)
    } catch {
      setError("coordination_snapshot_unreachable")
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSnapshot()
    const id = window.setInterval(loadSnapshot, 5000)
    return () => window.clearInterval(id)
  }, [])

  const statuses = useMemo(
    () =>
      Object.values(snapshot?.latest_status_by_agent || {}).sort((a, b) =>
        text(a.agent).localeCompare(text(b.agent)),
      ),
    [snapshot],
  )

  const messages = useMemo(() => {
    const q = query.toLowerCase().trim()
    return (snapshot?.messages || []).filter((message) => {
      const matchesQuery =
        !q ||
        JSON.stringify(message)
          .toLowerCase()
          .includes(q)
      const matchesTag = !tag || list(message.tags).includes(tag)
      return matchesQuery && matchesTag
    })
  }, [snapshot, query, tag])

  const tags = useMemo(() => {
    const seen = new Set<string>()
    for (const message of snapshot?.messages || []) {
      for (const item of list(message.tags)) seen.add(item)
    }
    return Array.from(seen).sort()
  }, [snapshot])

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Mycosoft mesh
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              Agent coordination
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <span>{snapshot ? time(snapshot.generated_at) : "Loading"}</span>
            <button
              type="button"
              onClick={loadSnapshot}
              className="inline-flex h-10 items-center gap-2 border border-zinc-700 px-3 text-sm text-zinc-100 hover:border-emerald-400 hover:text-emerald-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(snapshot?.counts || {}).map(([name, count]) => (
            <div key={name} className="border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{name}</div>
              <div className="mt-2 text-2xl font-semibold text-white">{count}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
          <div className="space-y-5">
            <section className="border border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3 text-sm font-medium">
                <Activity className="h-4 w-4 text-emerald-300" />
                Status
              </div>
              <div className="divide-y divide-zinc-800">
                {statuses.map((status) => {
                  const state = text(status.state, "idle")
                  return (
                    <article key={text(status.agent)} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-sm text-zinc-100">{text(status.agent)}</div>
                        <div className={`flex items-center gap-1 text-xs ${stateClass[state] || "text-zinc-300"}`}>
                          <Circle className="h-2.5 w-2.5 fill-current" />
                          {state}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-zinc-300">{text(status.summary)}</p>
                      <div className="mt-2 text-xs text-zinc-500">{time(status.created_at)}</div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="border border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3 text-sm font-medium">
                <Brain className="h-4 w-4 text-cyan-300" />
                Memory
              </div>
              <div className="max-h-[420px] divide-y divide-zinc-800 overflow-y-auto">
                {(snapshot?.memories || []).slice(0, 30).map((memory) => (
                  <article key={text(memory.id)} className="px-4 py-3">
                    <div className="font-mono text-xs text-cyan-200">{text(memory.key)}</div>
                    <p className="mt-2 line-clamp-4 text-sm leading-5 text-zinc-300">
                      {text(memory.value)}
                    </p>
                    <div className="mt-2 text-xs text-zinc-500">
                      {text(memory.scope, "mycosoft")} · {time(memory.created_at)}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="border border-zinc-800 bg-zinc-900">
              <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Inbox className="h-4 w-4 text-sky-300" />
                  Inbox
                </div>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-sky-300 sm:w-56"
                    placeholder="Search"
                  />
                  <select
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    className="h-9 border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 outline-none focus:border-sky-300"
                  >
                    <option value="">All tags</option>
                    {tags.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="max-h-[520px] divide-y divide-zinc-800 overflow-y-auto">
                {messages.map((message) => (
                  <article key={text(message.id)} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-zinc-100">{text(message.subject, "Message")}</div>
                      <div className="text-xs text-zinc-500">{time(message.created_at)}</div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {text(message.from_agent)} → {list(message.to).join(", ")}
                    </div>
                    <p className="mt-2 line-clamp-5 text-sm leading-5 text-zinc-300">{text(message.body)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {list(message.tags).map((item) => (
                        <span key={item} className="border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="border border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3 text-sm font-medium">
                <ListChecks className="h-4 w-4 text-amber-300" />
                Tasks
              </div>
              <div className="max-h-[360px] divide-y divide-zinc-800 overflow-y-auto">
                {Object.values(snapshot?.latest_task_by_id || {}).map((task) => (
                  <article key={text(task.id)} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-zinc-100">{text(task.title, text(task.id))}</div>
                      <span className="border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                        {text(task.status, "claimed")}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-zinc-300">
                      {text(task.description) || text(task.notes)}
                    </p>
                    <div className="mt-2 text-xs text-zinc-500">
                      {text(task.agent)} · {text(task.priority)} · {time(task.created_at)}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
