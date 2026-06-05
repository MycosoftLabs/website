import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/api-auth"
import { createAdminClient } from "@/lib/supabase/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error" | "alert"
  title: string
  message: string
  source: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const supabase = await createAdminClient()
    const { data: stored, error: storedError } = await supabase
      .from("notifications")
      .select("id,type,title,message,source,created_at,read,action_url,action_label,metadata")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (!storedError && Array.isArray(stored)) {
      return NextResponse.json({
        notifications: stored.map((item: any) => ({
          id: item.id,
          type: item.type || item.metadata?.severity || "info",
          title: item.title || "NatureOS notification",
          message: item.message || "",
          source: item.source || item.metadata?.source || "MYCA",
          timestamp: item.created_at,
          read: Boolean(item.read),
          actionUrl: item.action_url || undefined,
          actionLabel: item.action_label || undefined,
        })),
        source: "supabase",
      })
    }

    const response = await fetch(`${MAS_API_URL}/notifications?user_id=${encodeURIComponent(auth.user.id)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(1000),
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        notifications: Array.isArray(data) ? data : data.notifications || [],
        source: "mas",
      })
    }

    return NextResponse.json({
      notifications: [],
      source: "unavailable",
      warning: "Live MYCA/MAS notification feed is unavailable.",
    })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({
      notifications: [],
      source: "unavailable",
      warning: "Live MYCA/MAS notification feed is unavailable.",
    })
  }
}
