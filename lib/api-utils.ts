/**
 * Production-Grade API Utilities
 * Centralized utilities for API development and security
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'
import { createAdminClient } from './server-only/admin-client'
import { securityConfig } from './env'
import { 
  AuthenticationError, 
  AuthorizationError, 
  ValidationError,
  SenecaError,
  createErrorResponse,
  handleError
} from './errors'

// Types
export interface AuthenticatedUser {
  id: string
  email: string
  user_metadata: Record<string, any>
  app_metadata: Record<string, any>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    timestamp: string
    details?: Record<string, any>
  }
  metadata?: {
    pagination?: {
      page: number
      limit: number
      total: number
    }
    performance?: {
      execution_time: number
      queries_count: number
    }
  }
}

// Authentication middleware
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Bearer token required')
  }

  const token = authHeader.substring(7)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      throw new AuthenticationError('Invalid token')
    }

    return {
      id: user.id,
      email: user.email!,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    }
  } catch (error) {
    if (error instanceof SenecaError) {
      throw error
    }
    throw new AuthenticationError('Authentication failed')
  }
}

// Internal API key authentication
export function authenticateInternalRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey) {
    throw new AuthenticationError('API key required')
  }

  if (apiKey !== securityConfig.internalApiKey) {
    throw new AuthenticationError('Invalid API key')
  }

  return true
}

// Family access verification
export async function verifyFamilyAccess(
  userId: string, 
  familyId: string,
  requiredRole?: string
): Promise<boolean> {
  const adminClient = createAdminClient()
  
  try {
    const { data: membership, error } = await adminClient
      .from('family_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('family_id', familyId)
      .single()

    if (error || !membership) {
      throw new AuthorizationError('Access denied to this family')
    }

    if (requiredRole && membership.role !== requiredRole) {
      throw new AuthorizationError(`Role ${requiredRole} required`)
    }

    return true
  } catch (error) {
    if (error instanceof SenecaError) {
      throw error
    }
    throw new AuthorizationError('Family access verification failed')
  }
}

// Request validation
export function validateRequestBody<T>(
  request: NextRequest,
  schema: any
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const body = await request.json()
      const result = schema.safeParse(body)
      
      if (!result.success) {
        const errors = result.error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        reject(new ValidationError('Request validation failed', { errors }))
        return
      }
      
      resolve(result.data)
    } catch (error) {
      reject(new ValidationError('Invalid JSON body'))
    }
  })
}

// Query parameter validation
export function validateQueryParams(
  request: NextRequest,
  schema: any
): any {
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())
  
  const result = schema.safeParse(params)
  
  if (!result.success) {
    const errors = result.error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
    
    throw new ValidationError('Query parameter validation failed', { errors })
  }
  
  return result.data
}

// Response helpers
export function createSuccessResponse<T>(
  data: T,
  metadata?: ApiResponse['metadata']
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(metadata && { metadata })
  }
  
  return NextResponse.json(response)
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    metadata: {
      pagination: {
        page,
        limit,
        total
      }
    }
  }
  
  return NextResponse.json(response)
}

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number
  private queriesCount: number = 0

  constructor() {
    this.startTime = Date.now()
  }

  incrementQueryCount() {
    this.queriesCount++
  }

  getMetrics() {
    return {
      execution_time: Date.now() - this.startTime,
      queries_count: this.queriesCount
    }
  }
}

// CORS configuration
export function setCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  const current = rateLimitMap.get(identifier)
  
  if (!current || current.resetTime < now) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

// Request logging
export function logRequest(
  request: NextRequest,
  response?: NextResponse,
  error?: Error
) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    ...(response && { 
      status: response.status,
      statusText: response.statusText 
    }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        ...(error instanceof SenecaError && {
          code: error.code,
          statusCode: error.statusCode
        })
      }
    })
  }

  console.log('🔍 API Request:', JSON.stringify(logData))
}

// API route wrapper with error handling
export function withApiHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const [request] = args as unknown as [NextRequest, ...any[]]
    const monitor = new PerformanceMonitor()
    
    try {
      // Check rate limit
      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      
      if (!checkRateLimit(clientIp)) {
        throw new SenecaError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429)
      }

      // Execute handler
      const response = await handler(...args)
      
      // Add performance metadata
      response.headers.set('X-Response-Time', monitor.getMetrics().execution_time.toString())
      response.headers.set('X-Queries-Count', monitor.getMetrics().queries_count.toString())
      
      // Log successful request
      logRequest(request, response)
      
      return setCORSHeaders(response)
      
    } catch (error) {
      const senecaError = handleError(error, { 
        url: request.url, 
        method: request.method 
      })
      
      // Log error request
      logRequest(request, undefined, senecaError)
      
      return setCORSHeaders(createErrorResponse(senecaError))
    }
  }
}

// Database query wrapper with monitoring
export function withDatabaseQuery<T>(
  query: Promise<T>,
  monitor: PerformanceMonitor
): Promise<T> {
  monitor.incrementQueryCount()
  return query
}

// Helper to extract search params
export function getSearchParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
    keys: () => Array.from(searchParams.keys()),
    values: () => Array.from(searchParams.values()),
    entries: () => Array.from(searchParams.entries()),
    toString: () => searchParams.toString()
  }
}

// Helper to check if request is preflight
export function isPreflight(request: NextRequest): boolean {
  return request.method === 'OPTIONS'
}

// Helper to create preflight response
export function createPreflightResponse(): NextResponse {
  return setCORSHeaders(new NextResponse(null, { status: 200 }))
}

// Type guards
export function isAuthenticatedUser(user: any): user is AuthenticatedUser {
  return user && typeof user.id === 'string' && typeof user.email === 'string'
}

// Constants
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT: 30000,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
} as const