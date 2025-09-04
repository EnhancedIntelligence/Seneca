"use client";

/**
 * Analytics View
 * Detailed analytics and insights
 */

import { useState, useEffect } from "react";
import { useFamily, useMemoryData } from "@/lib/stores/useAppStore";
import { useApi } from "@/lib/services/mockApi";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Brain, Heart, Activity } from "lucide-react";

// UI type (camelCase)
type AnalyticsData = {
  totalMemories: number;
  totalMilestones: number;
  activeChildren: number;
  processingHealth: number; // 0-100
};

export default function AnalyticsPage() {
  const { children } = useFamily();
  const { memories, milestones } = useMemoryData(); // already UIMemory[]

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    let aborted = false;
    const loadAnalytics = async () => {
      try {
        // Fetch analytics from API (already in UI format)
        const data = await api.getAnalytics();
        if (!aborted) {
          // API returns camelCase, not snake_case - use directly
          setAnalytics({
            totalMemories: data.totalMemories,
            totalMilestones: data.totalMilestones,
            activeChildren: data.activeChildren,
            processingHealth: data.processingHealth,
          });
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        if (!aborted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => { aborted = true; };
  }, [api]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Prepare chart data - using UI types now
  const memoryTypeData = [
    {
      name: "Voice",
      value: memories.filter((m) => m.type === "voice").length,
      color: "#8b5cf6",
    },
    {
      name: "Text",
      value: memories.filter((m) => m.type === "text").length,
      color: "#3b82f6",
    },
    {
      name: "Photo",
      value: memories.filter((m) => m.type === "photo").length,
      color: "#10b981",
    },
    {
      name: "Video",
      value: memories.filter((m) => m.type === "video").length,
      color: "#ef4444",
    },
    {
      name: "Event",
      value: memories.filter((m) => m.type === "event").length,
      color: "#f59e0b",
    },
  ];

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayMemories = memories.filter((m) => {
      const memDate = new Date(m.timestamp); // UI type has timestamp
      return memDate.toDateString() === date.toDateString();
    });
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      memories: dayMemories.length,
      milestones: milestones.filter((m) => {
        const mDate = new Date(m.achievedAt);
        return mDate.toDateString() === date.toDateString();
      }).length,
    };
  });

  const tagDistribution = [
    {
      tag: "Physical",
      count: memories.filter((m) => m.tags.some((t) => t.label === "physical"))
        .length,
    },
    {
      tag: "Language",
      count: memories.filter((m) => m.tags.some((t) => t.label === "language"))
        .length,
    },
    {
      tag: "Cognitive",
      count: memories.filter((m) => m.tags.some((t) => t.label === "cognitive"))
        .length,
    },
    {
      tag: "Social",
      count: memories.filter((m) => m.tags.some((t) => t.label === "social"))
        .length,
    },
    {
      tag: "Emotional",
      count: memories.filter((m) => m.tags.some((t) => t.label === "emotional"))
        .length,
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-gray-400 mt-1">
          Deep insights into your family{`'`}s development
        </p>
      </div>

      {/* Summary Cards - Using actual analytics data with fallbacks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <span className="text-sm text-green-400">+12%</span>
          </div>
          <div className="text-2xl font-bold">{analytics?.totalMemories ?? memories.length}</div>
          <div className="text-sm text-gray-400">Total Memories</div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-green-400">+8%</span>
          </div>
          <div className="text-2xl font-bold">{analytics?.totalMilestones ?? milestones.length}</div>
          <div className="text-sm text-gray-400">Milestones</div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-red-400" />
            <span className="text-sm text-yellow-400">{analytics?.activeChildren ?? children.length}</span>
          </div>
          <div className="text-2xl font-bold">{analytics?.activeChildren ?? children.length}</div>
          <div className="text-sm text-gray-400">Active Children</div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400">
              {(analytics?.processingHealth ?? 99.7).toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold">Healthy</div>
          <div className="text-sm text-gray-400">AI Processing</div>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="types">Memory Types</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
          <TabsTrigger value="children">By Child</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-white/5 border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #333",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="memories"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6" }}
                />
                <Line
                  type="monotone"
                  dataKey="milestones"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card className="bg-white/5 border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4">
              Memory Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={memoryTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {memoryTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #333",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <Card className="bg-white/5 border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4">Development Areas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tagDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="tag" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #333",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="children" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child) => {
              const childMemories = memories.filter(
                (m) => m.childId === child.id,
              );
              const childMilestones = milestones.filter(
                (m) => m.childId === child.id,
              );

              return (
                <Card key={child.id} className="bg-white/5 border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl p-2 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500">
                      {child.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{child.name}</h3>
                      <p className="text-sm text-gray-400">Child profile</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memories</span>
                        <span>{childMemories.length}</span>
                      </div>
                      <Progress
                        value={(childMemories.length / memories.length) * 100}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Milestones</span>
                        <span>{childMilestones.length}</span>
                      </div>
                      <Progress
                        value={
                          (childMilestones.length / milestones.length) * 100
                        }
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Development Score</span>
                        <span>92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" />
          AI-Powered Insights
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-sm">
              <strong>Language Development:</strong> Emma shows a 40% increase
              in vocabulary usage this month. Peak learning times are between
              10-11 AM.
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm">
              <strong>Physical Milestones:</strong> Lucas is progressing well
              with gross motor skills. Consider documenting more balance and
              coordination activities.
            </p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm">
              <strong>Social Interactions:</strong> Both children show positive
              social development. More playtime documentation could provide
              valuable insights.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
