'use client'

import React from 'react'
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  AlertCircle,
  ChevronRight,
  Brain,
  Target,
  BarChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * InsightCard Component
 * 
 * Displays AI-generated insights, predictions, and recommendations.
 * Supports different insight types with appropriate visual styling.
 * 
 * @component
 * @example
 * ```tsx
 * <InsightCard
 *   type="prediction"
 *   title="Next Milestone Prediction"
 *   content="Based on Emma's progress, she's likely to start jumping with both feet within 2-3 weeks."
 *   confidence={85}
 *   onAction={() => console.log('View details')}
 * />
 * ```
 */

export type InsightType = 'prediction' | 'pattern' | 'recommendation' | 'comparison' | 'milestone' | 'alert'

export interface InsightCardProps {
  /** Type of insight */
  type: InsightType
  /** Title of the insight */
  title: string
  /** Main content/description */
  content: string
  /** Optional confidence score (0-100) */
  confidence?: number
  /** Optional icon override */
  icon?: React.ComponentType<{ className?: string }>
  /** Action button configuration */
  action?: {
    label: string
    onClick: () => void
  }
  /** Additional metadata to display */
  metadata?: Array<{
    label: string
    value: string | number
  }>
  /** Priority level for styling */
  priority?: 'low' | 'medium' | 'high'
  /** Additional CSS classes */
  className?: string
  /** Whether the card is dismissible */
  dismissible?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
}

export function InsightCard({
  type,
  title,
  content,
  confidence,
  icon: CustomIcon,
  action,
  metadata,
  priority = 'medium',
  className,
  dismissible = false,
  onDismiss
}: InsightCardProps) {
  const getDefaultIcon = () => {
    switch (type) {
      case 'prediction':
        return Sparkles
      case 'pattern':
        return TrendingUp
      case 'recommendation':
        return Lightbulb
      case 'comparison':
        return BarChart
      case 'milestone':
        return Target
      case 'alert':
        return AlertCircle
      default:
        return Brain
    }
  }

  const Icon = CustomIcon || getDefaultIcon()

  const typeStyles = {
    prediction: {
      bg: 'from-purple-600/10 to-violet-600/10',
      border: 'border-purple-500/20',
      icon: 'from-purple-600 to-violet-600',
      text: 'text-purple-400'
    },
    pattern: {
      bg: 'from-blue-600/10 to-cyan-600/10',
      border: 'border-blue-500/20',
      icon: 'from-blue-600 to-cyan-600',
      text: 'text-blue-400'
    },
    recommendation: {
      bg: 'from-amber-600/10 to-yellow-600/10',
      border: 'border-amber-500/20',
      icon: 'from-amber-600 to-yellow-600',
      text: 'text-amber-400'
    },
    comparison: {
      bg: 'from-green-600/10 to-emerald-600/10',
      border: 'border-green-500/20',
      icon: 'from-green-600 to-emerald-600',
      text: 'text-green-400'
    },
    milestone: {
      bg: 'from-pink-600/10 to-rose-600/10',
      border: 'border-pink-500/20',
      icon: 'from-pink-600 to-rose-600',
      text: 'text-pink-400'
    },
    alert: {
      bg: 'from-red-600/10 to-orange-600/10',
      border: 'border-red-500/20',
      icon: 'from-red-600 to-orange-600',
      text: 'text-red-400'
    }
  }

  const style = typeStyles[type] || typeStyles.pattern // Default fallback to pattern style

  const priorityIndicator = {
    low: 'bg-gray-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500'
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6',
        'bg-gradient-to-br backdrop-blur-sm',
        'transition-all duration-200 hover:shadow-lg',
        style.bg,
        style.border,
        className
      )}
    >
      {/* Priority Indicator */}
      {priority === 'high' && (
        <div className={cn('absolute top-0 right-0 w-20 h-20')}>
          <div className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', priorityIndicator[priority], 'animate-pulse')} />
        </div>
      )}

      {/* Dismiss Button */}
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Dismiss insight"
        >
          <span className="text-white/60 text-xs">✕</span>
        </button>
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg',
            'bg-gradient-to-br flex items-center justify-center',
            style.icon
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Title */}
          <h3 className="text-lg font-semibold text-white">
            {title}
          </h3>

          {/* Description */}
          <p className="text-white/70 leading-relaxed">
            {content}
          </p>

          {/* Confidence Score */}
          {confidence !== undefined && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">AI Confidence</span>
              <div className="flex-1 max-w-[200px]">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      'bg-gradient-to-r',
                      style.icon
                    )}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
              <span className={cn('text-sm font-medium', style.text)}>
                {confidence}%
              </span>
            </div>
          )}

          {/* Metadata */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-2">
              {metadata.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{item.label}:</span>
                  <span className="text-sm font-medium text-white/80">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'inline-flex items-center gap-2 mt-3',
                'px-4 py-2 rounded-lg',
                'bg-white/10 hover:bg-white/20',
                'text-sm font-medium text-white',
                'transition-all duration-200',
                'group'
              )}
            >
              {action.label}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}