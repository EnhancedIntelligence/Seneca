'use client';

/**
 * Dashboard Overview
 * Analytics and insights display
 */

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { ChildCard } from '@/components/dashboard/ChildCard';
import { MilestoneTimeline } from '@/components/dashboard/MilestoneTimeline';
import { useFamily, useMemoryData } from '@/lib/stores/useAppStore';
import { useApi } from '@/lib/services/mockApi';
import { BookOpen, TrendingUp, Award, Activity, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewPage() {
  const { children } = useFamily();
  const { memories, milestones } = useMemoryData();
  interface AnalyticsData {
    totalMemories: number;
    totalMilestones: number;
    activeChildren: number;
    processingHealth: number;
    lastWeekGrowth?: {
      memories: number;
      milestones: number;
    };
  }
  
  interface InsightData {
    id: string;
    type: 'milestone' | 'pattern' | 'suggestion';
    severity: 'info' | 'success' | 'warning' | 'error';
    title: string;
    content: string;
    childId: string | null;
    timestamp: string;
  }
  
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
        setAnalytics(analyticsData);
        setInsights(insightsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
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
        <p className="text-gray-400 mt-1">Track your family{`'`}s developmental journey</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Memories"
          value={analytics?.totalMemories || 0}
          trend={{
            value: analytics?.lastWeekGrowth?.memories || 0,
            direction: 'up',
            label: 'from last week',
          }}
          icon={BookOpen}
          variant="default"
        />
        <MetricCard
          title="Milestones"
          value={analytics?.totalMilestones || 0}
          trend={{
            value: analytics?.lastWeekGrowth?.milestones || 0,
            direction: 'up',
            label: 'this month',
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
            direction: 'down',
            label: 'error rate',
          }}
        />
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Your Children</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => {
            const childMemories = memories.filter(m => m.child_id === child.id);
            const childMilestones = milestones.filter(m => m.childId === child.id);
            
            return (
              <ChildCard
                key={child.id}
                child={{
                  id: child.id,
                  name: child.name,
                  age: '2 years', // Calculate from birth_date in real app
                  developmentScore: 85 + Math.floor(Math.random() * 15),
                  recentMemories: childMemories.length,
                  milestones: childMilestones.length,
                  lastActivity: "2 hours ago",
                  gradient: 'bg-gradient-to-r from-violet-500 to-blue-500',
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
              content={insight.content}
            />
          ))}
        </div>
      </div>

      {/* Milestone Timeline */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Recent Milestones</h2>
        <MilestoneTimeline
          milestones={milestones.slice(0, 5).map((m) => ({
            ...m,
            confidence: m.verifiedBy === 'ai' ? 0.85 : 1.0,
          }))}
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
            <div className="text-2xl font-bold">${analytics?.monthlyUsage?.cost || 0}</div>
            <div className="text-sm text-gray-400">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{(analytics?.monthlyUsage?.tokens || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-400">API Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analytics?.monthlyUsage?.processingTime || 0}s</div>
            <div className="text-sm text-gray-400">Avg Processing</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analytics?.monthlyUsage?.errorRate || 0}%</div>
            <div className="text-sm text-gray-400">Error Rate</div>
          </div>
        </div>
      </Card>
    </div>
  );
}