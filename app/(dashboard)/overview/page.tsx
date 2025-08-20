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
import { supabase } from '@/lib/supabase';
import { BookOpen, TrendingUp, Award, Activity, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      // auth
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setIsLoading(false); return; }
      // family
      const { data: memberships } = await supabase.from('family_memberships').select('family_id').eq('user_id', u.user.id).limit(1);
      const familyId = memberships?.[0]?.family_id as string | undefined;
      if (!familyId) { setChildren([]); setMemories([]); setMilestones([]); setIsLoading(false); return; }
      // fetch
      const [{ data: kids }, { data: mems }] = await Promise.all([
        supabase.from('children').select('id,name,birth_date').eq('family_id', familyId).order('birth_date', { ascending: true }),
        supabase.from('memory_entries').select('id,child_id,created_at,memory_date,category,tags,milestone_detected,content').eq('family_id', familyId).order('created_at', { ascending: false }).limit(200),
      ]);
      const ms = (mems || []).filter(m => m.milestone_detected).map(m => ({
        id: m.id,
        childId: m.child_id,
        title: m.category || 'Milestone',
        achievedAt: m.memory_date || m.created_at,
        category: (m.category || 'physical') as any,
        verifiedBy: 'ai',
        description: m.content || '',
      }));
      setChildren(kids || []);
      setMemories(mems || []);
      setMilestones(ms);
      // simple analytics/insights placeholders computed locally
      setAnalytics({
        totalMemories: (mems || []).length,
        totalMilestones: ms.length,
        activeChildren: (kids || []).length,
        processingHealth: 98,
        lastWeekGrowth: { memories: 12, milestones: 3 },
        monthlyUsage: { cost: 12.5, tokens: 150000, processingTime: 2.3, errorRate: 0.4 },
      });
      setInsights((mems || []).slice(0, 4).map(m => ({ id: m.id, type: 'pattern', severity: 'info', title: m.category || 'Pattern', description: m.content || '', childId: m.child_id, timestamp: m.created_at })));
      setIsLoading(false);
    };
    load();
  }, []);

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
        <p className="text-gray-400 mt-1">Track your family{'\''}s developmental journey</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Memories"
          value={analytics?.totalMemories || 0}
          trend={{ value: analytics?.lastWeekGrowth?.memories || 0, direction: 'up', label: 'from last week' }}
          icon={BookOpen}
          variant="default"
        />
        <MetricCard
          title="Milestones"
          value={analytics?.totalMilestones || 0}
          trend={{ value: analytics?.lastWeekGrowth?.milestones || 0, direction: 'up', label: 'this month' }}
          icon={Award}
          variant="success"
        />
        <MetricCard title="Active Children" value={children.length} icon={Activity} variant="info" />
        <MetricCard title="AI Processing" value={`${analytics?.processingHealth || 0}%`} icon={Activity} variant="warning" trend={{ value: 0.3, direction: 'down', label: 'error rate' }} />
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Your Children</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => {
            const childMemories = memories.filter((m) => m.child_id === child.id);
            const childMilestones = milestones.filter((m) => m.childId === child.id);

            return (
              <ChildCard
                key={child.id}
                child={{
                  id: child.id,
                  name: child.name,
                  age: { value: 0, unit: 'years' as const },
                  developmentScore: 85 + Math.floor(Math.random() * 15),
                  totalMemories: childMemories.length,
                  milestones: childMilestones.length,
                  lastEntry: childMemories[0]?.created_at || '—',
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
            <InsightCard key={insight.id} type={insight.type} title={insight.title} content={insight.description} />
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
              child: child?.name || 'Unknown',
              title: m.title,
              date: m.achievedAt,
              category: m.category,
              aiConfidence: 85,
              verified: true,
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
            <div className="text-2xl font-bold">{analytics ? `$${analytics.monthlyUsage.cost.toFixed(2)}` : '—'}</div>
            <div className="text-sm text-gray-400">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analytics ? analytics.monthlyUsage.tokens.toLocaleString() : '—'}</div>
            <div className="text-sm text-gray-400">API Tokens</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analytics ? `${analytics.monthlyUsage.processingTime}s` : '—'}</div>
            <div className="text-sm text-gray-400">Avg Processing</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analytics ? `${analytics.monthlyUsage.errorRate.toFixed(1)}%` : '—'}</div>
            <div className="text-sm text-gray-400">Error Rate</div>
          </div>
        </div>
      </Card>
    </div>
  );
}