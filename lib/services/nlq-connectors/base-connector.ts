/**
 * Base Connector Interface
 * Created: Jan 26, 2026
 */

import type { Intent, DataSourceType } from "../myca-nlq"

export interface ConnectorOptions {
  maxResults?: number
  timeout?: number
  filters?: Record<string, unknown>
}

export interface ConnectorResult {
  success: boolean
  data: unknown[]
  error?: string
  queryTime: number
  source: DataSourceType
}

export interface BaseConnector {
  readonly name: string
  readonly sourceType: DataSourceType
  
  query(intent: Intent, options?: ConnectorOptions): Promise<ConnectorResult>
  isAvailable(): Promise<boolean>
}
