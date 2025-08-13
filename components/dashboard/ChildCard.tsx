'use client'

import React from 'react'
import { 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  Target, 
  Clock,
  ChevronRight,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ChildCard Component
 * 
 * Displays child profile information including stats, development score, and recent activity.
 * Can be used in grid layouts for multiple children or as a standalone profile card.
 * 
 * @component
 * @example
 * ```tsx
 * <ChildCard
 *   child={{
 *     id: '1',
 *     name: 'Emma',
 *     age: { value: 2, unit: 'years', months: 3 },
 *     avatar: '👧',
 *     totalMemories: 142,
 *     milestones: 18,
 *     lastEntry: '2 hours ago',
 *     developmentScore: 94
 *   }}
 *   onViewTimeline={(id) => console.log('View timeline for:', id)}
 * />
 * ```
 */

export interface ChildData {
  /** Unique identifier */
  id: string
  /** Child's name */
  name: string
  /** Age information */
  age: {
    value: number
    unit: 'months' | 'years'
    months?: number
  }
  /** Avatar emoji or URL */
  avatar?: string
  /** Avatar image URL */
  avatarUrl?: string
  /** Total number of memories */
  totalMemories: number
  /** Number of milestones achieved */
  milestones: number
  /** Time since last entry */
  lastEntry: string
  /** Overall development score (0-100) */
  developmentScore: number
  /** Average memories per week */
  avgMemoriesPerWeek?: number
  /** Recent milestone */
  recentMilestone?: string
}

export interface ChildCardProps {
  /** Child data to display */
  child?: ChildData
  /** Callback when view timeline is clicked */
  onViewTimeline?: (childId: string) => void
  /** Callback when card is clicked */
  onClick?: (childId: string) => void
  /** Whether this is an "add child" card */
  isAddCard?: boolean
  /** Callback for add child action */
  onAddChild?: () => void
  /** Additional CSS classes */
  className?: string
  /** Card variant */
  variant?: 'default' | 'compact'
}

export function ChildCard({
  child,
  onViewTimeline,
  onClick,
  isAddCard = false,
  onAddChild,
  className,
  variant = 'default'
}: ChildCardProps) {
  // Add Child Card
  if (isAddCard) {
    return (
      <div
        onClick={onAddChild}
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed',
          'border-white/20 bg-white/5',
          'min-h-[280px] flex items-center justify-center',
          'cursor-pointer transition-all duration-200',
          'hover:bg-white/10 hover:border-white/30',
          'group',
          className
        )}
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 transition-all duration-200 group-hover:scale-110 group-hover:bg-white/20">
            <Plus className="w-8 h-8 text-white/60" />
          </div>
          <p className="text-white/60 font-medium">Add Child</p>
          <p className="text-white/40 text-sm mt-1">Track another child's journey</p>
        </div>
      </div>
    )
  }

  if (!child) return null

  const formatAge = () => {
    if (child.age.unit === 'years' && child.age.months) {
      return `${child.age.value} year${child.age.value !== 1 ? 's' : ''} ${child.age.months} month${child.age.months !== 1 ? 's' : ''}`
    }
    return `${child.age.value} ${child.age.unit}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-600 to-emerald-600'
    if (score >= 70) return 'from-blue-600 to-cyan-600'
    if (score >= 50) return 'from-amber-600 to-yellow-600'
    return 'from-red-600 to-orange-600'
  }

  const getAvatarGradient = () => {
    const gradients = [
      'from-violet-600 to-purple-600',
      'from-blue-600 to-cyan-600',
      'from-pink-600 to-rose-600',
      'from-green-600 to-emerald-600'
    ]
    return gradients[child.name.charCodeAt(0) % gradients.length]
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={() => onClick?.(child.id)}
        className={cn(
          'relative overflow-hidden rounded-xl border',
          'bg-white/5 backdrop-blur-sm border-white/10',
          'p-4 cursor-pointer transition-all duration-200',
          'hover:bg-white/10 hover:border-white/20',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
            'bg-gradient-to-br shadow-lg',
            getAvatarGradient()
          )}>
            {child.avatarUrl ? (
              <img src={child.avatarUrl} alt={child.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{child.avatar || child.name[0]}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-white">{child.name}</h3>
            <p className="text-sm text-white/60">{formatAge()}</p>
          </div>

          {/* Stats */}
          <div className="text-right">
            <p className="text-lg font-semibold text-white">{child.totalMemories}</p>
            <p className="text-xs text-white/40">memories</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onClick?.(child.id)}
      className={cn(
        'relative overflow-hidden rounded-xl border',
        'bg-white/5 backdrop-blur-sm border-white/10',
        'p-6 cursor-pointer transition-all duration-200',
        'hover:bg-white/10 hover:border-white/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        {/* Avatar */}
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center text-3xl',
          'bg-gradient-to-br shadow-lg',
          getAvatarGradient()
        )}>
          {child.avatarUrl ? (
            <img src={child.avatarUrl} alt={child.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{child.avatar || child.name[0]}</span>
          )}
        </div>

        {/* Name and Age */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white">{child.name}</h3>
          <p className="text-sm text-white/60 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Age: {formatAge()}
          </p>
        </div>
      </div>

      {/* Development Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Development Score</span>
          <span className="text-sm font-semibold text-white">{child.developmentScore}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              'bg-gradient-to-r',
              getScoreColor(child.developmentScore)
            )}
            style={{ width: `${child.developmentScore}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs">Total Memories</span>
          </div>
          <p className="text-lg font-semibold text-white">{child.totalMemories}</p>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs">Milestones</span>
          </div>
          <p className="text-lg font-semibold text-white">{child.milestones}</p>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Last Entry</span>
          </div>
          <p className="text-sm font-medium text-white">{child.lastEntry}</p>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Avg/Week</span>
          </div>
          <p className="text-sm font-medium text-white">
            {child.avgMemoriesPerWeek || 12} memories
          </p>
        </div>
      </div>

      {/* Recent Milestone */}
      {child.recentMilestone && (
        <div className="mb-5 p-3 bg-gradient-to-r from-violet-600/10 to-blue-600/10 rounded-lg border border-violet-500/20">
          <p className="text-xs text-violet-400 mb-1">Recent Milestone</p>
          <p className="text-sm text-white">{child.recentMilestone}</p>
        </div>
      )}

      {/* View Timeline Button */}
      {onViewTimeline && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewTimeline(child.id)
          }}
          className={cn(
            'w-full py-3 rounded-lg',
            'bg-white/10 hover:bg-white/20',
            'border border-white/20 hover:border-white/30',
            'text-white font-medium text-sm',
            'flex items-center justify-center gap-2',
            'transition-all duration-200',
            'group'
          )}
        >
          View Timeline
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      )}
    </div>
  )
}