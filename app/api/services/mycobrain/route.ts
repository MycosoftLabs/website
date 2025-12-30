import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = "force-dynamic"

const MAS_DIR = "C:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\MAS\\mycosoft-mas"
const SERVICE_SCRIPT = "services\\mycobrain\\mycobrain_service_standalone.py"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "start":
        // Start the service in a hidden window
        const startCommand = `powershell.exe -NoProfile -Command "Set-Location '${MAS_DIR}'; python ${SERVICE_SCRIPT} 2>&1 | Tee-Object -FilePath 'logs\\mycobrain-service.log'" -WindowStyle Hidden`
        exec(startCommand, { cwd: MAS_DIR })
        return NextResponse.json({ success: true, message: "Service starting..." })

      case "stop":
        // Gracefully stop the service
        try {
          await execAsync(`powershell.exe -Command "Get-Process python | Where-Object { (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine -like '*mycobrain_service*' } | Stop-Process -Force"`)
          return NextResponse.json({ success: true, message: "Service stopped" })
        } catch (error) {
          return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
        }

      case "kill":
        // Force kill the service
        try {
          await execAsync(`powershell.exe -Command "Get-Process python | Where-Object { (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine -like '*mycobrain*' } | Stop-Process -Force"`)
          return NextResponse.json({ success: true, message: "Service killed" })
        } catch (error) {
          return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
        }

      case "restart":
        // Kill then start
        try {
          await execAsync(`powershell.exe -Command "Get-Process python | Where-Object { (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine -like '*mycobrain*' } | Stop-Process -Force"`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          const restartCommand = `powershell.exe -NoProfile -Command "Set-Location '${MAS_DIR}'; python ${SERVICE_SCRIPT} 2>&1 | Tee-Object -FilePath 'logs\\mycobrain-service.log'" -WindowStyle Hidden`
          exec(restartCommand, { cwd: MAS_DIR })
          return NextResponse.json({ success: true, message: "Service restarting..." })
        } catch (error) {
          return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to manage service", details: String(error) },
      { status: 500 }
    )
  }
}


