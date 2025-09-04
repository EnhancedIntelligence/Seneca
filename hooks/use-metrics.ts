import { useState, useEffect } from "react";

interface MetricsData {
  total_memories: number;
  total_children: number;
  total_members: number;
  pending_ai_jobs: number;
  completed_ai_jobs: number;
  failed_ai_jobs: number;
  queue_stats: {
    total_jobs: number;
    pending_jobs: number;
    processing_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    avg_processing_time: string | null;
  };
}

interface UseMetricsReturn {
  metrics: MetricsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMetrics(familyId: string | null): UseMetricsReturn {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!familyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/metrics?familyId=${familyId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setMetrics(data.metrics);
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");

      // Set fallback data for development
      if (process.env.NODE_ENV === "development") {
        setMetrics({
          total_memories: 245,
          total_children: 2,
          total_members: 4,
          pending_ai_jobs: 3,
          completed_ai_jobs: 242,
          failed_ai_jobs: 0,
          queue_stats: {
            total_jobs: 245,
            pending_jobs: 3,
            processing_jobs: 0,
            completed_jobs: 242,
            failed_jobs: 0,
            avg_processing_time: "00:02:30",
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, [familyId]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}
