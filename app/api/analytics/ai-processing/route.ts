/* eslint-disable @typescript-eslint/naming-convention */
/**
 * AI Processing Analytics Route Handler
 * Provides insights into AI processing performance and costs
 */

import { NextRequest } from "next/server";
import { ok, err } from "@/lib/server/api";
import { requireUser, requireFamilyAccess } from "@/lib/server/auth";
import { ValidationError } from "@/lib/server/errors";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { callRPCWithFallback } from "@/lib/database-compatibility";
import { z } from "zod";

// Analytics query validation schema
const analyticsQuerySchema = z.object({
  familyId: z.string().uuid(),
  timeframe: z.enum(["24h", "7d", "30d", "90d", "1y"]).default("30d"),
  metric: z
    .enum(["all", "cost", "processing_time", "success_rate", "milestones"])
    .default("all"),
});

type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/**
 * GET /api/analytics/ai-processing
 * Get AI processing analytics for a family
 * Rate limited to prevent expensive queries
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    // Rate limit expensive analytics queries
    await checkRateLimit(`${user.id}:ai-analytics`);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("familyId");
    const timeframe = searchParams.get("timeframe") || "30d";
    const metric = searchParams.get("metric") || "all";

    if (!familyId) {
      throw new ValidationError("familyId parameter is required");
    }

    const params = analyticsQuerySchema.parse({
      familyId,
      timeframe,
      metric,
    });

    // Verify user has access to this family
    await requireFamilyAccess(user.id, params.familyId);

    // Get analytics data
    const analytics = await getAIProcessingAnalytics(params);

    return ok({
      analytics,
      timeframe: params.timeframe,
      metric: params.metric,
      generated_at: new Date().toISOString(),
      family_id: params.familyId,
    });
  } catch (error) {
    return err(error);
  }
}

/**
 * Fetch AI processing analytics from database
 */
async function getAIProcessingAnalytics(params: AnalyticsQuery): Promise<{
  summary: any;
  recent_processing: any[];
  cost_analysis: any;
  performance_metrics: any;
  milestone_detection: any;
  trend_analysis: any;
}> {
  const adminClient = createAdminClient();

  // Calculate time cutoff based on timeframe
  const now = new Date();
  const timeCutoff = new Date();

  switch (params.timeframe) {
    case "24h":
      timeCutoff.setHours(now.getHours() - 24);
      break;
    case "7d":
      timeCutoff.setDate(now.getDate() - 7);
      break;
    case "30d":
      timeCutoff.setDate(now.getDate() - 30);
      break;
    case "90d":
      timeCutoff.setDate(now.getDate() - 90);
      break;
    case "1y":
      timeCutoff.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Get processing statistics
  const { data: processingStats } = await adminClient
    .from("memory_entries")
    .select("processing_status, milestone_detected, created_at, updated_at")
    .eq("family_id", params.familyId)
    .gte("created_at", timeCutoff.toISOString());

  // Calculate metrics
  const totalProcessed = processingStats?.length || 0;
  const successfulProcessing =
    processingStats?.filter((m) => m.processing_status === "completed")
      .length || 0;
  const milestonesDetected =
    processingStats?.filter((m) => m.milestone_detected).length || 0;

  // Get recent processing for detailed view
  const { data: recentProcessing } = await adminClient
    .from("memory_entries")
    .select("id, title, processing_status, milestone_type, created_at")
    .eq("family_id", params.familyId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Mock cost analysis (would be calculated from actual usage)
  const costAnalysis = {
    total_tokens_used: totalProcessed * 500, // Mock estimate
    estimated_cost: totalProcessed * 0.002, // Mock cost
    cost_by_feature: {
      embeddings: totalProcessed * 0.0005,
      milestone_detection: totalProcessed * 0.001,
      sentiment_analysis: totalProcessed * 0.0005,
    },
  };

  // Performance metrics
  const performanceMetrics = {
    average_processing_time: "2.3s", // Would be calculated from actual data
    success_rate:
      totalProcessed > 0
        ? ((successfulProcessing / totalProcessed) * 100).toFixed(1) + "%"
        : "0%",
    queue_depth: 0, // Would come from queue stats
  };

  // Milestone detection stats
  const milestoneDetection = {
    total_detected: milestonesDetected,
    detection_rate:
      totalProcessed > 0
        ? ((milestonesDetected / totalProcessed) * 100).toFixed(1) + "%"
        : "0%",
    types_detected: [], // Would aggregate from actual data
  };

  // Trend analysis
  const trendAnalysis = {
    processing_volume_trend: "stable", // Would be calculated
    cost_trend: "stable",
    performance_trend: "improving",
  };

  return {
    summary: {
      total_processed: totalProcessed,
      successful_processing: successfulProcessing,
      milestones_detected: milestonesDetected,
      timeframe: params.timeframe,
    },
    recent_processing: recentProcessing || [],
    cost_analysis: costAnalysis,
    performance_metrics: performanceMetrics,
    milestone_detection: milestoneDetection,
    trend_analysis: trendAnalysis,
  };
}
