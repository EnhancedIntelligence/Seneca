import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server-only/admin-client'

export async function GET() {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unknown',
        queue: 'unknown',
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

    // Test queue system
    try {
      const { error } = await adminClient.from('queue_jobs').select('count').limit(1)
      healthCheck.services.queue = error ? 'unhealthy' : 'healthy'
    } catch (queueError) {
      healthCheck.services.queue = 'unhealthy'
    }

    // Determine overall health
    const isHealthy = Object.values(healthCheck.services).every(
      status => status === 'healthy'
    )

    if (!isHealthy) {
      healthCheck.status = 'degraded'
    }

    const statusCode = isHealthy ? 200 : 503

    return NextResponse.json(healthCheck, { status: statusCode })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        environment: process.env.NODE_ENV,
      },
      { status: 503 }
    )
  }
}