"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

/**
 * Legacy thin device page — redirects to unified MycoBrain console.
 */
export default function DeviceDetailRedirectPage() {
  const params = useParams<{ deviceId: string }>()
  const router = useRouter()
  const deviceId = decodeURIComponent(params.deviceId || "")

  useEffect(() => {
    if (!deviceId) return
    router.replace(`/natureos/mycobrain?device=${encodeURIComponent(deviceId)}`)
  }, [deviceId, router])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
      <RefreshCw className="h-6 w-6 animate-spin" />
      <p>Opening MycoBrain console…</p>
    </div>
  )
}
