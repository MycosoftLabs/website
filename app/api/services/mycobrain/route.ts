import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import { requireAdmin } from "@/lib/auth/api-auth"

const execFileAsync = promisify(execFile)

export const dynamic = "force-dynamic"

const MAS_DIR = "C:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\MAS\\mycosoft-mas"
const SERVICE_SCRIPT = "services\\mycobrain\\mycobrain_service_standalone.py"

// Allowed actions — strict allowlist prevents arbitrary command execution
const ALLOWED_ACTIONS = ["start", "stop", "kill", "restart"] as const
type ServiceAction = typeof ALLOWED_ACTIONS[number]

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { action } = body

    if (!action || !ALLOWED_ACTIONS.includes(action as ServiceAction)) {
      return NextResponse.json(
        { error: "Unknown action. Allowed: start, stop, kill, restart" },
        { status: 400 }
      )
    }

    switch (action as ServiceAction) {
      case "start": {
        execFile("powershell.exe", [
          "-NoProfile", "-Command",
          `Set-Location '${MAS_DIR}'; python ${SERVICE_SCRIPT} 2>&1 | Tee-Object -FilePath 'logs\\mycobrain-service.log'`
        ], { cwd: MAS_DIR })
        return NextResponse.json({ success: true, message: "Service starting..." })
      }

      case "stop": {
        try {
          await execFileAsync("powershell.exe", [
            "-Command",
            "Get-Process python | Where-Object { (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine -like '*mycobrain_service*' } | Stop-Process -Force"
          ])
          return NextResponse.json({ success: true, message: "Service stopped" })
        } catch (error) {
          return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
        }
      }

      case "kill": {
        try {
          await execFileAsync("powershell.exe", [
            "-Command",
            "Get-Process python | Where-Object { (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine -like '*mycobrain*' } | Stop-Process -Force"
          ])
          return NextResponse.json({ success: true, message: "Service killed" })
        } catch (error) {
          return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
        }
      }

      case "restart": {
        try {
          await execFileAsync("powershell.exe", [
            "-Command",
            "Get-Process python | Where-Object { (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine -like '*mycobrain*' } | Stop-Process -Force"
          ])
          await new Promise(resolve => setTimeout(resolve, 2000))
          execFile("powershell.exe", [
            "-NoProfile", "-Command",
            `Set-Location '${MAS_DIR}'; python ${SERVICE_SCRIPT} 2>&1 | Tee-Object -FilePath 'logs\\mycobrain-service.log'`
          ], { cwd: MAS_DIR })
          return NextResponse.json({ success: true, message: "Service restarting..." })
        } catch (error) {
          return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
        }
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to manage service", details: String(error) },
      { status: 500 }
    )
  }
}
