import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server-only/admin-client'

// Service status types - 'pending' and 'not_implemented' are neutral
type ServiceStatus = 'healthy' | 'unhealthy' | 'pending' | 'not_implemented'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  environment: string | undefined
  version: string
  services: {
    database: ServiceStatus
    queue: ServiceStatus
  }
  uptime: number
}

export async function GET() {
  try {
    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'pending',
        queue: 'pending',
      },
      uptime: process.uptime(),
    }

    // Create admin client for health checks
    const adminClient = createAdminClient()

    // Test database connection
    try {
      const { error } = await adminClient.from('families').select('count').limit(1)
      healthCheck.services.database = error ? 'unhealthy' : 'healthy'
    } catch (dbError) {
      healthCheck.services.database = 'unhealthy'
    }

    // Test queue system - only if enabled via environment variable
    if (process.env.ENABLE_QUEUE_HEALTH === 'true') {
      try {
        const { error } = await adminClient.from('queue_jobs').select('count').limit(1)
        healthCheck.services.queue = error ? 'unhealthy' : 'healthy'
      } catch (queueError) {
        healthCheck.services.queue = 'unhealthy'
      }
    } else {
      // Queue health check disabled - table not yet implemented
      healthCheck.services.queue = 'not_implemented'
    }

    // Determine overall health - only 'unhealthy' status counts as failure
    // 'pending' and 'not_implemented' are neutral states
    const hasUnhealthy = Object.values(healthCheck.services).some(
      status => status === 'unhealthy'
    )
    
    const allHealthy = Object.values(healthCheck.services).every(
      status => status === 'healthy'
    )

    // Set overall status based on service health
    if (hasUnhealthy) {
      healthCheck.status = 'unhealthy'
    } else if (!allHealthy) {
      healthCheck.status = 'degraded'
    } else {
      healthCheck.status = 'healthy'
    }

    const statusCode = hasUnhealthy ? 503 : 200

    const response = NextResponse.json(healthCheck, { status: statusCode })
    
    // Prevent caching of health status
    response.headers.set('Cache-Control', 'no-store')
    
    return response

  } catch (error) {
    console.error('Health check error:', error)
    
    const errorResponse = NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        environment: process.env.NODE_ENV,
      },
      { status: 503 }
    )
    
    errorResponse.headers.set('Cache-Control', 'no-store')
    
    return errorResponse
  }
}