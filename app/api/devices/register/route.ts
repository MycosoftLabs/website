import { NextRequest, NextResponse } from "next/server"
import { getEventBus } from "@/lib/oei/event-bus"
import type { Entity, GeoLocation } from "@/types/oei"

/**
 * POST /api/devices/register
 * 
 * Register a new device in the NatureOS ecosystem.
 * 
 * Body:
 * {
 *   deviceId: string,           // Required: Unique device identifier
 *   deviceType: string,         // Required: "mycobrain" | "lorawan" | "iot" | "homeassistant"
 *   name?: string,              // Optional: Human-readable name
 *   description?: string,       // Optional: Device description
 *   location?: {                // Optional: Device location
 *     latitude: number,
 *     longitude: number,
 *     altitude?: number,
 *   },
 *   manufacturer?: string,      // Optional: Device manufacturer
 *   model?: string,             // Optional: Device model
 *   firmware?: string,          // Optional: Firmware version
 *   capabilities?: string[],    // Optional: List of capabilities (e.g., ["temperature", "humidity"])
 *   mqttTopic?: string,         // Optional: Custom MQTT topic
 *   apiKey?: string,            // Optional: Device API key for webhook auth
 *   metadata?: Record<string, unknown>, // Optional: Additional metadata
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400 }
      )
    }

    if (!body.deviceType) {
      return NextResponse.json(
        { success: false, error: "deviceType is required" },
        { status: 400 }
      )
    }

    const validTypes = ["mycobrain", "lorawan", "iot", "homeassistant", "generic"]
    if (!validTypes.includes(body.deviceType)) {
      return NextResponse.json(
        { success: false, error: `deviceType must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Generate entity ID
    const entityId = `${body.deviceType}_${body.deviceId}`

    // Parse location if provided
    let location: GeoLocation | undefined
    if (body.location && typeof body.location === "object") {
      location = {
        latitude: body.location.latitude,
        longitude: body.location.longitude,
        altitude: body.location.altitude,
        source: "registration",
      }
    }

    // Create entity
    const entity: Entity = {
      id: entityId,
      type: "device",
      name: body.name || body.deviceId,
      description: body.description || `${body.deviceType} device: ${body.deviceId}`,
      status: "pending",
      location,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [
        body.deviceType,
        ...(body.capabilities || []),
        body.manufacturer || "",
        body.model || "",
      ].filter(Boolean),
      properties: {
        deviceId: body.deviceId,
        deviceType: body.deviceType,
        manufacturer: body.manufacturer,
        model: body.model,
        firmware: body.firmware,
        capabilities: body.capabilities || [],
        mqttTopic: body.mqttTopic || `${body.deviceType}/${body.deviceId}/telemetry`,
        apiKey: body.apiKey,
        registeredAt: new Date().toISOString(),
        ...body.metadata,
      },
      provenance: {
        source: "registration",
        sourceId: body.deviceId,
        collectedAt: new Date().toISOString(),
        reliability: 1.0,
        metadata: {
          registrationMethod: "api",
          userAgent: request.headers.get("user-agent") || "",
        },
      },
    }

    // Publish entity to event bus
    const eventBus = getEventBus()
    await eventBus.publishEntity(entity)

    // Generate MQTT credentials if needed
    const mqttConfig = {
      topic: `${body.deviceType}/${body.deviceId}/telemetry`,
      statusTopic: `${body.deviceType}/${body.deviceId}/status`,
      commandTopic: `${body.deviceType}/${body.deviceId}/command`,
      brokerUrl: process.env.MQTT_BROKER_PUBLIC_URL || "mqtt://localhost:1883",
    }

    // Generate webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/devices/ingest`

    return NextResponse.json({
      success: true,
      message: "Device registered successfully",
      device: {
        entityId,
        deviceId: body.deviceId,
        deviceType: body.deviceType,
        name: entity.name,
        status: entity.status,
        createdAt: entity.createdAt,
      },
      mqtt: mqttConfig,
      webhook: {
        url: webhookUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(body.apiKey ? { "X-Device-Api-Key": body.apiKey } : {}),
        },
      },
      nextSteps: [
        "1. Configure your device to publish telemetry to the MQTT topic or send HTTP POST to webhook URL",
        "2. Device status will update to 'active' when first telemetry is received",
        "3. View your device at /devices/" + entityId,
      ],
    })

  } catch (error) {
    console.error("[API] Device registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to register device",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/devices/register
 * 
 * Get device registration form/documentation
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    name: "Device Registration API",
    version: "1.0.0",
    description: "Register IoT devices with NatureOS for telemetry collection",
    endpoint: "/api/devices/register",
    method: "POST",
    supportedDeviceTypes: [
      {
        type: "mycobrain",
        description: "Mycosoft MycoBrain ESP32-S3 environmental sensors",
        defaultCapabilities: ["temperature", "humidity", "pressure", "iaq", "voc", "co2"],
      },
      {
        type: "lorawan",
        description: "LoRaWAN devices via ChirpStack",
        defaultCapabilities: ["varies by device"],
      },
      {
        type: "iot",
        description: "Generic IoT devices with MQTT or HTTP telemetry",
        defaultCapabilities: ["custom"],
      },
      {
        type: "homeassistant",
        description: "Home Assistant devices via MQTT Discovery",
        defaultCapabilities: ["auto-discovered"],
      },
      {
        type: "generic",
        description: "Any device with JSON telemetry capability",
        defaultCapabilities: ["custom"],
      },
    ],
    requiredFields: {
      deviceId: "Unique identifier for the device (e.g., MAC address, serial number)",
      deviceType: "One of: mycobrain, lorawan, iot, homeassistant, generic",
    },
    optionalFields: {
      name: "Human-readable device name",
      description: "Device description",
      location: "{ latitude: number, longitude: number, altitude?: number }",
      manufacturer: "Device manufacturer",
      model: "Device model",
      firmware: "Firmware version",
      capabilities: "Array of sensor/capability strings",
      mqttTopic: "Custom MQTT topic (default: {deviceType}/{deviceId}/telemetry)",
      apiKey: "API key for webhook authentication",
      metadata: "Additional key-value metadata",
    },
    exampleRequest: {
      deviceId: "mycobrain-001",
      deviceType: "mycobrain",
      name: "Grow Room Sensor 1",
      description: "Environmental sensor in main cultivation room",
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      manufacturer: "Mycosoft",
      model: "MycoBrain v2.0",
      firmware: "1.2.3",
      capabilities: ["temperature", "humidity", "pressure", "iaq", "voc", "co2"],
    },
    exampleResponse: {
      success: true,
      message: "Device registered successfully",
      device: {
        entityId: "mycobrain_mycobrain-001",
        deviceId: "mycobrain-001",
        deviceType: "mycobrain",
        name: "Grow Room Sensor 1",
        status: "pending",
        createdAt: "2026-01-16T00:00:00.000Z",
      },
      mqtt: {
        topic: "mycobrain/mycobrain-001/telemetry",
        statusTopic: "mycobrain/mycobrain-001/status",
        commandTopic: "mycobrain/mycobrain-001/command",
        brokerUrl: "mqtt://localhost:1883",
      },
      webhook: {
        url: "http://localhost:3000/api/devices/ingest",
        method: "POST",
      },
    },
  })
}

/**
 * DELETE /api/devices/register
 * 
 * Unregister a device
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")
    const deviceType = searchParams.get("deviceType")

    if (!deviceId || !deviceType) {
      return NextResponse.json(
        { success: false, error: "deviceId and deviceType are required" },
        { status: 400 }
      )
    }

    const entityId = `${deviceType}_${deviceId}`

    // Mark entity as inactive
    const eventBus = getEventBus()
    await eventBus.publishEntity({
      id: entityId,
      type: "device",
      name: deviceId,
      status: "inactive",
      lastSeenAt: new Date().toISOString(),
      properties: {
        unregisteredAt: new Date().toISOString(),
      },
      provenance: {
        source: "registration",
        sourceId: deviceId,
        collectedAt: new Date().toISOString(),
        reliability: 1.0,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Device unregistered successfully",
      entityId,
    })

  } catch (error) {
    console.error("[API] Device unregistration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to unregister device",
      },
      { status: 500 }
    )
  }
}
