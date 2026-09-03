"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { OverviewContext, OverviewSnapshot } from "@/lib/fusarium/overview/contracts"
import { buildOverviewLink, parseOverviewContext } from "@/lib/fusarium/overview/deep-links"
import { createOverviewProvider } from "@/lib/fusarium/overview/provider"
import { createLoadingSnapshot } from "@/lib/fusarium/overview/scenario"
import { MissionContextBar } from "./mission-context-bar"
import { OperationalLayout, type OverviewWidgetDefinition } from "./operational-layout"
import {
  ActivityTimeline,
  ConditionsCausalityAndOutlook,
  CoverageAndProducts,
  EnvironmentalPicture,
  MissionBriefAndContinuity,
  NativeAppSwitchboard,
  ObservationsReviewsAndEvidence,
  OperationalPosture,
  PlatformHealth,
} from "./overview-widgets"
import styles from "./overview.module.css"

const POLL_INTERVAL_MS = 30_000
const INITIAL_RENDER_TIME = "1970-01-01T00:00:00.000Z"

export function OverviewDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()
  const context = useMemo(() => parseOverviewContext(new URLSearchParams(searchKey)), [searchKey])
  const provider = useMemo(() => createOverviewProvider(), [])
  const [snapshot, setSnapshot] = useState<OverviewSnapshot>(() => createLoadingSnapshot(context, INITIAL_RENDER_TIME))
  const [nowMs, setNowMs] = useState(() => Date.parse(INITIAL_RENDER_TIME))
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [unexpectedError, setUnexpectedError] = useState<string | null>(null)
  const [isNavigating, startTransition] = useTransition()

  useEffect(() => {
    setNowMs(Date.now())
    const interval = window.setInterval(() => setNowMs(Date.now()), 10_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    let timer: number | undefined
    let controller: AbortController | undefined

    setSnapshot(createLoadingSnapshot(context))
    setUnexpectedError(null)

    const load = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const next = await provider.load(context, controller.signal)
        if (active) {
          setSnapshot(next)
          setUnexpectedError(null)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        if (active) setUnexpectedError(error instanceof Error ? error.message : String(error))
      } finally {
        if (active) timer = window.setTimeout(load, POLL_INTERVAL_MS)
      }
    }

    void load()
    return () => {
      active = false
      controller?.abort()
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [context, provider, refreshVersion])

  const updateContext = (next: OverviewContext) => {
    startTransition(() => {
      router.replace(buildOverviewLink("overview", next), { scroll: false })
    })
  }

  const operationalWidgets: OverviewWidgetDefinition[] = [
    {
      id: "operational-posture",
      label: "Operational posture",
      content: <OperationalPosture snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "mission-brief",
      label: "Mission brief and continuity",
      content: <MissionBriefAndContinuity snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "environmental-picture",
      label: "Environmental operating picture",
      content: <EnvironmentalPicture snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "conditions-causality",
      label: "Conditions, causality, and outlook",
      content: <ConditionsCausalityAndOutlook snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "observations-evidence",
      label: "Observations, review, and evidence",
      content: <ObservationsReviewsAndEvidence snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "coverage-products",
      label: "Coverage and products",
      content: <CoverageAndProducts snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "platform-health",
      label: "Platform and connector readiness",
      content: <PlatformHealth snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
    {
      id: "activity-timeline",
      label: "Recent change and decisions",
      content: <ActivityTimeline snapshot={snapshot} context={context} nowMs={nowMs} />,
    },
  ]

  return (
    <div className={styles.page}>
      <MissionContextBar
        context={context}
        snapshot={snapshot}
        nowMs={nowMs}
        onChange={updateContext}
        onRefresh={() => setRefreshVersion((version) => version + 1)}
      />

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>FUSARIUM · ENVIN MISSION FABRIC</p>
          <h1>Overview</h1>
          <p>
            Environmental state, change, uncertainty, evidence, observations, reviews, and mission consequence for the selected mission area.
          </p>
        </div>
        <div className={styles.modeCallout} role="note">
          <strong>{context.dataMode === "demo" ? "SIMULATED SCENARIO ENABLED" : "SYNTHETIC DATA OFF"}</strong>
          <span>
            {context.dataMode === "demo"
              ? "Every scenario object is marked SIMULATED. Local health remains separately marked LIVE LOCAL."
              : "Only verified local system status is polled. Mission values remain unknown or unavailable."}
          </span>
        </div>
      </header>

      {unexpectedError ? (
        <div className={styles.globalNotice} role="alert">
          <strong>Overview provider failed unexpectedly.</strong>
          <span>{unexpectedError}</span>
          <button type="button" onClick={() => setRefreshVersion((version) => version + 1)}>
            Retry local providers
          </button>
        </div>
      ) : null}

      {isNavigating ? <p className={styles.navigationStatus} role="status">Updating mission context…</p> : null}

      <NativeAppSwitchboard context={context} />
      <OperationalLayout widgets={operationalWidgets} />
    </div>
  )
}
