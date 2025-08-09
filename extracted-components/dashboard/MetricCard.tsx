'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MetricCard Component
 * 
 * A reusable card component for displaying metrics and statistics.
 * Supports trends, sparklines, and various display formats.
 * 
 * @component
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Memories"
 *   value={247}
 *   trend={{ value: 12, direction: 'up', label: 'from last week' }}
 *   icon={BookOpen}
 * />
 * ```
 */

export interface MetricTrend {
  /** Trend value (percentage or absolute) */
  value: number
  /** Direction of the trend */
  direction: 'up' | 'down' | 'neutral'
  /** Optional label for the trend */
  label?: string
}

export interface MetricCardProps {
  /** Title of the metric */
  title: string
  /** Main value to display */
  value: string | number
  /** Optional subtitle or description */
  subtitle?: string
  /** Trend information */
  trend?: MetricTrend
  /** Icon component to display */
  icon?: React.ComponentType<{ className?: string }>
  /** Color variant for the card */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Progress percentage (0-100) */
  progress?: number
  /** Additional CSS classes */
  className?: string
  /** Whether to show loading state */
  isLoading?: boolean
  /** Format function for the value */
  formatValue?: (value: string | number) => string
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = 'default',
  action,
  progress,
  className,
  isLoading = false,
  formatValue
}: MetricCardProps) {
  const variantClasses = {
    default: 'from-violet-600/10 to-blue-600/10 border-white/10',
    success: 'from-green-600/10 to-emerald-600/10 border-green-500/20',
    warning: 'from-amber-600/10 to-orange-600/10 border-amber-500/20',
    danger: 'from-red-600/10 to-rose-600/10 border-red-500/20',
    info: 'from-blue-600/10 to-cyan-600/10 border-blue-500/20'
  }

  const iconBgClasses = {
    default: 'bg-gradient-to-br from-violet-600 to-blue-600',
    success: 'bg-gradient-to-br from-green-600 to-emerald-600',
    warning: 'bg-gradient-to-br from-amber-600 to-orange-600',
    danger: 'bg-gradient-to-br from-red-600 to-rose-600',
    info: 'bg-gradient-to-br from-blue-600 to-cyan-600'
  }

  const getTrendIcon = () => {
    if (!trend) return null
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />
      case 'down':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return ''
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const displayValue = formatValue ? formatValue(value) : value

  if (isLoading) {
    return (
      <div 
        className={cn(
          'relative overflow-hidden rounded-xl border p-6',
          'bg-gradient-to-br',
          variantClasses[variant],
          className
        )}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
          <div className="h-8 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/3" />
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl border p-6',
        'bg-gradient-to-br backdrop-blur-sm',
        'transition-all duration-200 hover:shadow-lg',
        variantClasses[variant],
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div 
          className={cn(
            'absolute top-6 right-6 w-12 h-12 rounded-lg',
            'flex items-center justify-center',
            iconBgClasses[variant],
            'opacity-20'
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Title */}
        <p className="text-sm text-white/60 mb-2">{title}</p>

        {/* Value */}
        <p className="text-3xl font-bold text-white mb-1">
          {displayValue}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-white/40 mb-3">{subtitle}</p>
        )}

        {/* Trend */}
        {trend && (
          <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">
              {trend.direction === 'neutral' ? '' : trend.direction === 'up' ? '+' : '-'}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-white/40 ml-1">{trend.label}</span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  iconBgClasses[variant]
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'mt-4 flex items-center gap-2',
              'text-sm font-medium',
              'text-violet-400 hover:text-violet-300',
              'transition-colors duration-200',
              'group'
            )}
          >
            {action.label}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </div>
  )
}