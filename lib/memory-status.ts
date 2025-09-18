/**
 * Centralized Memory Status Mapping
 * Provides type-safe bidirectional conversion between legacy and new status systems
 */

import type { MemoryStatus, ProcessingStatus } from "@/lib/types";

/**
 * Map new memory_status enum to legacy processing_status enum
 * @param status - The new memory status
 * @returns The corresponding legacy processing status
 */
export function mapMemoryStatusToProcessing(status: MemoryStatus): ProcessingStatus {
  const mapping: Record<MemoryStatus, ProcessingStatus> = {
    "draft": "queued",
    "processing": "processing",
    "ready": "completed",
    "error": "failed"
  };
  return mapping[status];
}

/**
 * Map legacy processing_status to new memory_status
 * @param status - The legacy processing status
 * @returns The corresponding new memory status
 */
export function mapProcessingToMemoryStatus(
  status: ProcessingStatus
): Extract<MemoryStatus, "draft" | "processing" | "ready" | "error"> {
  const mapping: Record<ProcessingStatus, Extract<MemoryStatus, "draft" | "processing" | "ready" | "error">> = {
    "queued": "draft",
    "processing": "processing",
    "processing_classification": "processing",
    "categorized": "processing",
    "processing_embedding": "processing",
    "embedded": "ready",
    "completed": "ready",
    "failed": "error",
    "error": "error"
  };
  return mapping[status];
}

/**
 * Type guard for valid memory status transitions during processing
 */
export function isProcessingStatus(
  status: MemoryStatus
): status is Extract<MemoryStatus, "processing" | "ready" | "error"> {
  return status === "processing" || status === "ready" || status === "error";
}

/**
 * Validate status transition is legal
 * @param from - Current status
 * @param to - Target status
 * @returns True if transition is allowed
 */
export function isValidStatusTransition(from: MemoryStatus, to: MemoryStatus): boolean {
  // Define legal transitions
  const transitions: Record<MemoryStatus, MemoryStatus[]> = {
    "draft": ["processing", "error"],
    "processing": ["ready", "error"],
    "ready": ["processing"], // Allow reprocessing
    "error": ["draft", "processing"] // Allow retry
  };

  return transitions[from]?.includes(to) ?? false;
}