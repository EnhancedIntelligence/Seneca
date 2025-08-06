import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MemoryQueue } from '@/lib/queue'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')

    if (!familyId) {
      return NextResponse.json(
        { error: 'familyId parameter is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this family
    const { data: membership, error: membershipError } = await supabase
      .from('family_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied to this family' },
        { status: 403 }
      )
    }

    // Get memory processing stats for this family
    const { data: memoryStats, error: memoryError } = await supabase
      .from('memory_entries')
      .select('processing_status')
      .eq('family_id', familyId)

    if (memoryError) {
      console.error('Memory stats error:', memoryError)
      return NextResponse.json(
        { error: 'Failed to fetch memory stats' },
        { status: 500 }
      )
    }

    // Count memories by status
    const memoryStatusCounts = (memoryStats || []).reduce((acc, memory) => {
      const status = memory.processing_status
      if (status) {
        acc[status] = (acc[status] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Get queue jobs for this family
    const { data: queueJobs, error: queueError } = await supabase
      .from('queue_jobs')
      .select('status, created_at, payload')
      .contains('payload', { familyId })

    if (queueError) {
      console.error('Queue stats error:', queueError)
      // Don't fail the request if queue stats can't be fetched
    }

    // Count queue jobs by status
    const queueStatusCounts = (queueJobs || []).reduce((acc, job) => {
      const status = job.status
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate processing queue wait time
    const pendingJobs = (queueJobs || []).filter(job => job.status === 'queued')
    const avgWaitTime = pendingJobs.length > 0 
      ? pendingJobs.reduce((sum, job) => {
          const waitTime = Date.now() - new Date(job.created_at).getTime()
          return sum + waitTime
        }, 0) / pendingJobs.length / 1000 / 60 // Convert to minutes
      : 0

    return NextResponse.json({
      success: true,
      stats: {
        memoryStats: {
          total: memoryStats?.length || 0,
          queued: memoryStatusCounts.queued || 0,
          processing: memoryStatusCounts.processing || 0,
          completed: memoryStatusCounts.completed || 0,
          failed: memoryStatusCounts.failed || 0,
        },
        queueStats: {
          total: queueJobs?.length || 0,
          queued: queueStatusCounts.queued || 0,
          processing: queueStatusCounts.processing || 0,
          completed: queueStatusCounts.completed || 0,
          failed: queueStatusCounts.failed || 0,
          avgWaitTimeMinutes: Math.round(avgWaitTime),
        },
        milestones: {
          detected: (memoryStats || []).filter(m => 
            m.processing_status === 'completed' && 
            // Add milestone_detected check when column exists
            false
          ).length,
        },
      },
    })

  } catch (error) {
    console.error('Queue stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}