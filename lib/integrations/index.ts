/**
 * Integration Layer Index
 *
 * Re-exports all integration functions and types
 */

// Types
export * from "./types"

// HTTP Client
export { createHttpClient } from "./http"
export type { HttpClientOptions, HttpRequestOptions, HttpError } from "./http"

// MINDEX Integration
export {
  getMindexHealth,
  searchTaxa,
  getTaxonById,
  listTaxa,
  getDevices,
  getDeviceById,
  getDevicesByType,
  getLatestTelemetry,
  getLatestTelemetryByDevice,
  getTelemetryHistory,
  searchObservations,
  getObservationById,
  getObservationsByLocation,
} from "./mindex"

// MYCA MAS Integration
export {
  getMasHealth,
  listAgents,
  getAgentById,
  listAgentRuns,
  getAgentRun,
  startAgentRun,
  cancelAgentRun,
  getAgentRunLogs,
} from "./myca-mas"
export type { ListAgentRunsFilters, StartAgentRunPayload } from "./myca-mas"
