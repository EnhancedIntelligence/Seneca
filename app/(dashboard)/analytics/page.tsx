"use client";

/**
 * Analytics View
 * Detailed analytics and insights
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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

export default function AnalyticsPage() {
  // Local state replaces useFamily/useMemoryData
  const [children, setChildren] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Get current user
        const { data: userData, error: authError } =
          await supabase.auth.getUser();
        if (authError || !userData.user) {
          setError("Authentication required");
          setIsLoading(false);
          return;
        }

        // Get a family for this user (pick the first membership)
        const { data: memberships, error: mErr } = await supabase
          .from("family_memberships")
          .select("family_id")
          .eq("user_id", userData.user.id)
          .limit(1);

        if (mErr) {
          throw mErr;
        }

        const famId = memberships?.[0]?.family_id || null;
        setFamilyId(famId);

        if (!famId) {
          // No family yet; nothing to load
          setChildren([]);
          setMemories([]);
          setIsLoading(false);
          return;
        }

        // Load children
        const { data: childrenData, error: cErr } = await supabase
          .from("children")
          .select("id,name,birth_date,gender,profile_image_url")
          .eq("family_id", famId)
          .order("birth_date", { ascending: true });
        if (cErr) throw cErr;

        // Load recent memories (up to 50)
        const { data: memoriesData, error: memErr } = await supabase
          .from("memory_entries")
          .select(
            "id,child_id,family_id,created_at,memory_date,category,tags,image_urls,video_urls,milestone_detected"
          )
          .eq("family_id", famId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (memErr) throw memErr;

        setChildren(childrenData || []);
        setMemories(memoriesData || []);
      } catch (e) {
        console.error("Error loading analytics data:", e);
        setError("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Derive milestones from memories
  const milestones = (memories || [])
    .filter((m) => m.milestone_detected)
    .map((m) => ({
      childId: m.child_id,
      achievedAt: m.memory_date || m.created_at,
    }));

  // Helper to infer UI memory type
  const inferType = (
    m: any
  ): "voice" | "text" | "photo" | "video" | "event" => {
    if (Array.isArray(m.video_urls) && m.video_urls.length > 0) return "video";
    if (Array.isArray(m.image_urls) && m.image_urls.length > 0) return "photo";
    if (m.category === "event" || m.category === "milestone") return "event";
    // voice not tracked explicitly; fall back to text
    return "text";
  };

  // Prepare chart data - adapted to DB shapes
  const memoryTypeData = [
    {
      name: "Voice",
      value: memories.filter((m) => inferType(m) === "voice").length,
      color: "#8b5cf6",
    },
    {
      name: "Text",
      value: memories.filter((m) => inferType(m) === "text").length,
      color: "#3b82f6",
    },
    {
      name: "Photo",
      value: memories.filter((m) => inferType(m) === "photo").length,
      color: "#10b981",
    },
    {
      name: "Video",
      value: memories.filter((m) => inferType(m) === "video").length,
      color: "#ef4444",
    },
    {
      name: "Event",
      value: memories.filter((m) => inferType(m) === "event").length,
      color: "#f59e0b",
    },
  ];

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toDateString();
    const dayMemories = memories.filter((m) => {
      const memDate = new Date(m.memory_date || m.created_at);
      return memDate.toDateString() === dayStr;
    });
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      memories: dayMemories.length,
      milestones: milestones.filter(
        (mm) => new Date(mm.achievedAt).toDateString() === dayStr
      ).length,
    };
  });

  const tagDistribution = [
    {
      tag: "Physical",
      count: memories.filter((m) =>
        (m.tags || []).some((t: string) => t.toLowerCase() === "physical")
      ).length,
    },
    {
      tag: "Language",
      count: memories.filter((m) =>
        (m.tags || []).some((t: string) => t.toLowerCase() === "language")
      ).length,
    },
    {
      tag: "Cognitive",
      count: memories.filter((m) =>
        (m.tags || []).some((t: string) => t.toLowerCase() === "cognitive")
      ).length,
    },
    {
      tag: "Social",
      count: memories.filter((m) =>
        (m.tags || []).some((t: string) => t.toLowerCase() === "social")
      ).length,
    },
    {
      tag: "Emotional",
      count: memories.filter((m) =>
        (m.tags || []).some((t: string) => t.toLowerCase() === "emotional")
      ).length,
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
          Deep insights into your family{"'"}s development
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <span className="text-sm text-green-400">+12%</span>
          </div>
          <div className="text-2xl font-bold">{memories.length}</div>
          <div className="text-sm text-gray-400">Total Memories</div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-green-400">+8%</span>
          </div>
          <div className="text-2xl font-bold">{milestones.length}</div>
          <div className="text-sm text-gray-400">Milestones</div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-red-400" />
            <span className="text-sm text-yellow-400">95%</span>
          </div>
          <div className="text-2xl font-bold">High</div>
          <div className="text-sm text-gray-400">Engagement</div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400">99.7%</span>
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
                (m) => m.child_id === child.id
              );
              const childMilestones = milestones.filter(
                (m) => m.childId === child.id
              );

              const memPct =
                memories.length > 0
                  ? (childMemories.length / memories.length) * 100
                  : 0;
              const milePct =
                milestones.length > 0
                  ? (childMilestones.length / milestones.length) * 100
                  : 0;

              return (
                <Card key={child.id} className="bg-white/5 border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl p-2 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500">
                      {String(child.name).substring(0, 1).toUpperCase()}
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
                      <Progress value={memPct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Milestones</span>
                        <span>{childMilestones.length}</span>
                      </div>
                      <Progress value={milePct} className="h-2" />
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
