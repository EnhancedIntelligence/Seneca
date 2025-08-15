'use client'

import React from 'react'
import { CheckCircle, Circle, AlertCircle, Calendar, User, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MilestoneTimeline Component
 * 
 * Displays developmental milestones in a vertical timeline format.
 * Shows verification status, AI confidence, and categorization.
 * 
 * @component
 * @example
 * ```tsx
 * <MilestoneTimeline
 *   milestones={[
 *     {
 *       id: '1',
 *       child: 'Emma',
 *       title: 'First steps without support',
 *       date: '2025-01-28',
 *       category: 'Physical',
 *       aiConfidence: 96,
 *       verified: true
 *     }
 *   ]}
 *   onMilestoneClick={(id) => console.log('Milestone clicked:', id)}
 * />
 * ```
 */

export interface Milestone {
  /** Unique identifier */
  id: string
  /** Child's name */
  child: string
  /** Milestone title/description */
  title: string
  /** Date of the milestone */
  date: string
  /** Category of the milestone */
  category: string
  /** AI confidence percentage (0-100) */
  aiConfidence: number
  /** Whether the milestone has been verified */
  verified: boolean
  /** Optional description */
  description?: string
  /** Optional media URLs */
  mediaUrls?: string[]
}

export interface MilestoneTimelineProps {
  /** Array of milestones to display */
  milestones: Milestone[]
  /** Callback when a milestone is clicked */
  onMilestoneClick?: (id: string) => void
  /** Whether to show the timeline line */
  showTimeline?: boolean
  /** Whether to group by date */
  groupByDate?: boolean
  /** Additional CSS classes */
  className?: string
  /** Empty state message */
  emptyMessage?: string
}

export function MilestoneTimeline({
  milestones,
  onMilestoneClick,
  showTimeline = true,
  groupByDate = false,
  className,
  emptyMessage = 'No milestones recorded yet'
}: MilestoneTimelineProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Physical: 'from-blue-600 to-cyan-600',
      Cognitive: 'from-purple-600 to-violet-600',
      Social: 'from-green-600 to-emerald-600',
      Language: 'from-amber-600 to-yellow-600',
      Emotional: 'from-pink-600 to-rose-600',
      Creative: 'from-indigo-600 to-purple-600',
      'Self-care': 'from-teal-600 to-green-600'
    }
    return colors[category] || 'from-gray-600 to-gray-400'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400'
    if (confidence >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }
  }

  if (milestones.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-white/40" />
        </div>
        <p className="text-white/60 text-center">{emptyMessage}</p>
      </div>
    )
  }

  // Group milestones by date if requested
  const groupedMilestones = groupByDate
    ? milestones.reduce((groups, milestone) => {
        const date = milestone.date
        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(milestone)
        return groups
      }, {} as Record<string, Milestone[]>)
    : { all: milestones }

  return (
    <div className={cn('relative', className)}>
      {showTimeline && (
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-violet-600/30 via-blue-600/30 to-transparent" />
      )}

      <div className="space-y-6">
        {Object.entries(groupedMilestones).map(([date, dateMilestones]) => (
          <div key={date}>
            {groupByDate && date !== 'all' && (
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white/60">
                  {formatDate(date)}
                </span>
              </div>
            )}

            <div className="space-y-4">
              {dateMilestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className={cn(
                    'relative flex gap-4',
                    onMilestoneClick && 'cursor-pointer group'
                  )}
                  onClick={() => onMilestoneClick?.(milestone.id)}
                >
                  {/* Timeline Dot */}
                  {showTimeline && (
                    <div className="relative flex-shrink-0 w-10 flex justify-center">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full border-2 border-zinc-900',
                          'transition-all duration-200',
                          milestone.verified
                            ? 'bg-green-500 shadow-lg shadow-green-500/30'
                            : 'bg-amber-500 shadow-lg shadow-amber-500/30',
                          onMilestoneClick && 'group-hover:scale-125'
                        )}
                      />
                    </div>
                  )}

                  {/* Content Card */}
                  <div
                    className={cn(
                      'flex-1 rounded-xl border p-4',
                      'bg-white/5 backdrop-blur-sm border-white/10',
                      'transition-all duration-200',
                      onMilestoneClick && 'hover:bg-white/10 hover:border-white/20'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">
                          {milestone.title}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{milestone.child}</span>
                          </div>
                          {!groupByDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(milestone.date)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification Status */}
                      <div className="flex items-center gap-2">
                        {milestone.verified ? (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                            <Circle className="w-3 h-3" />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {milestone.description && (
                      <p className="text-sm text-white/70 mb-3">
                        {milestone.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      {/* Category Tag */}
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium text-white',
                            'bg-gradient-to-r',
                            getCategoryColor(milestone.category)
                          )}
                        >
                          {milestone.category}
                        </div>
                      </div>

                      {/* AI Confidence */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">AI Confidence:</span>
                        <span className={cn('text-sm font-medium', getConfidenceColor(milestone.aiConfidence))}>
                          {milestone.aiConfidence}%
                        </span>
                      </div>
                    </div>

                    {/* Media Indicator */}
                    {milestone.mediaUrls && milestone.mediaUrls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>📷 {milestone.mediaUrls.length} media file{milestone.mediaUrls.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}