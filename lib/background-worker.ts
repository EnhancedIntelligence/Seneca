/**
 * Background Processing Worker System
 * Handles AI processing jobs in the background with proper error handling and monitoring
 */

import { MemoryQueue, ProcessingJob } from "./queue";
import { aiProcessor } from "./ai-processor";
import { createAdminClient } from "./server-only/admin-client";
import { ProcessingError, handleError, errorLogger } from "./errors";
import { createLogger } from "@/lib/logger";
const log = createLogger({ where: "lib.background-worker" });

export interface WorkerConfig {
  maxConcurrentJobs: number;
  processingTimeout: number;
  retryDelay: number;
  healthCheckInterval: number;
  shutdownTimeout: number;
}

export interface WorkerStats {
  worker_id: string;
  status: "idle" | "processing" | "stopping" | "stopped";
  jobs_processed: number;
  jobs_failed: number;
  current_jobs: number;
  uptime: number;
  last_activity: string;
}

export class BackgroundWorker {
  private workerId: string;
  private queue: MemoryQueue;
  private adminClient = createAdminClient();
  private isRunning = false;
  private currentJobs = new Map<string, ProcessingJob>();
  private stats: WorkerStats;
  private config: WorkerConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private shutdownPromise?: Promise<void>;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.workerId = `seneca-worker-${process.pid}-${Date.now()}`;
    this.queue = new MemoryQueue();

    this.config = {
      maxConcurrentJobs: 3,
      processingTimeout: 300000, // 5 minutes
      retryDelay: 5000, // 5 seconds
      healthCheckInterval: 30000, // 30 seconds
      shutdownTimeout: 60000, // 1 minute
      ...config,
    };

    this.stats = {
      worker_id: this.workerId,
      status: "idle",
      jobs_processed: 0,
      jobs_failed: 0,
      current_jobs: 0,
      uptime: 0,
      last_activity: new Date().toISOString(),
    };

    // Handle graceful shutdown
    this.setupShutdownHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn("Worker is already running");
      return;
    }

    this.isRunning = true;
    this.stats.status = "idle";
    this.stats.uptime = Date.now();

    log.info("Starting Seneca background worker", {
      workerId: this.workerId,
      config: this.config
    });

    // Start health check monitoring
    this.startHealthCheck();

    // Start processing loop
    this.processJobs();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    log.info("Stopping Seneca background worker", { workerId: this.workerId });
    this.stats.status = "stopping";
    this.isRunning = false;

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Wait for current jobs to complete or timeout
    this.shutdownPromise = this.waitForJobsToComplete();
    await this.shutdownPromise;

    this.stats.status = "stopped";
    log.info("Worker stopped", { workerId: this.workerId });
  }

  private async processJobs(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.currentJobs.size >= this.config.maxConcurrentJobs) {
          await this.sleep(1000);
          continue;
        }

        // Get next job from queue
        const job = await this.queue.processNextJob();

        if (!job) {
          // No jobs available, wait and retry
          await this.sleep(2000);
          continue;
        }

        // Process job concurrently
        this.processJobConcurrently(job);
      } catch (error) {
        errorLogger.log(error as Error, {
          worker_id: this.workerId,
          component: "job_processing_loop",
        });

        // Don't crash the worker on errors
        await this.sleep(this.config.retryDelay);
      }
    }
  }

  private async processJobConcurrently(job: ProcessingJob): Promise<void> {
    const jobId = job.id;
    const startTime = Date.now();

    // Add to current jobs
    this.currentJobs.set(jobId, job);
    this.stats.current_jobs = this.currentJobs.size;
    this.stats.last_activity = new Date().toISOString();

    try {
      log.info("Processing job", {
        jobId,
        memoryId: job.payload.memoryId
      });

      // Set up timeout for job processing
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new ProcessingError(
              `Job ${jobId} timed out after ${this.config.processingTimeout}ms`,
            ),
          );
        }, this.config.processingTimeout);
      });

      // Process the job with timeout
      const processingPromise = this.processMemoryJob(job);

      await Promise.race([processingPromise, timeoutPromise]);

      // Mark job as completed
      await this.queue.completeJob(jobId);

      this.stats.jobs_processed++;

      const processingTime = Date.now() - startTime;
      log.info("Job completed successfully", {
        jobId,
        processingTime
      });
    } catch (error) {
      log.error("Failed to process job", {
        jobId,
        error
      });

      this.stats.jobs_failed++;

      // Mark job as failed
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.queue.failJob(jobId, errorMessage);

      // Log error for monitoring
      errorLogger.log(error as Error, {
        worker_id: this.workerId,
        job_id: jobId,
        memory_id: job.payload.memoryId,
        processing_time: Date.now() - startTime,
      });
    } finally {
      // Remove from current jobs
      this.currentJobs.delete(jobId);
      this.stats.current_jobs = this.currentJobs.size;
      this.stats.last_activity = new Date().toISOString();
    }
  }

  private async processMemoryJob(job: ProcessingJob): Promise<void> {
    const { memoryId, processingOptions } = job.payload;

    try {
      // Process the memory with AI
      await aiProcessor.processMemory(memoryId);

      // Log successful processing
      await this.logJobSuccess(job);
    } catch (error) {
      // Log failed processing
      await this.logJobFailure(job, error);
      throw error;
    }
  }

  private async logJobSuccess(job: ProcessingJob): Promise<void> {
    try {
      // Log success to processing_analytics table instead
      await this.adminClient.from("processing_analytics").insert({
        memory_id: job.payload.memoryId,
        stage: "worker_completion",
        status: "completed",
        duration_ms: Date.now() - new Date(job.created_at).getTime(),
        metadata: {
          worker_id: this.workerId,
          job_id: job.id,
          family_id: job.payload.familyId,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      log.error("Failed to log job success", { error, jobId: job.id });
    }
  }

  private async logJobFailure(job: ProcessingJob, error: any): Promise<void> {
    try {
      // Log failure to processing_analytics table instead
      await this.adminClient.from("processing_analytics").insert({
        memory_id: job.payload.memoryId,
        stage: "worker_failure",
        status: "failed",
        duration_ms: Date.now() - new Date(job.created_at).getTime(),
        error_message: error instanceof Error ? error.message : String(error),
        metadata: {
          worker_id: this.workerId,
          job_id: job.id,
          family_id: job.payload.familyId,
        },
        created_at: new Date().toISOString(),
      });
    } catch (analyticsError) {
      log.error("Failed to log job failure", {
        error: analyticsError,
        jobId: job.id
      });
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        log.error("Health check failed", { error });
      }
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Log worker status to console (worker_status table doesn't exist yet)
      log.info("Worker health check", {
        workerId: this.workerId,
        status: this.stats.status,
        jobs_processed: this.stats.jobs_processed,
        jobs_failed: this.stats.jobs_failed,
        current_jobs: this.stats.current_jobs,
        uptime: Date.now() - this.stats.uptime
      });

      // Check queue health
      const queueStats = await this.queue.getQueueStats();

      if (queueStats.queue_health === "critical") {
        log.warn("Queue health is critical", { queueStats });
      }

      // Cleanup stuck jobs
      const cleanedJobs = await this.queue.cleanupStuckJobs();
      if (cleanedJobs > 0) {
        log.info("Cleaned up stuck jobs", { cleanedJobs });
      }
    } catch (error) {
      log.error("Health check failed", { error });
    }
  }

  private async waitForJobsToComplete(): Promise<void> {
    const startTime = Date.now();

    while (this.currentJobs.size > 0) {
      if (Date.now() - startTime > this.config.shutdownTimeout) {
        log.warn("Shutdown timeout reached, forcibly stopping jobs", {
          jobCount: this.currentJobs.size
        });
        break;
      }

      log.info("Waiting for jobs to complete", {
        jobCount: this.currentJobs.size
      });
      await this.sleep(1000);
    }
  }

  private setupShutdownHandlers(): void {
    const shutdownHandler = async (signal: string) => {
      log.info("Received shutdown signal", { signal });
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdownHandler("SIGINT"));
    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      log.error("Uncaught exception", { error });
      errorLogger.log(error, { worker_id: this.workerId });
      this.stop();
    });

    process.on("unhandledRejection", (reason, promise) => {
      log.error("Unhandled rejection", { promise, reason });
      errorLogger.log(reason as Error, { worker_id: this.workerId });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API methods
  getStats(): WorkerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime,
    };
  }

  getConfig(): WorkerConfig {
    return { ...this.config };
  }

  isHealthy(): boolean {
    return this.isRunning && this.stats.status !== "stopped";
  }

  getCurrentJobs(): ProcessingJob[] {
    return Array.from(this.currentJobs.values());
  }
}

// Factory function for creating workers
export function createBackgroundWorker(
  config?: Partial<WorkerConfig>,
): BackgroundWorker {
  return new BackgroundWorker(config);
}

// Worker manager for multiple workers
export class WorkerManager {
  private workers: Map<string, BackgroundWorker> = new Map();

  async startWorker(
    workerId: string,
    config?: Partial<WorkerConfig>,
  ): Promise<BackgroundWorker> {
    if (this.workers.has(workerId)) {
      throw new Error(`Worker ${workerId} already exists`);
    }

    const worker = createBackgroundWorker(config);
    this.workers.set(workerId, worker);

    await worker.start();
    return worker;
  }

  async stopWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    await worker.stop();
    this.workers.delete(workerId);
  }

  async stopAllWorkers(): Promise<void> {
    const stopPromises = Array.from(this.workers.values()).map((worker) =>
      worker.stop(),
    );
    await Promise.all(stopPromises);
    this.workers.clear();
  }

  getWorkerStats(): WorkerStats[] {
    return Array.from(this.workers.values()).map((worker) => worker.getStats());
  }

  getWorker(workerId: string): BackgroundWorker | undefined {
    return this.workers.get(workerId);
  }

  getAllWorkers(): BackgroundWorker[] {
    return Array.from(this.workers.values());
  }
}

// Global worker manager instance
export const workerManager = new WorkerManager();
