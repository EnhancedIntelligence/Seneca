import { NextRequest, NextResponse } from "next/server";
import { MemoryQueue } from "@/lib/queue";
import { processMemoryWithAI } from "@/lib/ai-processor";
import {
  withApiHandler,
  authenticateInternalRequest,
  createSuccessResponse,
} from "@/lib/api-utils";

// This endpoint should be called by a cron job or background worker
export const POST = withApiHandler(async (request: NextRequest) => {
  // Authenticate internal API request
  authenticateInternalRequest(request);

  const queue = new MemoryQueue();
  const job = await queue.processNextJob();

  if (!job) {
    return createSuccessResponse({
      message: "No jobs to process",
      processedJob: null,
    });
  }

  try {
    // Process the memory with AI
    await processMemoryWithAI(job.payload.memoryId);

    // Mark job as completed
    await queue.completeJob(job.id);

    return createSuccessResponse({
      message: "Job processed successfully",
      processedJob: {
        id: job.id,
        memoryId: job.payload.memoryId,
        attempts: job.attempts,
      },
    });
  } catch (processingError) {
    console.error("Job processing failed:", processingError);

    const errorMessage =
      processingError instanceof Error
        ? processingError.message
        : "Unknown processing error";

    // Mark job as failed
    await queue.failJob(job.id, errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Job processing failed",
        processedJob: {
          id: job.id,
          memoryId: job.payload.memoryId,
          attempts: job.attempts,
          error: errorMessage,
        },
      },
      { status: 500 },
    );
  }
});

// Get queue processing status
export const GET = withApiHandler(async (request: NextRequest) => {
  // Authenticate internal API request
  authenticateInternalRequest(request);

  const queue = new MemoryQueue();
  const stats = await queue.getQueueStats();

  return createSuccessResponse({
    stats,
  });
});

// Retry failed jobs
export const PATCH = withApiHandler(async (request: NextRequest) => {
  // Authenticate internal API request
  authenticateInternalRequest(request);

  const queue = new MemoryQueue();

  // Get failed jobs first
  const failedJobs = await queue.getFailedJobs();
  let retriedCount = 0;

  // Retry each failed job
  for (const job of failedJobs) {
    try {
      const success = await queue.retryFailedJob(job.id);
      if (success) {
        retriedCount++;
      }
    } catch (error) {
      console.error(`Failed to retry job ${job.id}:`, error);
    }
  }

  return createSuccessResponse({
    message: `Retried ${retriedCount} failed jobs`,
    retriedCount,
    totalFailedJobs: failedJobs.length,
  });
});
