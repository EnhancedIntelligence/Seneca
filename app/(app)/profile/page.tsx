'use client';

/**
 * User Profile Page
 * View and manage user profile
 */

import { useEffect } from 'react';
import { useAuthContext } from '@/lib/contexts/AuthContext';
import { useFamily, useMemoryData } from '@/lib/stores/useAppStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  Calendar,
  Award,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Edit
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatTimestamp } from '@/lib/stores/mockData';

export default function ProfilePage() {
  const { user, logout } = useAuthContext();
  const { children } = useFamily();
  const { memories, milestones } = useMemoryData();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  // Calculate stats
  const totalMemories = memories.length;
  const totalMilestones = milestones.length;
  const totalChildren = children.length;
  const memberSince = new Date(user.createdAt).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate activity
  const thisWeek = memories.filter(m => {
    const date = new Date(m.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date > weekAgo;
  }).length;

  const thisMonth = memories.filter(m => {
    const date = new Date(m.timestamp);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return date > monthAgo;
  }).length;

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-gray-400 mt-1">Your account information and statistics</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <Avatar className="w-20 h-20 bg-gradient-to-r from-violet-600 to-blue-600">
              <div className="flex items-center justify-center w-full h-full text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <div className="flex items-center gap-2 text-gray-400 mt-1">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 mt-1">
                <Calendar className="w-4 h-4" />
                <span>Member since {memberSince}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                  Free Plan
                </Badge>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings')}
            className="bg-white/5 border-white/10"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 text-violet-400" />
            <div>
              <div className="text-2xl font-bold">{totalMemories}</div>
              <div className="text-sm text-gray-400">Total Memories</div>
            </div>
          </div>
          <Progress value={Math.min((totalMemories / 100) * 100, 100)} className="h-2" />
          <p className="text-xs text-gray-400 mt-2">
            {thisWeek} this week • {thisMonth} this month
          </p>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold">{totalMilestones}</div>
              <div className="text-sm text-gray-400">Milestones</div>
            </div>
          </div>
          <Progress value={Math.min((totalMilestones / 50) * 100, 100)} className="h-2" />
          <p className="text-xs text-gray-400 mt-2">
            Tracking development progress
          </p>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold">{totalChildren}</div>
              <div className="text-sm text-gray-400">Children</div>
            </div>
          </div>
          <Progress value={Math.min((totalChildren / 5) * 100, 100)} className="h-2" />
          <p className="text-xs text-gray-400 mt-2">
            Family members tracked
          </p>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {memories.slice(0, 5).map((memory) => {
            const child = children.find(c => c.id === memory.childId);
            return (
              <div key={memory.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="text-2xl">{child?.emoji || '👶'}</div>
                <div className="flex-1">
                  <p className="text-sm">{memory.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{child?.name}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(memory.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="bg-white/5 border-white/10"
            onClick={() => router.push('/capture')}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Add Memory
          </Button>
          <Button
            variant="outline"
            className="bg-white/5 border-white/10"
            onClick={() => router.push('/children')}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Children
          </Button>
          <Button
            variant="outline"
            className="bg-white/5 border-white/10"
            onClick={() => router.push('/settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            className="bg-white/5 border-white/10 text-red-400 hover:text-red-300"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </Card>

      {/* Subscription Status */}
      <Card className="bg-gradient-to-r from-violet-600/10 to-blue-600/10 border-violet-500/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Free Plan</h3>
            <p className="text-sm text-gray-400">
              {100 - totalMemories} memories remaining this month
            </p>
            <div className="flex gap-4 mt-2 text-sm text-gray-400">
              <span>✓ 100 memories/month</span>
              <span>✓ 2 children</span>
              <span>✓ Basic AI insights</span>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-violet-600 to-blue-600">
            Upgrade to Pro
          </Button>
        </div>
      </Card>
    </div>
  );
}