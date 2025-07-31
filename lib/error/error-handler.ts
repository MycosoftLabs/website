/**
 * Error types for the Mycosoft API
 */
export enum ErrorType {
  VALIDATION = "VALIDATION_ERROR",
  AUTHENTICATION = "AUTHENTICATION_ERROR",
  AUTHORIZATION = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND_ERROR",
  RATE_LIMIT = "RATE_LIMIT_ERROR",
  DATABASE = "DATABASE_ERROR",
  EXTERNAL_API = "EXTERNAL_API_ERROR",
  INTERNAL = "INTERNAL_ERROR",
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    type: ErrorType
    message: string
    details?: any
    code?: string
    timestamp: string
    requestId: string
  }
}

/**
 * Create a standardized error response
 * @param type Error type
 * @param message Error message
 * @param details Additional error details
 * @param code Optional error code
 * @returns Standardized error response
 */
export function createErrorResponse(type: ErrorType, message: string, details?: any, code?: string): ErrorResponse {
  return {
    error: {
      type,
      message,
      details,
      code,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}

/**
 * Handle errors in API routes
 * @param error The error to handle
 * @returns Standardized error response
 */
export function handleApiError(error: unknown): ErrorResponse {
  console.error("API error:", error)

  // Handle known error types
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("validation")) {
      return createErrorResponse(ErrorType.VALIDATION, "Validation error", { message: error.message }, "VAL_001")
    }

    if (error.message.includes("authentication") || error.message.includes("unauthorized")) {
      return createErrorResponse(
        ErrorType.AUTHENTICATION,
        "Authentication failed",
        { message: error.message },
        "AUTH_001",
      )
    }

    if (error.message.includes("not found")) {
      return createErrorResponse(ErrorType.NOT_FOUND, "Resource not found", { message: error.message }, "NF_001")
    }

    if (error.message.includes("database")) {
      return createErrorResponse(ErrorType.DATABASE, "Database error", { message: error.message }, "DB_001")
    }

    // Default to internal error
    return createErrorResponse(ErrorType.INTERNAL, "An internal error occurred", { message: error.message }, "INT_001")
  }

  // Handle unknown errors
  return createErrorResponse(ErrorType.INTERNAL, "An unknown error occurred", { error }, "INT_000")
}

/**
 * Log errors to the monitoring system
 * @param error The error to log
 * @param context Additional context information
 */
export function logError(error: unknown, context?: any): void {
  const timestamp = new Date().toISOString()
  const errorId = crypto.randomUUID()

  const errorInfo = {
    id: errorId,
    timestamp,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  }

  // Log to console for now
  console.error("Error logged:", errorInfo)

  // In a production environment, you might want to send this to a logging service
  // or store it in a database
}
