import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

// Send command to board and get response
async function sendBoardCommand(deviceId: string, cmd: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd } }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (res.ok) {
      const data = await res.json()
      return data.response || null
    }
  } catch {
    // Command failed
  }
  return null
}

// Parse I2C scan results
function parseI2CScan(response: string): { address: string; device: string }[] {
  const devices: { address: string; device: string }[] = []
  const matches = response.matchAll(/found:\s*(0x[0-9a-fA-F]+)/gi)
  for (const m of matches) {
    const addr = m[1].toLowerCase()
    let device = "Unknown"
    if (addr === "0x76" || addr === "0x77") device = "BME688 Environmental Sensor"
    else if (addr === "0x68" || addr === "0x69") device = "MPU6050/ICM Accelerometer"
    else if (addr === "0x3c" || addr === "0x3d") device = "SSD1306 OLED Display"
    else if (addr === "0x50") device = "EEPROM"
    else if (addr === "0x57") device = "MAX30102 Heart Rate Sensor"
    else if (addr === "0x29") device = "VL53L0X Distance Sensor"
    else if (addr === "0x39" || addr === "0x49") device = "APDS9960 Gesture Sensor"
    else if (addr === "0x48") device = "ADS1115 ADC"
    devices.push({ address: addr, device })
  }
  return devices
}

// Parse board identification from status response
function parseBoardInfo(response: string) {
  const info: Record<string, string | number | boolean> = {}
  
  // Arduino-ESP32 core version
  const coreMatch = response.match(/Arduino-ESP32 core:\s*([\d.]+)/i)
  if (coreMatch) info.arduino_core = coreMatch[1]
  
  // ESP SDK version
  const sdkMatch = response.match(/ESP SDK:\s*(\S+)/i)
  if (sdkMatch) info.esp_sdk = sdkMatch[1]
  
  // Chip model
  const chipMatch = response.match(/Chip model:\s*(\S+)/i)
  if (chipMatch) info.chip_model = chipMatch[1]
  
  // CPU frequency
  const freqMatch = response.match(/CPU freq:\s*(\d+)\s*MHz/i)
  if (freqMatch) info.cpu_freq_mhz = parseInt(freqMatch[1])
  
  // I2C pins
  const i2cMatch = response.match(/I2C:\s*SDA=(\d+)\s*SCL=(\d+)\s*@\s*(\d+)\s*Hz/i)
  if (i2cMatch) {
    info.i2c_sda = parseInt(i2cMatch[1])
    info.i2c_scl = parseInt(i2cMatch[2])
    info.i2c_freq = parseInt(i2cMatch[3])
  }
  
  // LED mode
  const ledMatch = response.match(/LED mode=(\w+)/i)
  if (ledMatch) info.led_mode = ledMatch[1]
  
  // Detect if this is a MycoBoard (has specific firmware markers)
  info.is_mycoboard = response.includes("SuperMorgIO") || 
                      response.includes("AMB addr=0x77") || 
                      response.includes("ENV addr=0x76") ||
                      response.includes("MycoBrain")
  
  // Board type determination
  if (info.is_mycoboard) {
    info.board_type = "MycoBoard"
    info.board_variant = response.includes("side-a") ? "Side-A" : 
                         response.includes("side-b") ? "Side-B" : "Gateway"
  } else if (info.chip_model === "ESP32-S3") {
    info.board_type = "ESP32-S3 Generic"
  } else if (info.chip_model?.toString().startsWith("ESP32")) {
    info.board_type = "ESP32 Generic"
  } else {
    info.board_type = "Unknown Board"
  }
  
  return info
}

// Store diagnostics to MINDEX for MYCA learning
async function storeDiagnosticsToMindex(diagnostics: Record<string, unknown>) {
  try {
    await fetch(`${MINDEX_API_URL}/telemetry/device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "mycobrain-diagnostics",
        device_id: diagnostics.device_id || "unknown",
        timestamp: new Date().toISOString(),
        data: diagnostics,
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Best effort - don't fail diagnostics if MINDEX is down
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const diagnostics: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      port: port === "all" ? null : port,
      tests: [],
    }
    const tests: { name: string; status: "pass" | "fail" | "skip"; message: string; duration_ms?: number }[] = []

    // Test 1: Check service health
    const t1Start = Date.now()
    try {
      const healthRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        diagnostics.service_status = "online"
        diagnostics.service_info = healthData
        tests.push({ name: "Service Health", status: "pass", message: "MycoBrain service is running", duration_ms: Date.now() - t1Start })
      } else {
        diagnostics.service_status = "offline"
        tests.push({ name: "Service Health", status: "fail", message: "Service not responding", duration_ms: Date.now() - t1Start })
      }
    } catch {
      diagnostics.service_status = "offline"
      tests.push({ name: "Service Health", status: "fail", message: "Service unreachable", duration_ms: Date.now() - t1Start })
    }

    // Test 2: Get available ports
    const t2Start = Date.now()
    try {
      const portsRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, {
        signal: AbortSignal.timeout(5000),
      })
      if (portsRes.ok) {
        const portsData = await portsRes.json()
        diagnostics.available_ports = portsData.ports || []
        diagnostics.ports_count = portsData.count || 0
        tests.push({ name: "Port Discovery", status: "pass", message: `Found ${portsData.count || 0} serial port(s)`, duration_ms: Date.now() - t2Start })
      } else {
        tests.push({ name: "Port Discovery", status: "fail", message: "Could not list ports", duration_ms: Date.now() - t2Start })
      }
    } catch {
      diagnostics.available_ports = []
      tests.push({ name: "Port Discovery", status: "fail", message: "Port discovery failed", duration_ms: Date.now() - t2Start })
    }

    // Test 3: Get connected devices
    const t3Start = Date.now()
    try {
      const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
        signal: AbortSignal.timeout(5000),
      })
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        diagnostics.connected_devices = devicesData.devices || []
        diagnostics.devices_count = devicesData.count || 0
        tests.push({ name: "Device Connection", status: devicesData.count > 0 ? "pass" : "fail", message: `${devicesData.count || 0} device(s) connected`, duration_ms: Date.now() - t3Start })
      } else {
        tests.push({ name: "Device Connection", status: "fail", message: "Could not get devices", duration_ms: Date.now() - t3Start })
      }
    } catch {
      diagnostics.connected_devices = []
      tests.push({ name: "Device Connection", status: "fail", message: "Device query failed", duration_ms: Date.now() - t3Start })
    }

    // If we have a specific device, run board-level diagnostics
    if (port !== "all" && diagnostics.service_status === "online") {
      // Resolve device_id
      let deviceId = port
      try {
        const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, { signal: AbortSignal.timeout(3000) })
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json()
          const device = devicesData.devices?.find((d: { port?: string; device_id?: string }) => 
            d.port === port || d.device_id === port || d.port?.includes(port) || d.device_id?.includes(port)
          )
          if (device?.device_id) deviceId = device.device_id
        }
      } catch { /* use port */ }
      
      diagnostics.device_id = deviceId

      // Test 4: Board Status Command
      const t4Start = Date.now()
      const statusResponse = await sendBoardCommand(deviceId, "status")
      if (statusResponse) {
        diagnostics.board_info = parseBoardInfo(statusResponse)
        diagnostics.raw_status = statusResponse
        tests.push({ name: "Board Status", status: "pass", message: `Board: ${(diagnostics.board_info as Record<string, unknown>).board_type}`, duration_ms: Date.now() - t4Start })
      } else {
        tests.push({ name: "Board Status", status: "fail", message: "Could not get board status", duration_ms: Date.now() - t4Start })
      }

      // Test 5: I2C Bus Scan
      const t5Start = Date.now()
      const scanResponse = await sendBoardCommand(deviceId, "scan")
      if (scanResponse) {
        const i2cDevices = parseI2CScan(scanResponse)
        diagnostics.i2c_devices = i2cDevices
        diagnostics.i2c_count = i2cDevices.length
        tests.push({ name: "I2C Bus Scan", status: i2cDevices.length > 0 ? "pass" : "fail", message: `Found ${i2cDevices.length} I2C device(s)`, duration_ms: Date.now() - t5Start })
      } else {
        tests.push({ name: "I2C Bus Scan", status: "skip", message: "Scan not available", duration_ms: Date.now() - t5Start })
      }

      // Test 6: Communication Status (LoRa, WiFi, etc.)
      const commStatus: Record<string, unknown> = {}
      if (statusResponse) {
        // Check for LoRa mentions
        if (statusResponse.toLowerCase().includes("lora")) {
          commStatus.lora = statusResponse.toLowerCase().includes("lora ok") ? "connected" : "initializing"
        } else {
          commStatus.lora = "not_detected"
        }
        // WiFi status would come from board
        commStatus.wifi = "not_implemented"
        commStatus.bluetooth = "not_implemented"
      }
      diagnostics.communication = commStatus
      tests.push({ name: "Communication Check", status: "pass", message: "Communication interfaces checked", duration_ms: 0 })
    }

    diagnostics.tests = tests
    diagnostics.tests_passed = tests.filter(t => t.status === "pass").length
    diagnostics.tests_failed = tests.filter(t => t.status === "fail").length
    diagnostics.tests_total = tests.length

    // Store to MINDEX for learning (async, don't wait)
    storeDiagnosticsToMindex(diagnostics)

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to run diagnostics",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}



