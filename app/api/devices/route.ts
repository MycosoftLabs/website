import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/db"

export async function GET() {
  try {
    const db = getDatabase()

    if (!db) {
      // Return mock device data when database is not available
      const mockDevices = [
        {
          id: "device-1",
          name: "Mushroom 1",
          type: "Ground-Based Fungal Intelligence Station",
          status: "active",
          location: { lat: 37.7749, lng: -122.4194 },
          deployed_units: 1245,
          battery_level: 87,
          signal_strength: "strong",
        },
        {
          id: "device-2",
          name: "ALARM",
          type: "Environmental Safety Device",
          status: "active",
          location: { lat: 40.7128, lng: -74.006 },
          deployed_units: 2156,
          battery_level: 92,
          alerts_today: 12,
        },
        {
          id: "device-3",
          name: "SporeBase",
          type: "Distributed Spore Collection Network",
          status: "active",
          location: { lat: 51.5074, lng: -0.1278 },
          deployed_units: 879,
          battery_level: 76,
          data_collected: "1.2TB",
        },
        {
          id: "device-4",
          name: "TruffleBot",
          type: "Handheld Fungal Detection System",
          status: "maintenance",
          location: { lat: 48.8566, lng: 2.3522 },
          deployed_units: 234,
          battery_level: 23,
          last_maintenance: "2024-01-15",
        },
        {
          id: "device-5",
          name: "Petreus",
          type: "Computational Petri Dish Platform",
          status: "active",
          location: { lat: 35.6762, lng: 139.6503 },
          deployed_units: 567,
          battery_level: 94,
          experiments_running: 45,
        },
        {
          id: "device-6",
          name: "MycoTenna",
          type: "Fungal Network Communication System",
          status: "active",
          location: { lat: -33.8688, lng: 151.2093 },
          deployed_units: 123,
          battery_level: 78,
          network_connections: 89,
        },
        {
          id: "device-7",
          name: "MycoAlarm",
          type: "Fungal Network Early Warning System",
          status: "active",
          location: { lat: 52.52, lng: 13.405 },
          deployed_units: 345,
          battery_level: 85,
          alerts_this_week: 7,
        },
      ]

      return NextResponse.json({
        success: true,
        devices: mockDevices,
        source: "mock",
      })
    }

    // Try to fetch from database
    const devices = await db`
      SELECT * FROM devices 
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      devices,
      source: "database",
    })
  } catch (error) {
    console.error("Error fetching devices:", error)

    // Return mock data on error
    const mockDevices = [
      {
        id: "device-1",
        name: "Mushroom 1",
        type: "Ground-Based Fungal Intelligence Station",
        status: "active",
        deployed_units: 1245,
        battery_level: 87,
      },
    ]

    return NextResponse.json({
      success: true,
      devices: mockDevices,
      source: "fallback",
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, location, specifications } = body

    if (!name || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and type are required",
        },
        { status: 400 },
      )
    }

    const db = getDatabase()

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not available",
        },
        { status: 503 },
      )
    }

    const result = await db`
      INSERT INTO devices (name, type, location, specifications, status, created_at)
      VALUES (${name}, ${type}, ${location}, ${JSON.stringify(specifications)}, 'active', NOW())
      RETURNING *
    `

    return NextResponse.json(
      {
        success: true,
        device: result[0],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating device:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create device",
      },
      { status: 500 },
    )
  }
}
