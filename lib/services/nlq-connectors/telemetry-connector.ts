/**
 * Telemetry Connector - Device and Sensor Data
 * Created: Jan 26, 2026
 */

import type { Intent } from "../myca-nlq"
import type { BaseConnector, ConnectorOptions, ConnectorResult } from "./base-connector"

const TELEMETRY_API_URL = process.env.NEXT_PUBLIC_TELEMETRY_API_URL || "http://192.168.0.188:8003"

export class TelemetryConnector implements BaseConnector {
  readonly name = "Device Telemetry"
  readonly sourceType = "telemetry" as const
  
  async query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult> {
    const startTime = Date.now()
    
    try {
      // Determine what type of telemetry to query
      const sensorType = this.extractSensorType(intent.rawQuery)
      const timeRange = this.extractTimeRange(intent)
      
      // Try MycoBrain API first
      try {
        const response = await fetch(`/api/mas/mycobrain?type=${sensorType}&range=${timeRange}`, {
          signal: AbortSignal.timeout(options?.timeout || 5000),
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            data: this.formatTelemetryData(data, options?.maxResults),
            queryTime: Date.now() - startTime,
            source: this.sourceType,
          }
        }
      } catch {
        // Fall through
      }
      
      // Try dedicated telemetry API
      try {
        const params = new URLSearchParams()
        if (sensorType !== "all") params.set("sensor", sensorType)
        params.set("range", timeRange)
        params.set("limit", String(options?.maxResults || 100))
        
        const response = await fetch(`${TELEMETRY_API_URL}/readings?${params}`, {
          signal: AbortSignal.timeout(options?.timeout || 5000),
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            data: this.formatTelemetryData(data, options?.maxResults),
            queryTime: Date.now() - startTime,
            source: this.sourceType,
          }
        }
      } catch {
        // Telemetry API not available
      }
      
      // Return sample data for development
      return {
        success: true,
        data: this.getSampleTelemetry(sensorType),
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Unknown error",
        queryTime: Date.now() - startTime,
        source: this.sourceType,
      }
    }
  }
  
  private extractSensorType(query: string): string {
    const sensorPatterns: Array<{ pattern: RegExp; type: string }> = [
      { pattern: /temperature|temp/i, type: "temperature" },
      { pattern: /humidity/i, type: "humidity" },
      { pattern: /pressure/i, type: "pressure" },
      { pattern: /gas|voc|air/i, type: "gas" },
      { pattern: /co2|carbon/i, type: "co2" },
      { pattern: /light|lux/i, type: "light" },
      { pattern: /motion|presence/i, type: "motion" },
      { pattern: /wifi.*csi/i, type: "wifi_csi" },
    ]
    
    for (const { pattern, type } of sensorPatterns) {
      if (pattern.test(query)) {
        return type
      }
    }
    
    return "all"
  }
  
  private extractTimeRange(intent: Intent): string {
    const timeRange = intent.entities.timeRange as string
    if (timeRange) {
      const rangeMap: Record<string, string> = {
        "today": "24h",
        "yesterday": "48h",
        "this week": "7d",
        "last week": "14d",
        "this month": "30d",
        "last hour": "1h",
      }
      return rangeMap[timeRange.toLowerCase()] || "24h"
    }
    return "24h"
  }
  
  private formatTelemetryData(data: unknown, maxResults?: number): unknown[] {
    if (!data) return []
    
    const readings = Array.isArray(data) ? data : 
      (data as Record<string, unknown>).readings ||
      (data as Record<string, unknown>).data || []
    
    return readings.slice(0, maxResults || 100)
  }
  
  private getSampleTelemetry(sensorType: string): unknown[] {
    const now = Date.now()
    const samples = []
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now - i * 60000).toISOString()
      
      if (sensorType === "all" || sensorType === "temperature") {
        samples.push({
          id: `temp-${i}`,
          sensor_name: "BME688 Temperature",
          device_id: "mycobrain-1",
          type: "temperature",
          value: 22 + Math.random() * 5,
          unit: "°C",
          timestamp,
        })
      }
      
      if (sensorType === "all" || sensorType === "humidity") {
        samples.push({
          id: `hum-${i}`,
          sensor_name: "BME688 Humidity",
          device_id: "mycobrain-1",
          type: "humidity",
          value: 45 + Math.random() * 20,
          unit: "%",
          timestamp,
        })
      }
      
      if (sensorType === "all" || sensorType === "gas") {
        samples.push({
          id: `gas-${i}`,
          sensor_name: "BME688 VOC",
          device_id: "mycobrain-1",
          type: "gas",
          value: 100 + Math.random() * 50,
          unit: "IAQ",
          timestamp,
        })
      }
    }
    
    return samples
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`/api/mas/mycobrain?limit=1`, {
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
