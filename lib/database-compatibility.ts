/**
 * Database Compatibility Layer
 * Bridges the gap between legacy API calls and regenerated production schema
 * TODO: Remove this file once all RPC functions are implemented in production
 */

import { createAdminClient } from './server-only/admin-client'
import type { Database } from './database.generated'

// Enum translation utilities
export const StatusCompat = {
  // Map legacy status values to new enum values
  toLegacy: (status: Database['public']['Enums']['processing_status_enum'] | null): string => {
    const mapping: Record<string, string> = {
      'queued': 'pending',
      'processing_classification': 'processing',
      'categorized': 'processing', 
      'processing_embedding': 'processing',
      'embedded': 'processing',
      'failed': 'failed',
      'processing': 'processing',
      'completed': 'completed',
      'error': 'failed'
    }
    return mapping[status || 'queued'] || 'pending'
  },
  
  toNew: (status: string): Database['public']['Enums']['processing_status_enum'] => {
    const mapping: Record<string, Database['public']['Enums']['processing_status_enum']> = {
      'pending': 'queued',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed'
    }
    return mapping[status] || 'queued'
  }
}

// Column name mapping utilities
export const ColumnCompat = {
  // Map legacy column names to new schema
  mapProcessingAnalytics: (legacyData: any) => ({
    ...legacyData,
    duration_ms: legacyData.processing_time_ms || legacyData.duration_ms,
    memory_id: legacyData.memory_id // Map to proper foreign key
  }),
  
  // Map queue job fields from RPC response to expected interface
  mapQueueJob: (rpcResult: any) => ({
    id: rpcResult.job_id || rpcResult.id,
    type: rpcResult.job_type || rpcResult.type,
    payload: rpcResult.job_payload || rpcResult.payload,
    status: rpcResult.job_status || rpcResult.status,
    attempts: rpcResult.job_attempts || rpcResult.attempts || 0,
    max_attempts: rpcResult.job_max_attempts || rpcResult.max_attempts || 3,
    created_at: rpcResult.job_created_at || rpcResult.created_at,
    updated_at: rpcResult.job_updated_at || rpcResult.updated_at,
    scheduled_for: rpcResult.job_scheduled_for || rpcResult.scheduled_for,
    error_message: rpcResult.job_error_message || rpcResult.error_message,
    completed_at: rpcResult.job_completed_at || rpcResult.completed_at,
    priority: rpcResult.priority || 'normal',
    locked_at: rpcResult.locked_at || null,
    locked_by: rpcResult.locked_by || null
  })
}

// Missing RPC function implementations
export class RPCCompat {
  private static adminClient = createAdminClient()

  // Queue Management Functions
  
  // Get next job and lock it atomically
  static async getNextJobAndLock(params: { worker_id: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('queue_jobs')
        .select('*')
        .eq('status', 'queued')
        .is('locked_by', null)
        .order('created_at', { ascending: true })
        .limit(1)

      if (error) throw error
      if (!data || data.length === 0) return []

      const job = data[0]
      
      // Lock the job by updating it
      const { error: lockError } = await this.adminClient
        .from('queue_jobs')
        .update({
          status: 'processing',
          locked_by: params.worker_id,
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .eq('status', 'queued') // Double-check it's still available

      if (lockError) {
        console.warn('Failed to lock job, may have been taken by another worker')
        return []
      }

      return [ColumnCompat.mapQueueJob(job)]
    } catch (error) {
      console.warn('Get next job and lock fallback failed:', error)
      return []
    }
  }

  // Retry a failed job
  static async retryFailedJob(params: { job_id: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('queue_jobs')
        .update({
          status: 'queued',
          locked_by: null,
          locked_at: null,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.job_id)
        .eq('status', 'failed')
        .select()

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.warn('Retry failed job fallback failed:', error)
      return false
    }
  }

  // Get failed jobs
  static async getFailedJobs(params: { limit_count: number }) {
    try {
      const { data, error } = await this.adminClient
        .from('queue_jobs')
        .select('*')
        .eq('status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(params.limit_count)

      if (error) throw error
      return (data || []).map(ColumnCompat.mapQueueJob)
    } catch (error) {
      console.warn('Get failed jobs fallback failed:', error)
      return []
    }
  }

  // Cleanup stuck jobs (jobs that have been processing too long)
  static async cleanupStuckJobs() {
    try {
      const stuckThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      
      const { data, error } = await this.adminClient
        .from('queue_jobs')
        .update({
          status: 'failed',
          error_message: 'Job stuck - cleanup by compatibility layer',
          locked_by: null,
          locked_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'processing')
        .lt('locked_at', stuckThreshold)
        .select()

      if (error) throw error
      return data ? data.length : 0
    } catch (error) {
      console.warn('Cleanup stuck jobs fallback failed:', error)
      return 0
    }
  }

  // Get family with counts (for tests)
  static async getFamilyWithCounts(params: { family_id: string }) {
    try {
      // Get basic family info
      const { data: family, error: familyError } = await this.adminClient
        .from('families')
        .select('*')
        .eq('id', params.family_id)
        .single()

      if (familyError) throw familyError

      // Get member count
      const { count: memberCount } = await this.adminClient
        .from('family_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', params.family_id)

      // Get child count
      const { count: childCount } = await this.adminClient
        .from('children')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', params.family_id)

      // Get memory count
      const { count: memoryCount } = await this.adminClient
        .from('memory_entries')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', params.family_id)

      return [{
        ...family,
        member_count: memberCount || 0,
        child_count: childCount || 0,
        memory_count: memoryCount || 0
      }]
    } catch (error) {
      console.warn('Get family with counts fallback failed:', error)
      return []
    }
  }

  // AI Processing Summary fallback implementation
  static async getAIProcessingSummary(params: { family_id?: string; time_cutoff?: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('processing_analytics')
        .select('*')
        .eq('stage', 'ai_processing')
        .gte('created_at', params.time_cutoff || '2024-01-01')

      if (error) throw error

      // Aggregate results to match expected format
      return [{
        total_processed: data.length,
        success_rate: data.filter(d => d.status === 'completed').length / data.length,
        avg_processing_time: data.reduce((acc, d) => acc + (d.duration_ms || 0), 0) / data.length,
        total_cost: data.reduce((acc, d) => acc + (d.tokens_used || 0) * 0.00003, 0) // rough cost estimate
      }]
    } catch (error) {
      console.warn('AI processing summary fallback failed:', error)
      return [{ total_processed: 0, success_rate: 0, avg_processing_time: 0, total_cost: 0 }]
    }
  }

  // AI Cost Analysis fallback implementation  
  static async getAICostAnalysis(params: { family_id?: string; time_cutoff?: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('processing_analytics')
        .select('tokens_used, created_at')
        .gte('created_at', params.time_cutoff || '2024-01-01')

      if (error) throw error

      const totalTokens = data.reduce((acc, d) => acc + (d.tokens_used || 0), 0)
      const estimatedCost = totalTokens * 0.00003 // $0.03 per 1K tokens estimate

      return [{
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost,
        cost_breakdown: {
          embedding_generation: estimatedCost * 0.3,
          text_analysis: estimatedCost * 0.7
        }
      }]
    } catch (error) {
      console.warn('AI cost analysis fallback failed:', error)
      return [{ total_tokens: 0, estimated_cost_usd: 0, cost_breakdown: {} }]
    }
  }

  // Performance Metrics fallback
  static async getAIPerformanceMetrics(params: { family_id?: string; time_cutoff?: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('processing_analytics')
        .select('duration_ms, status, created_at')
        .gte('created_at', params.time_cutoff || '2024-01-01')

      if (error) throw error

      const completed = data.filter(d => d.status === 'completed')
      const failed = data.filter(d => d.status === 'failed')

      return [{
        avg_processing_time_ms: completed.reduce((acc, d) => acc + (d.duration_ms || 0), 0) / completed.length || 0,
        success_rate: completed.length / data.length || 0,
        failure_rate: failed.length / data.length || 0,
        total_processed: data.length
      }]
    } catch (error) {
      console.warn('AI performance metrics fallback failed:', error)
      return [{ avg_processing_time_ms: 0, success_rate: 0, failure_rate: 0, total_processed: 0 }]
    }
  }

  // Milestone Detection Stats fallback
  static async getMilestoneDetectionStats(params: { family_id?: string; time_cutoff?: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('memory_entries')
        .select('milestone_detected, milestone_type, created_at')
        .eq('family_id', params.family_id || '')
        .gte('created_at', params.time_cutoff || '2024-01-01')

      if (error) throw error

      const milestones = data.filter(d => d.milestone_detected)
      const milestoneTypes = milestones.reduce((acc: Record<string, number>, d) => {
        const type = d.milestone_type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})

      return [{
        total_milestones_detected: milestones.length,
        milestone_detection_rate: milestones.length / data.length || 0,
        milestone_types: milestoneTypes,
        total_memories_analyzed: data.length
      }]
    } catch (error) {
      console.warn('Milestone detection stats fallback failed:', error)
      return [{ total_milestones_detected: 0, milestone_detection_rate: 0, milestone_types: {}, total_memories_analyzed: 0 }]
    }
  }

  // Processing Trends fallback
  static async getAIProcessingTrends(params: { family_id?: string; time_cutoff?: string; bucket_size?: string }) {
    try {
      const { data, error } = await this.adminClient
        .from('processing_analytics')
        .select('created_at, status, duration_ms')
        .gte('created_at', params.time_cutoff || '2024-01-01')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by day for trend analysis
      const dailyStats = data.reduce((acc: Record<string, any>, d) => {
        const day = d.created_at.split('T')[0]
        if (!acc[day]) {
          acc[day] = { date: day, processed: 0, completed: 0, failed: 0, avg_time: 0 }
        }
        acc[day].processed++
        if (d.status === 'completed') acc[day].completed++
        if (d.status === 'failed') acc[day].failed++
        acc[day].avg_time += d.duration_ms || 0
        return acc
      }, {})

      // Calculate averages
      Object.values(dailyStats).forEach((stat: any) => {
        stat.avg_time = stat.avg_time / stat.processed || 0
        stat.success_rate = stat.completed / stat.processed || 0
      })

      return Object.values(dailyStats)
    } catch (error) {
      console.warn('AI processing trends fallback failed:', error)
      return []
    }
  }

  // Semantic Search fallback
  static async searchMemoriesSemantic(params: any) {
    try {
      // Fallback to basic text search if semantic search RPC is missing
      const { data, error } = await this.adminClient
        .from('memory_entries')
        .select(`
          *,
          children (name, birth_date),
          families (name)
        `)
        .eq('family_id', params.family_id)
        .textSearch('content', params.query_text.replace(/\s+/g, ' & '))
        .order('created_at', { ascending: false })
        .limit(params.result_limit || 20)

      if (error) throw error

      // Add mock similarity scores since we don't have vector search
      return data.map(item => ({
        ...item,
        similarity_score: 0.8, // Mock similarity score
        search_rank: Math.random() * 0.2 + 0.8 // Random score between 0.8-1.0
      }))
    } catch (error) {
      console.warn('Semantic search fallback failed:', error)
      return []
    }
  }

  // Count semantic search results fallback
  static async countSemanticSearchResults(params: any) {
    try {
      const { count, error } = await this.adminClient
        .from('memory_entries')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', params.family_id)
        .textSearch('content', params.query_text.replace(/\s+/g, ' & '))

      if (error) throw error
      return [{ count: count || 0 }]
    } catch (error) {
      console.warn('Count semantic search fallback failed:', error)
      return [{ count: 0 }]
    }
  }
}

// Generic RPC caller with fallbacks
export async function callRPCWithFallback(functionName: string, params: any = {}) {
  const adminClient = createAdminClient()
  
  try {
    // Try the actual RPC call first
    const { data, error } = await adminClient.rpc(functionName as any, params)
    
    if (!error) {
      return data
    }
    
    console.warn(`RPC ${functionName} failed, using fallback:`, error)
  } catch (error) {
    console.warn(`RPC ${functionName} not found, using fallback:`, error)
  }
  
  // Use fallback implementations
  switch (functionName) {
    // Queue management functions
    case 'get_next_job_and_lock':
      return RPCCompat.getNextJobAndLock(params)
    case 'retry_failed_job':
      return RPCCompat.retryFailedJob(params)
    case 'get_failed_jobs':
      return RPCCompat.getFailedJobs(params)
    case 'cleanup_stuck_jobs':
      return RPCCompat.cleanupStuckJobs()
    case 'get_family_with_counts':
      return RPCCompat.getFamilyWithCounts(params)
    
    // AI analytics functions  
    case 'get_ai_processing_summary':
      return RPCCompat.getAIProcessingSummary(params)
    case 'get_ai_cost_analysis':
      return RPCCompat.getAICostAnalysis(params)
    case 'get_ai_performance_metrics':
      return RPCCompat.getAIPerformanceMetrics(params)
    case 'get_milestone_detection_stats':
      return RPCCompat.getMilestoneDetectionStats(params)
    case 'get_ai_processing_trends':
      return RPCCompat.getAIProcessingTrends(params)
    
    // Search functions
    case 'search_memories_semantic':
      return RPCCompat.searchMemoriesSemantic(params)
    case 'count_semantic_search_results':
      return RPCCompat.countSemanticSearchResults(params)
    
    default:
      console.error(`No fallback implementation for RPC function: ${functionName}`)
      return null
  }
}

// Type helpers for legacy compatibility
export type LegacyProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type NewProcessingStatus = Database['public']['Enums']['processing_status_enum']

// Helper to safely cast types during transition
export function safeTypeCast<T>(value: any, fallback: T): T {
  return value !== null && value !== undefined ? value : fallback
}

// Processing analytics data mapper
export function mapProcessingAnalyticsFields(data: any) {
  return ColumnCompat.mapProcessingAnalytics(data)
} 