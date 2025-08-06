import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server-only/admin-client'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    
    // Get family ID from query params
    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    
    if (!familyId) {
      return NextResponse.json({ error: 'Family ID required' }, { status: 400 })
    }

    // Validate familyId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(familyId)) {
      return NextResponse.json({ error: 'Invalid family ID format' }, { status: 400 })
    }

    // Single query for all metrics to avoid N+1
    const { data, error } = await adminClient.rpc('get_family_metrics', {
      family_id: familyId
    })

    if (error) {
      console.error('Metrics query error:', error)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // Get queue statistics
    const { data: queueStats, error: queueError } = await adminClient.rpc('get_job_statistics')
    
    if (queueError) {
      console.error('Queue stats error:', queueError)
    }

    const metrics = data?.[0] || {
      total_memories: 0,
      total_children: 0,
      total_members: 0,
      pending_ai_jobs: 0,
      completed_ai_jobs: 0,
      failed_ai_jobs: 0
    }

    const queue = queueStats?.[0] || {
      total_jobs: 0,
      pending_jobs: 0,
      processing_jobs: 0,
      completed_jobs: 0,
      failed_jobs: 0,
      avg_processing_time: null
    }

    return NextResponse.json({
      familyId,
      metrics: {
        ...metrics,
        queue_stats: queue
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}