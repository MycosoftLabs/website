import { neon } from "@neondatabase/serverless"

// Initialize the SQL client with the database URL
const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "")

// Queue for batching telemetry events
let telemetryQueue: TelemetryEvent[] = []
let isProcessingQueue = false
const QUEUE_PROCESS_INTERVAL = 10000 // Process queue every 10 seconds
const MAX_QUEUE_SIZE = 100 // Process queue when it reaches this size

interface TelemetryEvent {
  endpoint: string
  agent: string
  timestamp: string
  data: any
}

/**
 * Track API usage for monitoring and analytics
 * @param endpoint The API endpoint being accessed
 * @param agent Identifier for the agent/system making the request
 * @param data Additional data about the request
 */
export async function trackApiUsage(endpoint: string, agent: string, data: any): Promise<void> {
  try {
    // Create telemetry event
    const event: TelemetryEvent = {
      endpoint,
      agent,
      timestamp: new Date().toISOString(),
      data: JSON.stringify(data),
    }

    // Add to queue
    telemetryQueue.push(event)

    // Process queue if it's getting large
    if (telemetryQueue.length >= MAX_QUEUE_SIZE) {
      processQueue()
    }

    // Set up interval to process queue if not already running
    if (!isProcessingQueue) {
      isProcessingQueue = true
      setInterval(processQueue, QUEUE_PROCESS_INTERVAL)
    }
  } catch (error) {
    // Don't let telemetry errors affect the main application
    console.error("Telemetry error:", error)
  }
}

/**
 * Process the telemetry queue by writing events to the database
 */
async function processQueue(): Promise<void> {
  if (telemetryQueue.length === 0) return

  // Get events to process and clear queue
  const events = [...telemetryQueue]
  telemetryQueue = []

  try {
    // Insert events in batches
    const values = events
      .map(
        (event) => `(
      '${event.endpoint}', 
      '${event.agent}', 
      '${event.timestamp}', 
      '${event.data.replace(/'/g, "''")}'
    )`,
      )
      .join(", ")

    await sql.query(`
      INSERT INTO api_telemetry (endpoint, agent_id, timestamp, request_data)
      VALUES ${values}
    `)
  } catch (error) {
    console.error("Error processing telemetry queue:", error)

    // Put events back in queue if processing failed
    telemetryQueue = [...events, ...telemetryQueue]

    // Limit queue size to prevent memory issues
    if (telemetryQueue.length > MAX_QUEUE_SIZE * 2) {
      telemetryQueue = telemetryQueue.slice(-MAX_QUEUE_SIZE)
    }
  }
}

/**
 * Get API usage statistics
 * @param startDate Start date for the statistics
 * @param endDate End date for the statistics
 * @returns API usage statistics
 */
export async function getApiUsageStats(startDate: Date, endDate: Date): Promise<any> {
  try {
    const stats = await sql`
      SELECT 
        endpoint,
        agent_id,
        COUNT(*) as request_count,
        MIN(timestamp) as first_request,
        MAX(timestamp) as last_request
      FROM api_telemetry
      WHERE timestamp BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
      GROUP BY endpoint, agent_id
      ORDER BY request_count DESC
    `

    return stats
  } catch (error) {
    console.error("Error getting API usage stats:", error)
    return []
  }
}
