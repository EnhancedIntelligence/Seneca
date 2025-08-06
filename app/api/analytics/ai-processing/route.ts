import { NextRequest } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  authenticateRequest,
  verifyFamilyAccess,
  validateQueryParams,
  createSuccessResponse,
} from "@/lib/api-utils";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { callRPCWithFallback } from "@/lib/database-compatibility";

// Analytics query validation schema
const analyticsQuerySchema = z.object({
  familyId: z.uuid(),
  timeframe: z.enum(["24h", "7d", "30d", "90d", "1y"]).default("30d"),
  metric: z
    .enum(["all", "cost", "processing_time", "success_rate", "milestones"])
    .default("all"),
});

type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/**
 * AI Processing Analytics API
 * Provides detailed analytics about AI processing performance and costs
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  // Authenticate user
  const user = await authenticateRequest(request);

  // Validate query parameters
  const params = validateQueryParams(request, analyticsQuerySchema);

  // Verify family access
  await verifyFamilyAccess(user.id, params.familyId);

  // Get analytics data
  const analytics = await getAIProcessingAnalytics(params);

  return createSuccessResponse({
    analytics,
    timeframe: params.timeframe,
    generated_at: new Date().toISOString(),
    family_id: params.familyId,
  });
});

async function getAIProcessingAnalytics(params: AnalyticsQuery): Promise<{
  summary: any;
  cost_analysis: any;
  performance_metrics: any;
  milestone_detection: any;
  trend_analysis: any;
  recent_processing: any[];
}> {
  const adminClient = createAdminClient();
  const timeframeHours = getTimeframeHours(params.timeframe);
  const cutoffTime = new Date(
    Date.now() - timeframeHours * 60 * 60 * 1000
  ).toISOString();

  try {
    // Get summary statistics using compatibility layer
    const summaryData = await callRPCWithFallback("get_ai_processing_summary", {
      family_id: params.familyId,
      time_cutoff: cutoffTime,
    });

    // Get cost analysis using compatibility layer
    const costData = await callRPCWithFallback("get_ai_cost_analysis", {
      family_id: params.familyId,
      time_cutoff: cutoffTime,
    });

    // Get performance metrics using compatibility layer
    const performanceData = await callRPCWithFallback(
      "get_ai_performance_metrics",
      {
        family_id: params.familyId,
        time_cutoff: cutoffTime,
      }
    );

    // Get milestone detection stats using compatibility layer
    const milestoneData = await callRPCWithFallback(
      "get_milestone_detection_stats",
      {
        family_id: params.familyId,
        time_cutoff: cutoffTime,
      }
    );

    // Get trend analysis using compatibility layer
    const trendData = await callRPCWithFallback("get_ai_processing_trends", {
      family_id: params.familyId,
      time_cutoff: cutoffTime,
      bucket_size: getBucketSize(params.timeframe),
    });

    // Get recent processing jobs
    const { data: recentJobs } = await adminClient
      .from("processing_analytics")
      .select(
        `
        *,
        memory_entries (
          id,
          title,
          content,
          created_at,
          children (
            name
          )
        )
      `
      )
      .eq("memory_entries.family_id", params.familyId)
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      summary: processSummaryData(summaryData),
      cost_analysis: processCostData(costData),
      performance_metrics: processPerformanceData(performanceData),
      milestone_detection: processMilestoneData(milestoneData),
      trend_analysis: processTrendData(trendData),
      recent_processing: processRecentJobs(recentJobs || []),
    };
  } catch (error) {
    console.error("AI analytics error:", error);
    throw error;
  }
}

function getTimeframeHours(timeframe: string): number {
  switch (timeframe) {
    case "24h":
      return 24;
    case "7d":
      return 168;
    case "30d":
      return 720;
    case "90d":
      return 2160;
    case "1y":
      return 8760;
    default:
      return 720;
  }
}

function getBucketSize(timeframe: string): string {
  switch (timeframe) {
    case "24h":
      return "1 hour";
    case "7d":
      return "6 hours";
    case "30d":
      return "1 day";
    case "90d":
      return "3 days";
    case "1y":
      return "1 week";
    default:
      return "1 day";
  }
}

function processSummaryData(data: any): any {
  if (!data || data.length === 0) {
    return {
      total_processed: 0,
      success_rate: 0,
      total_cost: 0,
      avg_processing_time: 0,
      milestones_detected: 0,
    };
  }

  const summary = data[0];
  return {
    total_processed: summary.total_processed || 0,
    success_rate: summary.success_rate || 0,
    total_cost: summary.total_cost || 0,
    avg_processing_time: summary.avg_processing_time || 0,
    milestones_detected: summary.milestones_detected || 0,
    failed_jobs: summary.failed_jobs || 0,
    avg_confidence_score: summary.avg_confidence_score || 0,
  };
}

function processCostData(data: any): any {
  if (!data || data.length === 0) {
    return {
      total_cost: 0,
      cost_per_memory: 0,
      cost_breakdown: {},
      projected_monthly_cost: 0,
    };
  }

  const cost = data[0];
  return {
    total_cost: cost.total_cost || 0,
    cost_per_memory: cost.cost_per_memory || 0,
    cost_breakdown: {
      gpt4_analysis: cost.gpt4_cost || 0,
      embeddings: cost.embedding_cost || 0,
      other: cost.other_costs || 0,
    },
    projected_monthly_cost: cost.projected_monthly_cost || 0,
  };
}

function processPerformanceData(data: any): any {
  if (!data || data.length === 0) {
    return {
      avg_processing_time: 0,
      min_processing_time: 0,
      max_processing_time: 0,
      p95_processing_time: 0,
      throughput_per_hour: 0,
    };
  }

  const perf = data[0];
  return {
    avg_processing_time: perf.avg_processing_time || 0,
    min_processing_time: perf.min_processing_time || 0,
    max_processing_time: perf.max_processing_time || 0,
    p95_processing_time: perf.p95_processing_time || 0,
    throughput_per_hour: perf.throughput_per_hour || 0,
  };
}

function processMilestoneData(data: any): any {
  if (!data || data.length === 0) {
    return {
      total_milestones: 0,
      milestone_rate: 0,
      milestone_categories: {},
    };
  }

  const milestones = data[0];
  return {
    total_milestones: milestones.total_milestones || 0,
    milestone_rate: milestones.milestone_rate || 0,
    milestone_categories: milestones.milestone_categories || {},
  };
}

function processTrendData(data: any): any {
  if (!data || data.length === 0) {
    return {
      processing_volume: [],
      cost_trend: [],
      performance_trend: [],
    };
  }

  return {
    processing_volume: data.map((d: any) => ({
      time: d.time_bucket,
      count: d.processing_count || 0,
      success_rate: d.success_rate || 0,
    })),
    cost_trend: data.map((d: any) => ({
      time: d.time_bucket,
      cost: d.total_cost || 0,
    })),
    performance_trend: data.map((d: any) => ({
      time: d.time_bucket,
      avg_time: d.avg_processing_time || 0,
    })),
  };
}

function processRecentJobs(jobs: any[]): any[] {
  return jobs.map((job) => ({
    id: job.id,
    memory_id: job.memory_id,
    memory_title: job.memory_entries?.title || "Untitled Memory",
    child_name: job.memory_entries?.children?.name || "No child specified",
    processing_time: job.processing_time_ms,
    cost: job.cost_usd,
    success: job.success,
    model_used: job.model_used,
    confidence_score: job.confidence_score,
    milestone_detected: job.milestone_detected,
    created_at: job.created_at,
    error_message: job.error_message,
  }));
}
