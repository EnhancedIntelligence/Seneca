/**
 * Queue Statistics Route Handler
 * Provides insights into memory processing queue status
 */

import { NextRequest } from "next/server";
import { ok, err } from "@/lib/server/api";
import { requireUser, requireFamilyAccess } from "@/lib/server/auth";
import { ValidationError } from "@/lib/server/errors";
import { MemoryQueue } from "@/lib/queue";

/**
 * GET /api/queue-stats
 * Get queue statistics for a family's memory processing
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("familyId");

    if (!familyId) {
      throw new ValidationError("familyId parameter is required");
    }

    // Verify user has access to this family
    await requireFamilyAccess(user.id, familyId);

    // Get queue statistics
    const queue = new MemoryQueue();
    const stats = await queue.getQueueStats();

    return ok({
      familyId,
      queueStats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return err(error);
  }
}
