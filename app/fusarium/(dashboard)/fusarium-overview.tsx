import { Suspense } from "react"
import { OverviewDashboard } from "@/components/fusarium/overview/overview-dashboard"
import styles from "@/components/fusarium/overview/overview.module.css"

function OverviewRouteFallback() {
  return (
    <div className="fx-page">
      <div className={styles.demoBanner} role="status">
        SANITIZED DEMONSTRATION — NOT A LIVE OPERATIONAL PICTURE
      </div>
      <p className="fx-notice" role="status">
        Loading the Overview mission context. No operational values are inferred while the route initializes.
      </p>
    </div>
  )
}

export function FusariumOverview() {
  return (
    <Suspense fallback={<OverviewRouteFallback />}>
      <OverviewDashboard />
    </Suspense>
  )
}
