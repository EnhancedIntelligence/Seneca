import { describe, it, expect } from "vitest";
import {
  mapMemoryStatusToProcessing,
  mapProcessingToMemoryStatus,
  isProcessingStatus,
  isValidStatusTransition,
} from "@/lib/memory-status";
import type { MemoryStatus, ProcessingStatus } from "@/lib/types";

describe("Memory Status Mapping", () => {
  describe("mapMemoryStatusToProcessing", () => {
    it("maps draft to queued", () => {
      expect(mapMemoryStatusToProcessing("draft")).toBe("queued");
    });

    it("maps processing to processing", () => {
      expect(mapMemoryStatusToProcessing("processing")).toBe("processing");
    });

    it("maps ready to completed", () => {
      expect(mapMemoryStatusToProcessing("ready")).toBe("completed");
    });

    it("maps error to failed", () => {
      expect(mapMemoryStatusToProcessing("error")).toBe("failed");
    });
  });

  describe("mapProcessingToMemoryStatus", () => {
    it("maps queued to draft", () => {
      expect(mapProcessingToMemoryStatus("queued")).toBe("draft");
    });

    it("maps processing to processing", () => {
      expect(mapProcessingToMemoryStatus("processing")).toBe("processing");
    });

    it("maps completed to ready", () => {
      expect(mapProcessingToMemoryStatus("completed")).toBe("ready");
    });

    it("maps failed to error", () => {
      expect(mapProcessingToMemoryStatus("failed")).toBe("error");
    });

    it("maps legacy processing states correctly", () => {
      expect(mapProcessingToMemoryStatus("processing_classification")).toBe("processing");
      expect(mapProcessingToMemoryStatus("categorized")).toBe("processing");
      expect(mapProcessingToMemoryStatus("processing_embedding")).toBe("processing");
      expect(mapProcessingToMemoryStatus("embedded")).toBe("ready");
      expect(mapProcessingToMemoryStatus("error")).toBe("error");
    });
  });

  describe("round-trip conversion", () => {
    const memoryStatuses: MemoryStatus[] = ["draft", "processing", "ready", "error"];

    it("preserves status through round-trip conversion", () => {
      memoryStatuses.forEach((status) => {
        const processing = mapMemoryStatusToProcessing(status);
        const backToMemory = mapProcessingToMemoryStatus(processing);
        expect(backToMemory).toBe(status);
      });
    });

    it("handles all processing status values", () => {
      const processingStatuses: ProcessingStatus[] = [
        "queued",
        "processing",
        "processing_classification",
        "categorized",
        "processing_embedding",
        "embedded",
        "completed",
        "failed",
        "error"
      ];

      processingStatuses.forEach((status) => {
        const memoryStatus = mapProcessingToMemoryStatus(status);
        expect(["draft", "processing", "ready", "error"]).toContain(memoryStatus);
      });
    });
  });

  describe("isProcessingStatus", () => {
    it("returns true for processing statuses", () => {
      expect(isProcessingStatus("processing")).toBe(true);
      expect(isProcessingStatus("ready")).toBe(true);
      expect(isProcessingStatus("error")).toBe(true);
    });

    it("returns false for draft status", () => {
      expect(isProcessingStatus("draft")).toBe(false);
    });
  });

  describe("isValidStatusTransition", () => {
    it("allows valid transitions from draft", () => {
      expect(isValidStatusTransition("draft", "processing")).toBe(true);
      expect(isValidStatusTransition("draft", "error")).toBe(true);
      expect(isValidStatusTransition("draft", "ready")).toBe(false);
    });

    it("allows valid transitions from processing", () => {
      expect(isValidStatusTransition("processing", "ready")).toBe(true);
      expect(isValidStatusTransition("processing", "error")).toBe(true);
      expect(isValidStatusTransition("processing", "draft")).toBe(false);
    });

    it("allows reprocessing from ready", () => {
      expect(isValidStatusTransition("ready", "processing")).toBe(true);
      expect(isValidStatusTransition("ready", "draft")).toBe(false);
      expect(isValidStatusTransition("ready", "error")).toBe(false);
    });

    it("allows retry from error", () => {
      expect(isValidStatusTransition("error", "draft")).toBe(true);
      expect(isValidStatusTransition("error", "processing")).toBe(true);
      expect(isValidStatusTransition("error", "ready")).toBe(false);
    });
  });
});