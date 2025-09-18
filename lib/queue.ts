import { createAdminClient } from "./server-only/admin-client";
import type { QueueJob, QueueJobInsert, Json } from "./types";
import type { Database } from "./database.generated";
import type { JobStatus } from "./database";
import {
  DatabaseError,
  ProcessingError,
  handleDatabaseError,
  handleError,
} from "./errors";
import { callRPCWithFallback } from "./database-compatibility";
export type JobType = string;

// Priority helper functions
const PRIORITY_MAP = {
  low: 1,
  normal: 2,
  high: 3,
} as const;

type PriorityLevel = keyof typeof PRIORITY_MAP;

function priorityToNumber(priority: PriorityLevel | number = "normal"): number {
  return typeof priority === "number" ? priority : PRIORITY_MAP[priority];
}

export interface QueueJobPayload {
  memoryId: string;
  familyId: string;
  priority?: number;
  processingOptions?: {
    generateEmbedding?: boolean;
    detectMilestones?: boolean;
    analyzeSentiment?: boolean;
    generateInsights?: boolean;
  };
  [key: string]: Json | undefined; // Index signature for Json compatibility
}

export interface QueueStats {
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_processing_time: string | null;
  queue_health: "healthy" | "degraded" | "critical";
}

export interface ProcessingJob extends QueueJob {
  payload: QueueJobPayload;
}

export class MemoryQueue {
  private adminClient = createAdminClient();
  private workerId = `worker-${process.pid}-${Date.now()}`;

  async addJob(
    memoryId: string,
    familyId: string,
    options: {
      priority?: PriorityLevel | number;
      processingOptions?: QueueJobPayload["processingOptions"];
    } = {},
  ): Promise<string> {
    try {
      const priorityValue = priorityToNumber(options.priority || "normal");

      const payload: QueueJobPayload = {
        memoryId,
        familyId,
        priority: priorityValue,
        processingOptions: {
          generateEmbedding: true,
          detectMilestones: true,
          analyzeSentiment: true,
          generateInsights: true,
          ...options.processingOptions,
        },
      };

      const { data, error } = await this.adminClient
        .from("queue_jobs")
        .insert({
          type: "process_memory",
          payload,
          status: "queued" as JobStatus,
          attempts: 0,
          max_attempts: 3,
          priority: priorityValue,
        })
        .select("id")
        .single();

      if (error) {
        handleDatabaseError(error, "add job to queue");
      }

      console.log(`Added job ${data.id} to queue for memory ${memoryId}`);
      return data.id;
    } catch (error) {
      throw handleError(error, { memoryId, familyId });
    }
  }

  async processNextJob(): Promise<ProcessingJob | null> {
    try {
      // Use compatibility layer for atomic job locking
      const data = await callRPCWithFallback("get_next_job_and_lock", {
        worker_id: this.workerId,
      });

      if (!data || data.length === 0) {
        return null;
      }

      const job = data[0];

      return {
        id: job.id,
        type: job.type,
        payload: job.payload,
        status: job.status,
        attempts: job.attempts,
        max_attempts: job.max_attempts,
        created_at: job.created_at,
        updated_at: job.updated_at || new Date().toISOString(),
        scheduled_for: job.scheduled_for,
        error_message: job.error_message,
        completed_at: job.completed_at,
        priority: job.priority || "normal",
        locked_at: job.locked_at,
        locked_by: job.locked_by,
      };
    } catch (error) {
      console.error("Error processing next job:", error);
      return null;
    }
  }

  async completeJob(jobId: string): Promise<void> {
    const { error } = await this.adminClient
      .from("queue_jobs")
      .update({
        status: "completed" as JobStatus,
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Failed to mark job as completed:", error);
      throw new Error("Failed to complete job");
    }
  }

  async failJob(jobId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await this.adminClient.rpc("handle_job_failure", {
        p_job_id: jobId,
        p_error: errorMessage,
      });

      if (error) {
        console.error("Failed to handle job failure:", error);
        throw new Error("Failed to handle job failure");
      }
    } catch (error) {
      console.error("Error handling job failure:", error);
      throw new Error("Failed to handle job failure");
    }
  }

  async retryFailedJob(jobId: string): Promise<boolean> {
    try {
      const data = await callRPCWithFallback("retry_failed_job", {
        job_id: jobId,
      });
      return Boolean(data);
    } catch (error) {
      console.error("Error retrying failed job:", error);
      return false;
    }
  }

  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    const { data, error } = await this.adminClient
      .from("queue_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      console.error("Failed to get job status:", error);
      return null;
    }

    return data;
  }

  async getQueueStats(): Promise<QueueStats> {
    try {
      const { data, error } = await this.adminClient.rpc("get_job_statistics");

      if (error) {
        console.error("Failed to get queue stats:", error);
        return {
          total_jobs: 0,
          pending_jobs: 0,
          processing_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
          avg_processing_time: null,
          queue_health: "critical",
        };
      }

      const rawStats = data?.[0] || {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };

      // Map RPC response to QueueStats interface
      const stats = {
        total_jobs:
          rawStats.pending +
          rawStats.processing +
          rawStats.completed +
          rawStats.failed +
          rawStats.delayed,
        pending_jobs: rawStats.pending,
        processing_jobs: rawStats.processing,
        completed_jobs: rawStats.completed,
        failed_jobs: rawStats.failed,
        avg_processing_time: null, // Not provided by the RPC
      };

      return {
        ...stats,
        queue_health: this.calculateQueueHealth(stats),
      };
    } catch (error) {
      console.error("Error getting queue stats:", error);
      return {
        total_jobs: 0,
        pending_jobs: 0,
        processing_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
        avg_processing_time: null,
        queue_health: "critical",
      };
    }
  }

  private calculateQueueHealth(
    stats: any,
  ): "healthy" | "degraded" | "critical" {
    const failureRate =
      stats.total_jobs > 0 ? stats.failed_jobs / stats.total_jobs : 0;
    const pendingBacklog = stats.pending_jobs;

    if (failureRate > 0.2 || pendingBacklog > 100) {
      return "critical";
    } else if (failureRate > 0.1 || pendingBacklog > 50) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await this.adminClient
      .from("queue_jobs")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .in("status", ["completed", "failed"])
      .select("id");

    if (error) {
      console.error("Failed to cleanup old jobs:", error);
      return 0;
    }

    return data?.length || 0;
  }

  async getFailedJobs(limit = 50): Promise<any[]> {
    try {
      const data = await callRPCWithFallback("get_failed_jobs", {
        limit_count: limit,
      });
      return data || [];
    } catch (error) {
      console.error("Error getting failed jobs:", error);
      return [];
    }
  }

  async cleanupStuckJobs(): Promise<number> {
    try {
      const data = await callRPCWithFallback("cleanup_stuck_jobs", {});
      return typeof data === "number" ? data : 0;
    } catch (error) {
      console.error("Error cleaning up stuck jobs:", error);
      return 0;
    }
  }
}
