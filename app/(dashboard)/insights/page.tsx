'use client'

import React, { useState, useMemo } from 'react';
import { useFamily } from '@/lib/stores/useAppStore';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { ChildSelector } from '@/components/memory/shared/ChildSelector';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Lightbulb, 
  BarChart3, 
  RefreshCw, 
  Sparkles,
  Target,
  ChartLine,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

type InsightType = 'prediction' | 'pattern' | 'recommendation' | 'comparison';
type InsightSeverity = 'info' | 'success' | 'warning' | 'critical';

interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  childId: string | null;
  timestamp: string;
  category?: string;
  confidence?: number;
  actionable?: boolean;
  relatedMemories?: number;
}

// Extended mock insights data
const generateMockInsights = (): Insight[] => {
  const baseInsights: Insight[] = [
    {
      id: 'insight-pred-1',
      type: 'prediction',
      severity: 'info',
      title: 'Next Milestone: Walking Independently',
      description: 'Based on current progress with assisted walking, Emma is likely to walk independently within the next 2-3 weeks.',
      childId: 'child-1',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      category: 'physical',
      confidence: 0.87,
      actionable: true,
      relatedMemories: 12,
    },
    {
      id: 'insight-pat-1',
      type: 'pattern',
      severity: 'success',
      title: 'Language Development Acceleration',
      description: 'Lucas shows a 40% increase in vocabulary usage this month. Peak learning occurs between 10-11 AM.',
      childId: 'child-2',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      category: 'language',
      confidence: 0.92,
      relatedMemories: 23,
    },
    {
      id: 'insight-rec-1',
      type: 'recommendation',
      severity: 'warning',
      title: 'Social Interaction Opportunity',
      description: 'Consider scheduling more playdates. Social interaction memories have decreased by 60% this week.',
      childId: null,
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
      category: 'social',
      actionable: true,
      relatedMemories: 5,
    },
    {
      id: 'insight-comp-1',
      type: 'comparison',
      severity: 'info',
      title: 'Above Average Cognitive Development',
      description: 'Emma\'s problem-solving skills are 23% above typical milestones for her age group.',
      childId: 'child-1',
      timestamp: new Date(Date.now() - 72 * 3600000).toISOString(),
      category: 'cognitive',
      confidence: 0.78,
      relatedMemories: 18,
    },
    {
      id: 'insight-pred-2',
      type: 'prediction',
      severity: 'success',
      title: 'Speech Pattern Emerging',
      description: 'Lucas is showing signs of two-word combinations. Expect short sentences within 4-6 weeks.',
      childId: 'child-2',
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      category: 'language',
      confidence: 0.81,
      actionable: false,
      relatedMemories: 15,
    },
    {
      id: 'insight-pat-2',
      type: 'pattern',
      severity: 'info',
      title: 'Sleep Routine Consistency',
      description: 'Both children show improved sleep patterns when bedtime routine starts at 7:30 PM.',
      childId: null,
      timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
      category: 'sleep',
      confidence: 0.89,
      relatedMemories: 28,
    },
    {
      id: 'insight-rec-2',
      type: 'recommendation',
      severity: 'critical',
      title: 'Document Physical Activities',
      description: 'No physical activity memories recorded for Emma in 5 days. Consider capturing outdoor play moments.',
      childId: 'child-1',
      timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
      category: 'physical',
      actionable: true,
      relatedMemories: 0,
    },
    {
      id: 'insight-comp-2',
      type: 'comparison',
      severity: 'success',
      title: 'Emotional Regulation Progress',
      description: 'Lucas shows 30% fewer tantrums compared to last month, indicating improved emotional development.',
      childId: 'child-2',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      category: 'emotional',
      confidence: 0.85,
      relatedMemories: 21,
    },
  ];

  return baseInsights;
};

export default function InsightsPage() {
  const { children, activeChildId } = useFamily();
  const [insights, setInsights] = useState<Insight[]>(generateMockInsights());
  const [selectedType, setSelectedType] = useState<InsightType | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter insights based on selections
  const filteredInsights = useMemo(() => {
    let filtered = [...insights];

    // Filter by child
    if (activeChildId) {
      filtered = filtered.filter(i => i.childId === activeChildId || i.childId === null);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(i => i.type === selectedType);
    }

    // Sort by timestamp descending
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [insights, activeChildId, selectedType]);

  // Group insights by type for display
  const groupedInsights = useMemo(() => {
    const groups: Record<InsightType, Insight[]> = {
      prediction: [],
      pattern: [],
      recommendation: [],
      comparison: [],
    };

    filteredInsights.forEach(insight => {
      groups[insight.type].push(insight);
    });

    return groups;
  }, [filteredInsights]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate new insights (in real app, this would fetch from API)
    const newInsight: Insight = {
      id: `insight-new-${Date.now()}`,
      type: 'pattern',
      severity: 'success',
      title: 'New Pattern Detected',
      description: 'Recent memories show increased creative play activities in the afternoon.',
      childId: activeChildId,
      timestamp: new Date().toISOString(),
      category: 'creative',
      confidence: 0.76,
      relatedMemories: 8,
    };
    
    setInsights([newInsight, ...insights]);
    setIsRefreshing(false);
  };

  const typeIcons: Record<InsightType, React.ElementType> = {
    prediction: Target,
    pattern: ChartLine,
    recommendation: Lightbulb,
    comparison: BarChart3,
  };

  const typeColors: Record<InsightType, string> = {
    prediction: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pattern: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    recommendation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    comparison: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const severityIcons: Record<InsightSeverity, React.ElementType> = {
    info: AlertCircle,
    success: CheckCircle2,
    warning: AlertCircle,
    critical: AlertCircle,
  };

  const getActiveChild = () => children.find(c => c.id === activeChildId);
  const activeChild = getActiveChild();

  // Calculate statistics
  const stats = useMemo(() => {
    const actionable = filteredInsights.filter(i => i.actionable).length;
    const highConfidence = filteredInsights.filter(i => (i.confidence || 0) > 0.8).length;
    const critical = filteredInsights.filter(i => i.severity === 'critical').length;
    
    return { 
      total: filteredInsights.length,
      actionable,
      highConfidence,
      critical,
    };
  }, [filteredInsights]);

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          AI Insights
        </h1>
        <p className="text-gray-400 text-sm mt-1">Predictions, patterns, and recommendations from AI analysis</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1">
          <ChildSelector />
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Generating...' : 'Generate New Insights'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Insights</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Brain className="w-8 h-8 text-violet-400" />
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Actionable</p>
              <p className="text-2xl font-bold">{stats.actionable}</p>
            </div>
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">High Confidence</p>
              <p className="text-2xl font-bold">{stats.highConfidence}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Type Filter Tabs */}
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as typeof selectedType)}>
        <TabsList className="bg-white/5 border-white/10 w-full justify-start">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            All Types
          </TabsTrigger>
          {(['prediction', 'pattern', 'recommendation', 'comparison'] as InsightType[]).map(type => {
            const Icon = typeIcons[type];
            const count = groupedInsights[type].length;
            
            return (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {type.charAt(0).toUpperCase() + type.slice(1)}s ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedType} className="mt-6">
          {filteredInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.map(insight => (
                <div key={insight.id} className="relative">
                  <InsightCard
                    type={insight.type}
                    title={insight.title}
                    content={insight.description}
                    confidence={insight.confidence ? Math.round(insight.confidence * 100) : undefined}
                  />
                  
                  {/* Additional metadata */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insight.confidence && (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-xs">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    )}
                    {insight.relatedMemories !== undefined && insight.relatedMemories > 0 && (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-xs">
                        {insight.relatedMemories} related memories
                      </Badge>
                    )}
                    {insight.actionable && (
                      <Badge className="bg-gradient-to-r from-violet-500/20 to-blue-500/20 border-violet-500/30 text-xs">
                        Actionable
                      </Badge>
                    )}
                    {insight.category && (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-xs">
                        {insight.category}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-12">
              <div className="text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-medium text-white/80 mb-2">No insights available</h3>
                <p className="text-sm text-white/60 mb-4">
                  {activeChildId 
                    ? "Add more memories to generate AI insights"
                    : "Select a child to view personalized insights"}
                </p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="border-white/10 hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Insights
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}