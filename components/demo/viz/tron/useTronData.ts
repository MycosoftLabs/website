import { useCallback, useEffect, useState } from "react"

export interface TronRepo {
  id: number
  name: string
  language: string | null
  pushed_at: string
  open_issues_count: number
}

export interface TronEvent {
  id: string
  type: string
  repo: { name: string }
  actor: { login: string }
  created_at: string
}

export interface TronActionRun {
  id: number
  repo: string
  name: string
  status: string
  conclusion: string | null
  created_at: string
}

export interface TronDeployment {
  id: number
  repo: string
  environment: string | null
  created_at: string
  description: string | null
}

export interface TronData {
  repos: TronRepo[]
  events: TronEvent[]
  actions: TronActionRun[]
  deployments: TronDeployment[]
  lastUpdated: string | null
  hasError: boolean
}

const DEFAULT_ORG = "MycosoftLabs"

function shortRepoName(value: string) {
  return value.includes("/") ? value.split("/").pop() ?? value : value
}

function hashRepoName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash << 5) - hash + name.charCodeAt(i)
  return Math.abs(hash) || 1
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}

export function useTronData(org = DEFAULT_ORG, intervalMs = 30000) {
  const [data, setData] = useState<TronData>({
    repos: [],
    events: [],
    actions: [],
    deployments: [],
    lastUpdated: null,
    hasError: false,
  })

  const fetchAll = useCallback(async () => {
    const endpoints = {
      repos: `/api/github/repos?org=${org}`,
      events: `/api/github/activity?org=${org}`,
      actions: `/api/github/actions?org=${org}`,
      deployments: `/api/github/deployments?org=${org}`,
    }

    const [reposResult, eventsResult, actionsResult, deploymentsResult] =
      await Promise.allSettled([
        fetchJson<{ repos: TronRepo[] }>(endpoints.repos),
        fetchJson<{ events: TronEvent[] }>(endpoints.events),
        fetchJson<{ runs: TronActionRun[] }>(endpoints.actions),
        fetchJson<{ deployments: TronDeployment[] }>(endpoints.deployments),
      ])

    setData((previous) => {
      const baseRepos = reposResult.status === "fulfilled" ? reposResult.value.repos : previous.repos
      const events =
        eventsResult.status === "fulfilled" ? eventsResult.value.events : previous.events
      const actions =
        actionsResult.status === "fulfilled" ? actionsResult.value.runs : previous.actions
      const deployments =
        deploymentsResult.status === "fulfilled"
          ? deploymentsResult.value.deployments
          : previous.deployments
      const hasError =
        reposResult.status === "rejected" &&
        eventsResult.status === "rejected" &&
        actionsResult.status === "rejected" &&
        deploymentsResult.status === "rejected"

      // Ensure repos with fresh events still appear even if not in /repos top list.
      const latestEventByRepo = new Map<string, number>()
      events.forEach((event) => {
        const createdAt = Date.parse(event.created_at)
        if (Number.isNaN(createdAt)) return
        const repoName = shortRepoName(event.repo?.name ?? "")
        if (!repoName) return
        const current = latestEventByRepo.get(repoName)
        if (!current || createdAt > current) latestEventByRepo.set(repoName, createdAt)
      })

      const reposByName = new Map<string, TronRepo>()
      baseRepos.forEach((repo) => {
        reposByName.set(repo.name, repo)
      })
      latestEventByRepo.forEach((timestamp, repoName) => {
        if (reposByName.has(repoName)) return
        reposByName.set(repoName, {
          id: hashRepoName(repoName),
          name: repoName,
          language: null,
          pushed_at: new Date(timestamp).toISOString(),
          open_issues_count: 0,
        })
      })

      const repos = Array.from(reposByName.values()).sort((a, b) => {
        const aTime = latestEventByRepo.get(a.name) ?? Date.parse(a.pushed_at)
        const bTime = latestEventByRepo.get(b.name) ?? Date.parse(b.pushed_at)
        const safeA = Number.isNaN(aTime) ? 0 : aTime
        const safeB = Number.isNaN(bTime) ? 0 : bTime
        return safeB - safeA
      })

      return {
        repos,
        events,
        actions,
        deployments,
        lastUpdated: new Date().toISOString(),
        hasError,
      }
    })
  }, [org])

  useEffect(() => {
    fetchAll()
    const intervalId = window.setInterval(fetchAll, intervalMs)
    return () => window.clearInterval(intervalId)
  }, [fetchAll, intervalMs])

  return data
}
