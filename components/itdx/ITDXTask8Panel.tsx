"use client"

import { useEffect, useState } from "react"
import styles from "./itdx-task8-panel.module.css"

interface RoleRow {
  id: string
  label: string
  verdict: string
  bound: boolean
  note: string
}

interface GovernorRow {
  id: string
  title?: string
  local_gate?: string | null
  mas_approved?: boolean | null
  mas_reason?: string | null
  mas_status?: number
  execution?: string
}

interface Task8Payload {
  source?: string
  path?: string
  roles?: RoleRow[]
  options?: Array<{ id?: string; title?: string; formspace_gate?: string; gate?: string }>
  governor?: GovernorRow[]
  seven_role?: { qualification?: string; role_count?: number; missing_artifact?: string }
  myca?: { status?: string; state?: string; is_conscious?: boolean }
  note?: string
}

export function ITDXTask8Panel() {
  const [data, setData] = useState<Task8Payload | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch("/api/fusarium/itdx/task8", { cache: "no-store" })
        const payload = (await response.json()) as Task8Payload & { error?: string }
        if (cancelled) return
        if (!response.ok) {
          setError(payload.error || `Task 8 ${response.status}`)
          return
        }
        setError("")
        setData(payload)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Task 8 unavailable")
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const source = data?.source || "none"
  const roles = data?.roles || []
  const seven = data?.seven_role

  return (
    <section className={styles.wrap} data-testid="itdx-task8-panel" data-source={source}>
      <p className={styles.kicker}>TASK 8 · source={source}</p>
      <p className={styles.meta}>
        MYCA {data?.myca?.state || "unbound"} · path {data?.path || "—"} · seven-role {seven?.qualification || "UNQUALIFIED"}
      </p>
      {error ? <p className={styles.warn}>{error}</p> : null}
      {roles.length > 0 ? (
        <ul className={styles.list}>
          {roles.map((role) => (
            <li key={role.id} className={styles.row} data-bound={role.bound ? "true" : "false"}>
              <span>{role.label}</span>
              <span className={role.bound ? styles.on : styles.off}>
                {role.bound ? role.verdict : "UNQUALIFIED"}
              </span>
              {role.note ? <span className={styles.meta}>{role.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.meta} data-testid="itdx-task8-no-fake-roles">
          No per-role MAS payload. Seven green badges are not drawn.
        </p>
      )}
      {data?.governor?.length ? (
        <ul className={styles.list}>
          {data.governor.map((row) => (
            <li key={row.id} className={styles.row}>
              <span>{row.title || row.id}</span>
              <span>
                local_avani {row.local_gate || "—"} · mas_governor{" "}
                {row.mas_status === 200 ? (row.mas_approved ? "APPROVED" : "DENIED") : "UNREACHABLE"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {seven?.missing_artifact ? <p className={styles.warn}>{seven.missing_artifact}</p> : null}
      {data?.note ? <p className={styles.meta}>{data.note}</p> : null}
    </section>
  )
}
