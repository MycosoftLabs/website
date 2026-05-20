/**
 * Start MYCA voice stack (Moshi + Bridge + CUDA warmup) via MAS START_VOICE_SYSTEM.py.
 */
import { NextResponse } from "next/server"
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import * as net from "net"
import { normalizeProbeHost, resolveLocalLoopbackHost } from "@/lib/config/resolve-voice-bridge"

const DEFAULT_MAS_ROOT =
  process.env.MYCOSOFT_MAS_PATH ||
  process.env.MAS_REPO_PATH ||
  "C:\\Users\\Owner1\\mycosoft-mas"

function tcpOpen(host: string, port: number, timeoutMs = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("error", () => done(false))
    socket.once("timeout", () => done(false))
    socket.connect(port, normalizeProbeHost(host))
  })
}

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_VOICE_STACK_START !== "true") {
    return NextResponse.json(
      { ok: false, error: "Voice stack auto-start disabled in production. Run START_VOICE_SYSTEM.py on the Voice Legion." },
      { status: 403 }
    )
  }

  const loopback = resolveLocalLoopbackHost()
  const [moshiUp, bridgeUp] = await Promise.all([
    tcpOpen(loopback, 8998),
    tcpOpen(loopback, 8999),
  ])
  if (moshiUp && bridgeUp) {
    return NextResponse.json({
      ok: true,
      alreadyRunning: true,
      message: "Moshi (8998) and Bridge (8999) already running on 127.0.0.1",
    })
  }

  const masRoot = path.resolve(DEFAULT_MAS_ROOT)
  const scriptPath = path.join(masRoot, "START_VOICE_SYSTEM.py")
  const altScript = path.join(masRoot, "scripts", "start_voice_system.py")
  const chosen = fs.existsSync(scriptPath)
    ? scriptPath
    : fs.existsSync(altScript)
      ? altScript
      : null

  if (!chosen) {
    return NextResponse.json(
      {
        ok: false,
        error: `Voice startup script not found under ${masRoot}`,
        hint: "Set MYCOSOFT_MAS_PATH to your mycosoft-mas clone",
      },
      { status: 404 }
    )
  }

  const logDir = path.join(masRoot, "logs")
  try {
    fs.mkdirSync(logDir, { recursive: true })
  } catch {
    // ignore
  }
  const logFile = path.join(logDir, `voice-stack-start-${Date.now()}.log`)

  const env = {
    ...process.env,
    NO_CUDA_GRAPH: process.env.NO_CUDA_GRAPH ?? "0",
    NO_TORCH_COMPILE: process.env.NO_TORCH_COMPILE ?? "0",
    MOSHI_HOST: process.env.MOSHI_HOST ?? loopback,
    MOSHI_PORT: process.env.MOSHI_PORT ?? "8998",
  }

  try {
    const out = fs.openSync(logFile, "a")
    const err = fs.openSync(logFile, "a")
    const child = spawn("python", [chosen], {
      cwd: masRoot,
      env,
      detached: true,
      stdio: ["ignore", out, err],
      windowsHide: true,
    })
    child.unref()

    return NextResponse.json({
      ok: true,
      pid: child.pid,
      script: chosen,
      logFile,
      message:
        "Voice stack starting. Wait for VOICE SYSTEM READY in log (CUDA graphs 60–180s on first run).",
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
