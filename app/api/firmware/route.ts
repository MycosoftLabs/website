import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { requireAdmin } from "@/lib/auth/api-auth";

const execFileAsync = promisify(execFile);

// Get absolute path to firmware manager
import { join } from "path";
import { cwd } from "process";

const FIRMWARE_MANAGER_PATH = process.env.FIRMWARE_MANAGER_PATH ||
  join(cwd(), "services", "firmware_manager.py");

// Strict allowlist for input validation — prevents command injection
const SAFE_INPUT_PATTERN = /^[a-zA-Z0-9_.\-]+$/;

function validateInput(value: string, fieldName: string): string | null {
  if (!SAFE_INPUT_PATTERN.test(value)) {
    return `Invalid ${fieldName}: only alphanumeric, underscore, hyphen, dot, and slash characters allowed`;
  }
  return null;
}

/**
 * GET /api/firmware
 * Get firmware status, available firmware, and connected devices
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    const pythonCmd = process.env.PYTHON_CMD || "python";

    if (action === "detect") {
      const { stdout } = await execFileAsync(
        pythonCmd, [FIRMWARE_MANAGER_PATH, "detect"],
        { timeout: 10000 }
      );

      return NextResponse.json({
        devices: parseDeviceList(stdout),
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "list") {
      const { stdout } = await execFileAsync(
        pythonCmd, [FIRMWARE_MANAGER_PATH, "list"],
        { timeout: 10000 }
      );

      return NextResponse.json({
        firmware: parseFirmwareList(stdout),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      status: "ready",
      platformio_available: await checkToolAvailable("pio"),
      arduino_available: await checkToolAvailable("arduino-cli"),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get firmware status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/firmware
 * Compile, upload, or test firmware
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, firmware, port, use_platformio = true } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action required (compile, upload, test, full)" },
        { status: 400 }
      );
    }

    const pythonCmd = process.env.PYTHON_CMD || "python";
    const args: string[] = [FIRMWARE_MANAGER_PATH];

    if (action === "compile") {
      if (!firmware) {
        return NextResponse.json({ error: "Firmware name required" }, { status: 400 });
      }
      const err = validateInput(firmware, "firmware");
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      args.push("compile", "--firmware", firmware);
      if (!use_platformio) args.push("--arduino");
    } else if (action === "upload") {
      if (!firmware || !port) {
        return NextResponse.json({ error: "Firmware name and port required" }, { status: 400 });
      }
      const fwErr = validateInput(firmware, "firmware");
      if (fwErr) return NextResponse.json({ error: fwErr }, { status: 400 });
      const portErr = validateInput(port, "port");
      if (portErr) return NextResponse.json({ error: portErr }, { status: 400 });
      args.push("upload", "--firmware", firmware, "--port", port);
      if (!use_platformio) args.push("--arduino");
    } else if (action === "test") {
      if (!port) {
        return NextResponse.json({ error: "Port required" }, { status: 400 });
      }
      const portErr = validateInput(port, "port");
      if (portErr) return NextResponse.json({ error: portErr }, { status: 400 });
      args.push("test", "--port", port);
    } else if (action === "full") {
      if (!firmware || !port) {
        return NextResponse.json({ error: "Firmware name and port required" }, { status: 400 });
      }
      const fwErr = validateInput(firmware, "firmware");
      if (fwErr) return NextResponse.json({ error: fwErr }, { status: 400 });
      const portErr = validateInput(port, "port");
      if (portErr) return NextResponse.json({ error: portErr }, { status: 400 });
      args.push("full", "--firmware", firmware, "--port", port);
      if (!use_platformio) args.push("--arduino");
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { stdout, stderr } = await execFileAsync(pythonCmd, args, {
      timeout: 300000,
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      error: stderr || undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
        details: error.stderr || error.stdout || undefined,
      },
      { status: 500 }
    );
  }
}

async function checkToolAvailable(tool: string): Promise<boolean> {
  try {
    await execFileAsync(tool, ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function parseDeviceList(output: string): Array<{ port: string; description: string }> {
  const devices: Array<{ port: string; description: string }> = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.includes("Found") && line.includes("ESP32")) {
      continue;
    }
    if (line.trim().startsWith("-")) {
      const match = line.match(/- (.+?): (.+)/);
      if (match) {
        devices.push({
          port: match[1].trim(),
          description: match[2].trim(),
        });
      }
    }
  }

  return devices;
}

function parseFirmwareList(output: string): Array<{ name: string; side: string; path: string }> {
  const firmware: Array<{ name: string; side: string; path: string }> = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.trim().startsWith("-")) {
      const match = line.match(/- (.+?) \(Side (.+?)\): (.+)/);
      if (match) {
        firmware.push({
          name: match[1].trim(),
          side: match[2].trim(),
          path: match[3].trim(),
        });
      }
    }
  }

  return firmware;
}
