'use client'

import React, { useState, useMemo } from 'react';
import { useFamily, useMemoryData } from '@/lib/stores/useAppStore';
import { MilestoneTimeline } from '@/components/dashboard/MilestoneTimeline';
import { ChildSelector } from '@/components/memory/shared/ChildSelector';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Calendar, Filter, TrendingUp, Baby, Brain, MessageCircle, Users, Heart } from 'lucide-react';

// Define milestone category type locally
type MilestoneCategory = 'physical' | 'cognitive' | 'social' | 'language' | 'emotional';

export default function MilestonesPage() {
  const { children, activeChildId } = useFamily();
  const { milestones } = useMemoryData();
  const [selectedCategory, setSelectedCategory] = useState<MilestoneCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Filter milestones based on selections
  const filteredMilestones = useMemo(() => {
    let filtered = [...milestones];

    // Filter by child
    if (activeChildId) {
      filtered = filtered.filter(m => m.childId === activeChildId);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateRange) {
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(m => new Date(m.achievedAt) >= cutoff);
    }

    // Sort by date descending
    return filtered.sort((a, b) => 
      new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
    );
  }, [milestones, activeChildId, selectedCategory, dateRange]);

  // Group milestones by month for timeline view
  const groupedMilestones = useMemo(() => {
    const groups: Record<string, typeof filteredMilestones> = {};
    
    filteredMilestones.forEach(milestone => {
      const date = new Date(milestone.achievedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(milestone);
    });
    
    return groups;
  }, [filteredMilestones]);

  const categoryIcons: Record<MilestoneCategory, React.ElementType> = {
    physical: Baby,
    cognitive: Brain,
    language: MessageCircle,
    social: Users,
    emotional: Heart,
  };

  const categoryColors: Record<MilestoneCategory, string> = {
    physical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cognitive: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    language: 'bg-green-500/20 text-green-400 border-green-500/30',
    social: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    emotional: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  };

  const getActiveChild = () => children.find(c => c.id === activeChildId);
  const activeChild = getActiveChild();

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredMilestones.length;
    const byCategory = filteredMilestones.reduce((acc, m) => {
      const category = m.category as MilestoneCategory;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Partial<Record<MilestoneCategory, number>>);
    
    const thisMonth = filteredMilestones.filter(m => {
      const date = new Date(m.achievedAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { total, byCategory, thisMonth };
  }, [filteredMilestones]);

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Milestones
        </h1>
        <p className="text-gray-400 text-sm mt-1">Track developmental achievements and progress</p>
      </div>

      {/* Child Selector and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <ChildSelector />
        </div>
        
        {/* Date Range Filter */}
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="year">This Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Milestones</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Award className="w-8 h-8 text-violet-400" />
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Most Active</p>
              <p className="text-lg font-semibold">
                {Object.entries(stats.byCategory).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Child</p>
              <p className="text-lg font-semibold">{activeChild?.name || 'All Children'}</p>
            </div>
            <div className="text-2xl">{activeChild?.emoji || '👶'}</div>
          </div>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className={`cursor-pointer ${
            selectedCategory === 'all' 
              ? 'bg-gradient-to-r from-violet-500 to-blue-500' 
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
          onClick={() => setSelectedCategory('all')}
        >
          <Filter className="w-3 h-3 mr-1" />
          All Categories
        </Badge>
        
        {(['physical', 'cognitive', 'language', 'social', 'emotional'] as MilestoneCategory[]).map(category => {
          const Icon = categoryIcons[category];
          const count = stats.byCategory[category] || 0;
          
          return (
            <Badge
              key={category}
              variant="outline"
              className={`cursor-pointer ${
                selectedCategory === category 
                  ? categoryColors[category]
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              <Icon className="w-3 h-3 mr-1" />
              {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Milestones Timeline */}
      {filteredMilestones.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedMilestones).map(([monthKey, monthMilestones]) => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            });
            
            return (
              <div key={monthKey}>
                <h3 className="text-lg font-semibold mb-3 text-white/80">{monthName}</h3>
                <MilestoneTimeline
                  milestones={monthMilestones.map(m => {
                    const child = children.find(c => c.id === m.childId);
                    return {
                      id: m.id,
                      child: child?.name || 'Unknown',
                      title: m.title,
                      date: m.achievedAt,
                      category: m.category,
                      aiConfidence: m.verifiedBy === 'ai' ? 85 : 100,
                      verified: m.verifiedBy === 'parent' || m.verifiedBy === 'both',
                      description: m.description,
                    };
                  })}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-12">
          <div className="text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-medium text-white/80 mb-2">No milestones found</h3>
            <p className="text-sm text-white/60">
              {activeChildId 
                ? "Start tracking milestones to see them appear here"
                : "Select a child to view their milestones"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}