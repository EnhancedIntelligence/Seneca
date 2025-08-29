"use client";

/**
 * Dashboard Overview
 * Analytics and insights display
 */

import { useState, useEffect } from "react";
import { z } from "zod";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { ChildCard } from "@/components/dashboard/ChildCard";
import { MilestoneTimeline } from "@/components/dashboard/MilestoneTimeline";
import { useFamily, useMemoryData } from "@/lib/stores/useAppStore";
import { useApi } from "@/lib/services/mockApi";
import { BookOpen, Award, Activity, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// API wire format validation (snake_case from backend)
const ApiInsightSchema = z.object({
  id: z.string(),
  type: z.string(), // Backend sends various types as strings
  severity: z.string(), // Backend sends severity levels as strings
  title: z.string(),
  description: z.string(),
  childId: z.string().nullable().optional(), // Some APIs use childId, some child_id
  child_id: z.string().nullable().optional(), // Handle both cases
  timestamp: z.string(),
});

const ApiInsightListSchema = z.array(ApiInsightSchema);

// UI types (camelCase, strict enums)
interface AnalyticsData {
  totalMemories: number;
  totalMilestones: number;
  activeChildren: number;
  processingHealth: number;
  lastWeekGrowth?: {
    memories: number;
    milestones: number;
  };
  monthlyUsage?: {
    cost: number;
    tokens: number;
    processingTime: number;
    errorRate: number;
  };
}

type InsightType =
  | "prediction"
  | "pattern"
  | "recommendation"
  | "comparison"
  | "milestone"
  | "alert";

type InsightSeverity = "info" | "success" | "warning" | "error";

interface InsightData {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  childId: string | null;
  timestamp: string;
}

// Adapter: wire format -> UI model
function adaptInsightsToUI(rawData: unknown): InsightData[] {
  const validated = ApiInsightListSchema.parse(rawData);
  
  return validated.map((raw) => ({
    id: raw.id,
    type: normalizeInsightType(raw.type),
    severity: normalizeInsightSeverity(raw.severity),
    title: raw.title,
    description: raw.description,
    childId: raw.child_id ?? raw.childId ?? null,
    timestamp: raw.timestamp,
  }));
}

function normalizeInsightType(type: string): InsightType {
  const validTypes: InsightType[] = [
    "prediction",
    "pattern",
    "recommendation",
    "comparison",
    "milestone",
    "alert",
  ];
  return validTypes.includes(type as InsightType)
    ? (type as InsightType)
    : "pattern"; // Safe default
}

function normalizeInsightSeverity(severity: string): InsightSeverity {
  const validSeverities: InsightSeverity[] = ["info", "success", "warning", "error"];
  return validSeverities.includes(severity as InsightSeverity)
    ? (severity as InsightSeverity)
    : "info"; // Safe default
}

export default function OverviewPage() {
  const { children } = useFamily();
  const { memories, milestones } = useMemoryData();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API calls when backend is ready
        const [analyticsData, insightsData] = await Promise.all([
          api.getAnalytics(),
          api.getInsights(),
        ]);

        // Use actual analytics data from API
        setAnalytics(analyticsData);

        // Parse and adapt insights with validation
        try {
          const adaptedInsights = adaptInsightsToUI(insightsData);
          setInsights(adaptedInsights);
        } catch (error) {
          console.error("Failed to parse insights:", error);
          setInsights([]); // Graceful fallback
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [api]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <p className="text-gray-400 mt-1">
          Track your family{`'`}s developmental journey
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Memories"
          value={analytics?.totalMemories || 0}
          trend={{
            value: analytics?.lastWeekGrowth?.memories || 0,
            direction: "up",
            label: "from last week",
          }}
          icon={BookOpen}
          variant="default"
        />
        <MetricCard
          title="Milestones"
          value={analytics?.totalMilestones || 0}
          trend={{
            value: analytics?.lastWeekGrowth?.milestones || 0,
            direction: "up",
            label: "this month",
          }}
          icon={Award}
          variant="success"
        />
        <MetricCard
          title="Active Children"
          value={children.length}
          icon={Activity}
          variant="info"
        />
        <MetricCard
          title="AI Processing"
          value={`${analytics?.processingHealth || 0}%`}
          icon={Activity}
          variant="warning"
          trend={{
            value: 0.3,
            direction: "down",
            label: "error rate",
          }}
        />
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Your Children</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => {
            const childMemories = memories.filter(
              (m) => m.childId === child.id,
            );
            const childMilestones = milestones.filter(
              (m) => m.childId === child.id,
            );

            return (
              <ChildCard
                key={child.id}
                child={{
                  id: child.id,
                  name: child.name,
                  age: child.age
                    ? {
                        value: child.age.years,
                        unit: "years" as const,
                        months: child.age.months,
                      }
                    : { value: 0, unit: "years" as const },
                  developmentScore: 85 + Math.floor(Math.random() * 15),
                  totalMemories: childMemories.length,
                  milestones: childMilestones.length,
                  lastEntry: "2 hours ago",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Recent Insights */}
      <div>
        <h2 className="text-xl font-semibold mb-3">AI Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.slice(0, 4).map((insight) => (
            <InsightCard
              key={insight.id}
              type={insight.type}
              title={insight.title}
              content={insight.description}
            />
          ))}
        </div>
      </div>

      {/* Milestone Timeline */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Recent Milestones</h2>
        <MilestoneTimeline
          milestones={milestones.slice(0, 5).map((m) => {
            const child = children.find((c) => c.id === m.childId);
            return {
              id: m.id,
              child: child?.name || "Unknown",
              title: m.title,
              date: m.achievedAt,
              category: m.category,
              aiConfidence: m.verifiedBy === "ai" ? 85 : 100,
              verified: m.verifiedBy === "parent" || m.verifiedBy === "both",
              description: m.description,
            };
          })}
        />
      </div>

      {/* Usage Stats */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Monthly Usage
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">
              {!analytics ? (
                <span className="text-sm">Loading...</span>
              ) : typeof analytics.monthlyUsage?.cost === "number" ? (
                `$${analytics.monthlyUsage.cost.toFixed(2)}`
              ) : (
                "—"
              )}
            </div>
            <div className="text-sm text-gray-400">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {!analytics ? (
                <span className="text-sm">Loading...</span>
              ) : typeof analytics.monthlyUsage?.tokens === "number" ? (
                analytics.monthlyUsage.tokens.toLocaleString()
              ) : (
                "—"
              )}
            </div>
            <div className="text-sm text-gray-400">API Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {!analytics ? (
                <span className="text-sm">Loading...</span>
              ) : typeof analytics.monthlyUsage?.processingTime === "number" ? (
                `${analytics.monthlyUsage.processingTime}s`
              ) : (
                "—"
              )}
            </div>
            <div className="text-sm text-gray-400">Avg Processing</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {!analytics ? (
                <span className="text-sm">Loading...</span>
              ) : typeof analytics.monthlyUsage?.errorRate === "number" ? (
                `${analytics.monthlyUsage.errorRate.toFixed(1)}%`
              ) : (
                "—"
              )}
            </div>
            <div className="text-sm text-gray-400">Error Rate</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
