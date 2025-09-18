import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server-only/admin-client";
import { createLogger } from "@/lib/logger";

const log = createLogger({ where: "api.health-simple" });

export async function GET() {
  try {
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: "unknown",
      },
      uptime: process.uptime(),
      connected_to: "remote_supabase",
      project: "ahggunjqfvlmvgycisgc",
    };

    // Create admin client for health checks
    const adminClient = createAdminClient();

    // Test basic database connection
    try {
      const { data, error } = await adminClient
        .from("families")
        .select("count")
        .limit(1);
      healthCheck.services.database = error ? "unhealthy" : "healthy";

      if (!error) {
        healthCheck.status = "healthy";
      }
    } catch (dbError) {
      log.error(dbError, { op: "healthCheck", target: "database" });
      healthCheck.services.database = "unhealthy";
      healthCheck.status = "degraded";
    }

    const statusCode = healthCheck.status === "healthy" ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    log.error(error, { op: "healthCheck" });

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        environment: process.env.NODE_ENV,
        connected_to: "remote_supabase",
        project: "ahggunjqfvlmvgycisgc",
      },
      { status: 503 },
    );
  }
}
