import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Standard API error response
 */
export interface ApiError {
  error: string
  message?: string
  details?: unknown
  statusCode?: number
}

/**
 * Custom error class for API errors with status codes
 */
export class ApiException extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiException'
  }
}

/**
 * Standard API success response
 */
export type ApiResponse<T = unknown> = T | ApiError

/**
 * Options for the API handler wrapper
 */
export interface ApiHandlerOptions {
  /**
   * Whether to log errors (default: true)
   */
  logErrors?: boolean
  /**
   * Custom error message for 500 errors
   */
  defaultErrorMessage?: string
  /**
   * Tags for logging
   */
  tags?: Record<string, string>
  /**
   * Whether to include error details in response (default: false in production)
   */
  includeErrorDetails?: boolean
}

/**
 * Wrapper for API route handlers with consistent error handling
 *
 * @param handler - The API route handler function
 * @param options - Options for error handling
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```ts
 * export const GET = withApiHandler(async (request) => {
 *   const data = await fetchData()
 *   return { data }
 * }, { tags: { endpoint: 'getData' } })
 * ```
 */
export function withApiHandler<T = unknown>(
  handler: (request: NextRequest) => Promise<ApiResponse<T> | Response>,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest): Promise<Response> => {
    const {
      logErrors = true,
      defaultErrorMessage = 'An error occurred processing your request',
      tags = {},
      includeErrorDetails = process.env.NODE_ENV !== 'production'
    } = options

    try {
      const result = await handler(request)

      // If result is already a Response, return it
      if (result instanceof Response) {
        return result
      }

      // Check if result is an error response
      if (result && typeof result === 'object' && 'error' in result) {
        const errorResponse = result
        const statusCode =
          'statusCode' in errorResponse && typeof errorResponse.statusCode === 'number'
            ? errorResponse.statusCode
            : 500
        return NextResponse.json(errorResponse, { status: statusCode })
      }

      // Success response
      return NextResponse.json(result)
    } catch (error) {
      // Handle ApiException specifically
      if (error instanceof ApiException) {
        if (logErrors) {
          logger.error('API exception occurred', {
            data: {
              message: error.message,
              statusCode: error.statusCode,
              details: error.details,
              path: request.nextUrl.pathname
            },
            tags: { type: 'api', severity: 'warn', ...tags }
          })
        }

        return NextResponse.json(
          {
            error: error.message,
            ...(includeErrorDetails && error.details ? { details: error.details } : {})
          },
          { status: error.statusCode }
        )
      }

      // Log unexpected errors
      if (logErrors) {
        logger.error('Unhandled API error', {
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            path: request.nextUrl.pathname
          },
          tags: { type: 'api', severity: 'error', ...tags }
        })
      }

      // Return generic error response
      const errorMessage = error instanceof Error ? error.message : defaultErrorMessage
      const sanitizedMessage = includeErrorDetails ? errorMessage : defaultErrorMessage

      return NextResponse.json(
        {
          error: sanitizedMessage,
          ...(includeErrorDetails && error instanceof Error
            ? {
                details: {
                  name: error.name,
                  message: error.message
                }
              }
            : {})
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Validate required fields in request body
 *
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @throws ApiException if any required field is missing
 *
 * @example
 * ```ts
 * const body = await request.json()
 * validateRequiredFields(body, ['email', 'password'])
 * ```
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => {
    // Field not present in object
    if (!(field in body)) {
      return true
    }
    
    const value = body[field]
    
    // null or undefined
    if (value == null) {
      return true
    }
    
    // For strings, trim and check if empty
    if (typeof value === 'string' && value.trim() === '') {
      return true
    }
    
    // All other values (including false, 0) are valid
    return false
  })

  if (missingFields.length > 0) {
    throw new ApiException(`Missing required fields: ${missingFields.join(', ')}`, 400, {
      missingFields
    })
  }
}

/**
 * Parse and validate query parameters
 *
 * @param searchParams - URL search parameters
 * @param schema - Schema for validation
 * @returns Parsed and validated parameters
 *
 * @example
 * ```ts
 * const params = parseQueryParams(searchParams, {
 *   page: { type: 'number', default: 1, min: 1 },
 *   limit: { type: 'number', default: 10, min: 1, max: 100 },
 *   search: { type: 'string', optional: true }
 * })
 * ```
 */
export function parseQueryParams<T extends Record<string, unknown>>(
  searchParams: URLSearchParams,
  schema: {
    [K in keyof T]: {
      type: 'string' | 'number' | 'boolean'
      default?: T[K]
      optional?: boolean
      min?: number
      max?: number
      enum?: readonly T[K][]
    }
  }
): T {
  const result: Partial<T> = {}

  for (const [key, config] of Object.entries(schema)) {
    const value = searchParams.get(key)

    if (!value) {
      if (config.optional) {
        continue
      }
      if (config.default !== undefined) {
        // @ts-expect-error - Safe assignment with validated key
        result[key] = config.default
        continue
      }
      throw new ApiException(`Missing required parameter: ${String(key)}`, 400)
    }

    // Parse based on type
    let parsedValue: any = value

    switch (config.type) {
      case 'number':
        parsedValue = Number(value)
        if (Number.isNaN(parsedValue)) {
          throw new ApiException(`Invalid number for parameter: ${String(key)}`, 400)
        }
        if (config.min !== undefined && parsedValue < config.min) {
          throw new ApiException(`Parameter ${String(key)} must be at least ${config.min}`, 400)
        }
        if (config.max !== undefined && parsedValue > config.max) {
          throw new ApiException(`Parameter ${String(key)} must be at most ${config.max}`, 400)
        }
        break

      case 'boolean':
        parsedValue = value === 'true' || value === '1'
        break

      default:
        parsedValue = value
    }

    // Check enum values
    if (config.enum && !config.enum.includes(parsedValue)) {
      throw new ApiException(
        `Invalid value for ${String(key)}. Must be one of: ${config.enum.join(', ')}`,
        400
      )
    }

    // @ts-expect-error - Safe assignment with validated key
    result[key] = parsedValue
  }

  // @ts-expect-error - Result is fully populated after validation
  return result
}

/**
 * Create a standard error response
 *
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param details - Additional error details
 * @returns NextResponse with error
 */
export function errorResponse(message: string, statusCode = 500, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {})
    },
    { status: statusCode }
  )
}

/**
 * Create a standard success response
 *
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @returns NextResponse with data
 */
export function successResponse<T>(data: T, statusCode = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode })
}

/**
 * Handle CORS for API routes
 *
 * @param response - NextResponse to add CORS headers to
 * @param origin - Allowed origin (default: *)
 * @returns Response with CORS headers
 */
export function withCors(response: NextResponse, origin = '*'): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}
