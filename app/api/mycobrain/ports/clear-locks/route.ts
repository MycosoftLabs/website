import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export async function POST() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    // Try to disconnect all devices to clear locks
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      const data = await response.json()
      const devices = data.devices || []
      
      // Disconnect all devices
      const disconnectPromises = devices.map(async (device: any) => {
        try {
          await fetch(`${MYCOBRAIN_SERVICE_URL}/devices/${device.device_id}/disconnect`, {
            method: "POST",
            signal: AbortSignal.timeout(3000),
          }).catch(() => null)
        } catch {
          // Ignore errors
        }
      })
      
      await Promise.all(disconnectPromises)
      
      return NextResponse.json({
        success: true,
        message: "Port locks cleared",
        disconnected: devices.length,
      })
    }
    
    return NextResponse.json({
      success: true,
      message: "No devices to disconnect",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to clear locks", details: String(error) },
      { status: 500 }
    )
  }
}


























