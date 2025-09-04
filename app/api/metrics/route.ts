import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("familyId");

    // Validate familyId format if provided
    if (
      familyId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        familyId,
      )
    ) {
      const errorRes = NextResponse.json(
        { error: "Invalid family ID format" },
        { status: 400 },
      );
      errorRes.headers.set("Cache-Control", "no-store");
      errorRes.headers.set("Vary", "Cookie, Authorization");
      return errorRes;
    }

    // TODO: Implement actual metrics queries when needed
    // For now, return mock metrics to keep the build working
    // Future: Either use direct queries or create SQL functions

    const mockMetrics = {
      mocked: true, // Signal this is demo data
      ttlSeconds: 30, // Suggested polling interval
      familyId,
      metrics: {
        total_memories: 0,
        total_children: familyId ? 2 : 0,
        total_members: familyId ? 1 : 0,
        pending_ai_jobs: 0,
        completed_ai_jobs: 0,
        failed_ai_jobs: 0,
        queue_stats: {
          total_jobs: 0,
          pending_jobs: 0,
          processing_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
          avg_processing_time: null,
        },
      },
      timestamp: new Date().toISOString(),
    };

    const res = NextResponse.json(mockMetrics);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Vary", "Cookie, Authorization");
    return res;
  } catch (error) {
    console.error("Metrics error:", error);
    const errorRes = NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
    errorRes.headers.set("Cache-Control", "no-store");
    errorRes.headers.set("Vary", "Cookie, Authorization");
    return errorRes;
  }
}
