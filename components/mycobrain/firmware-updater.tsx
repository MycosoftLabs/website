"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  Cpu,
  Usb,
  Play,
  Square,
} from "lucide-react"

interface FirmwareDevice {
  port: string
  description: string
}

interface FirmwareInfo {
  name: string
  side: string
  path: string
}

interface UploadResult {
  success: boolean
  firmware: string
  port: string
  compile_success: boolean
  upload_success: boolean
  test_success: boolean
  errors: string[]
  test_results?: any
  timestamp: string
}

export function FirmwareUpdater() {
  const [devices, setDevices] = useState<FirmwareDevice[]>([])
  const [firmware, setFirmware] = useState<FirmwareInfo[]>([])
  const [selectedFirmware, setSelectedFirmware] = useState<string>("")
  const [selectedPort, setSelectedPort] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>("")
  const [output, setOutput] = useState<string[]>([])
  const [lastResult, setLastResult] = useState<UploadResult | null>(null)
  const [usePlatformIO, setUsePlatformIO] = useState(true)

  useEffect(() => {
    detectDevices()
    listFirmware()
  }, [])

  const detectDevices = async () => {
    try {
      const res = await fetch("/api/firmware?action=detect")
      const data = await res.json()
      setDevices(data.devices || [])
      
      // Auto-select COM4 if available
      const com4 = data.devices?.find((d: FirmwareDevice) => d.port === "COM4")
      if (com4) {
        setSelectedPort("COM4")
      }
    } catch (error) {
      console.error("Failed to detect devices:", error)
    }
  }

  const listFirmware = async () => {
    try {
      const res = await fetch("/api/firmware?action=list")
      const data = await res.json()
      setFirmware(data.firmware || [])
      
      // Auto-select first firmware
      if (data.firmware?.length > 0) {
        setSelectedFirmware(data.firmware[0].name)
      }
    } catch (error) {
      console.error("Failed to list firmware:", error)
    }
  }

  const addOutput = (message: string) => {
    setOutput((prev) => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const compileFirmware = async () => {
    if (!selectedFirmware) {
      addOutput("✗ No firmware selected")
      return
    }

    setLoading(true)
    setProgress(0)
    setStatus("Compiling...")
    addOutput(`> Compiling ${selectedFirmware}...`)

    try {
      const res = await fetch("/api/firmware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compile",
          firmware: selectedFirmware,
          use_platformio: usePlatformIO,
        }),
      })

      const data = await res.json()
      setProgress(100)

      if (data.success) {
        addOutput(`✓ Compilation successful`)
        setStatus("Compilation complete")
      } else {
        addOutput(`✗ Compilation failed: ${data.error}`)
        setStatus("Compilation failed")
      }
    } catch (error) {
      addOutput(`✗ Error: ${error}`)
      setStatus("Error")
    } finally {
      setLoading(false)
    }
  }

  const uploadFirmware = async () => {
    if (!selectedFirmware || !selectedPort) {
      addOutput("✗ Firmware and port required")
      return
    }

    setLoading(true)
    setProgress(0)
    setStatus("Uploading...")
    addOutput(`> Uploading ${selectedFirmware} to ${selectedPort}...`)

    try {
      const res = await fetch("/api/firmware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          firmware: selectedFirmware,
          port: selectedPort,
          use_platformio: usePlatformIO,
        }),
      })

      const data = await res.json()
      setProgress(100)

      if (data.success) {
        addOutput(`✓ Upload successful`)
        setStatus("Upload complete")
      } else {
        addOutput(`✗ Upload failed: ${data.error}`)
        setStatus("Upload failed")
      }
    } catch (error) {
      addOutput(`✗ Error: ${error}`)
      setStatus("Error")
    } finally {
      setLoading(false)
    }
  }

  const testFirmware = async () => {
    if (!selectedPort) {
      addOutput("✗ Port required")
      return
    }

    setLoading(true)
    setStatus("Testing...")
    addOutput(`> Testing firmware on ${selectedPort}...`)

    try {
      const res = await fetch("/api/firmware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          port: selectedPort,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addOutput(`✓ Test passed`)
        setStatus("Test passed")
      } else {
        addOutput(`✗ Test failed: ${data.error}`)
        setStatus("Test failed")
      }
    } catch (error) {
      addOutput(`✗ Error: ${error}`)
      setStatus("Error")
    } finally {
      setLoading(false)
    }
  }

  const compileAndUpload = async () => {
    if (!selectedFirmware || !selectedPort) {
      addOutput("✗ Firmware and port required")
      return
    }

    setLoading(true)
    setProgress(0)
    setStatus("Starting full update...")
    addOutput(`> Starting full firmware update: ${selectedFirmware} -> ${selectedPort}`)

    try {
      const res = await fetch("/api/firmware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "full",
          firmware: selectedFirmware,
          port: selectedPort,
          use_platformio: usePlatformIO,
          test: true,
        }),
      })

      const data = await res.json()
      setProgress(100)

      if (data.success) {
        // Parse result if available
        try {
          const result = JSON.parse(data.output || "{}")
          setLastResult(result)
          
          if (result.compile_success && result.upload_success && result.test_success) {
            addOutput(`✓ Full update successful`)
            setStatus("Update complete - All tests passed")
          } else {
            addOutput(`⚠ Update completed with issues`)
            setStatus("Update completed with issues")
            if (result.errors?.length > 0) {
              result.errors.forEach((err: string) => addOutput(`  - ${err}`))
            }
          }
        } catch {
          addOutput(`✓ Update completed`)
          setStatus("Update complete")
        }
      } else {
        addOutput(`✗ Update failed: ${data.error}`)
        setStatus("Update failed")
      }
    } catch (error) {
      addOutput(`✗ Error: ${error}`)
      setStatus("Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Firmware Manager
          </CardTitle>
          <CardDescription>
            Compile, upload, and test MycoBrain firmware on ESP32 devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tool Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Build Tool:</label>
            <Button
              variant={usePlatformIO ? "default" : "outline"}
              size="sm"
              onClick={() => setUsePlatformIO(true)}
            >
              PlatformIO
            </Button>
            <Button
              variant={!usePlatformIO ? "default" : "outline"}
              size="sm"
              onClick={() => setUsePlatformIO(false)}
            >
              Arduino CLI
            </Button>
          </div>

          {/* Device Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Device:</label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 border rounded-md"
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
              >
                <option value="">Select port...</option>
                {devices.map((device) => (
                  <option key={device.port} value={device.port}>
                    {device.port} - {device.description}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={detectDevices}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Firmware Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Firmware:</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedFirmware}
              onChange={(e) => setSelectedFirmware(e.target.value)}
            >
              <option value="">Select firmware...</option>
              {firmware.map((fw) => (
                <option key={fw.name} value={fw.name}>
                  {fw.name} (Side {fw.side})
                </option>
              ))}
            </select>
          </div>

          {/* Progress */}
          {loading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{status}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={compileFirmware}
              disabled={loading || !selectedFirmware}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Compile
            </Button>
            <Button
              onClick={uploadFirmware}
              disabled={loading || !selectedFirmware || !selectedPort}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              onClick={testFirmware}
              disabled={loading || !selectedPort}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button
              onClick={compileAndUpload}
              disabled={loading || !selectedFirmware || !selectedPort}
              className="bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Compile & Upload & Test
            </Button>
          </div>

          {/* Last Result */}
          {lastResult && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Last Update Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {lastResult.compile_success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Compilation: {lastResult.compile_success ? "Success" : "Failed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lastResult.upload_success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Upload: {lastResult.upload_success ? "Success" : "Failed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lastResult.test_success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Test: {lastResult.test_success ? "Passed" : "Failed"}</span>
                  </div>
                  {lastResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-500">Errors:</p>
                      <ul className="list-disc list-inside text-xs">
                        {lastResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Output Console */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Output Console
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded-md border p-4 bg-black text-green-400 font-mono text-sm">
            {output.length === 0 ? (
              <p className="text-muted-foreground">No output yet...</p>
            ) : (
              output.map((line, i) => (
                <div key={i} className="mb-1">
                  {line}
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}






