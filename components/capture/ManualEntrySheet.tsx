'use client'

import React, { useState } from 'react'
import { X, Camera, Video, MapPin, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ManualEntrySheet Component
 * 
 * A comprehensive bottom sheet for detailed memory entry with multiple input fields.
 * Includes child selection, tags, location, mood, weather, and more.
 * 
 * @component
 * @example
 * ```tsx
 * <ManualEntrySheet
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={(data) => console.log('Memory data:', data)}
 *   children={[{ id: '1', name: 'Emma' }, { id: '2', name: 'Lucas' }]}
 * />
 * ```
 */

export interface ManualMemoryData {
  childId: string | 'both'
  description: string
  date: string
  time: string
  location?: string
  weather?: string
  mood?: string
  tags: string[]
  whoWasThere: string[]
  parentInsight?: string
  activityLevel?: 'low' | 'medium' | 'high' | 'very-high'
  healthStatus?: string
  sleepQuality?: string
  mealTiming?: string
  isPrivate: boolean
}

export interface ManualEntrySheetProps {
  /** Whether the sheet is open */
  isOpen: boolean
  /** Callback fired when sheet is closed */
  onClose: () => void
  /** Callback fired when form is submitted */
  onSubmit: (data: ManualMemoryData) => void
  /** List of children to select from */
  children?: Array<{ id: string; name: string; avatar?: string }>
  /** Additional CSS classes */
  className?: string
}

const TAGS = [
  { icon: '🎯', label: 'Milestone' },
  { icon: '💬', label: 'Language' },
  { icon: '🧩', label: 'Cognitive' },
  { icon: '🤝', label: 'Social' },
  { icon: '🏃', label: 'Physical' },
  { icon: '😊', label: 'Emotional' },
  { icon: '🎨', label: 'Creative' },
  { icon: '🍽️', label: 'Eating' },
  { icon: '😴', label: 'Sleep' },
]

const WHO_WAS_THERE = ['Mom', 'Dad', 'Sibling', 'Grandparents', 'Friends', 'Caregiver']

export function ManualEntrySheet({
  isOpen,
  onClose,
  onSubmit,
  children = [],
  className
}: ManualEntrySheetProps) {
  const [formData, setFormData] = useState<Partial<ManualMemoryData>>({
    childId: children[0]?.id || '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    tags: [],
    whoWasThere: [],
    isPrivate: false
  })

  const handleSubmit = () => {
    if (!formData.childId || !formData.description?.trim()) {
      return
    }
    
    onSubmit(formData as ManualMemoryData)
    // Reset form
    setFormData({
      childId: children[0]?.id || '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      tags: [],
      whoWasThere: [],
      isPrivate: false
    })
    onClose()
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }))
  }

  const togglePerson = (person: string) => {
    setFormData(prev => ({
      ...prev,
      whoWasThere: prev.whoWasThere?.includes(person)
        ? prev.whoWasThere.filter(p => p !== person)
        : [...(prev.whoWasThere || []), person]
    }))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/70 backdrop-blur-sm z-40',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'max-h-[85vh] bg-zinc-900/98 backdrop-blur-xl',
          'rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/98 backdrop-blur rounded-t-3xl">
          <h3 className="text-lg font-semibold text-white">Add Detailed Memory</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-60px)] space-y-6">
          {/* Child Selection */}
          {children.length > 0 && (
            <div>
              <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
                Select Child
              </label>
              <div className="flex gap-3">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => setFormData(prev => ({ ...prev, childId: child.id }))}
                    className={cn(
                      'flex-1 p-3 rounded-lg border transition-all',
                      formData.childId === child.id
                        ? 'bg-violet-600/20 border-violet-600 text-violet-400'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                    )}
                  >
                    <div className="text-xl mb-1">{child.avatar || '👶'}</div>
                    <div className="text-sm">{child.name}</div>
                  </button>
                ))}
                {children.length > 1 && (
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, childId: 'both' }))}
                    className={cn(
                      'flex-1 p-3 rounded-lg border transition-all',
                      formData.childId === 'both'
                        ? 'bg-violet-600/20 border-violet-600 text-violet-400'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                    )}
                  >
                    <div className="text-xl mb-1">👫</div>
                    <div className="text-sm">Both</div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Memory Description */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Memory Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What happened? Be as detailed as you'd like..."
              className="w-full min-h-[100px] p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 resize-none"
            />
          </div>

          {/* Date and Time */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              When Did This Happen?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-violet-500/50"
              />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className="p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Home, Park, Grandma's house..."
                className="w-full p-3 pl-10 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Categories (Select All That Apply)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag.label}
                  onClick={() => toggleTag(tag.label)}
                  className={cn(
                    'p-2 rounded-lg border text-sm transition-all',
                    formData.tags?.includes(tag.label)
                      ? 'bg-violet-600/20 border-violet-600 text-violet-400'
                      : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                  )}
                >
                  {tag.icon} {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Who Was There */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Who Was There?
            </label>
            <div className="flex flex-wrap gap-2">
              {WHO_WAS_THERE.map(person => (
                <button
                  key={person}
                  onClick={() => togglePerson(person)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-sm transition-all',
                    formData.whoWasThere?.includes(person)
                      ? 'bg-violet-600/20 border-violet-600 text-violet-400'
                      : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                  )}
                >
                  {person}
                </button>
              ))}
            </div>
          </div>

          {/* Parent Insight */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Parent Insight & Reflection
            </label>
            <textarea
              value={formData.parentInsight || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, parentInsight: e.target.value }))}
              placeholder="What did you notice about your child? Any thoughts on their development?"
              className="w-full min-h-[80px] p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          {/* Media Attachments */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Attach Media (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-5 bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors flex flex-col items-center gap-2">
                <Camera className="w-6 h-6 text-white/60" />
                <span className="text-sm text-white/60">Add Photo</span>
              </button>
              <button className="p-5 bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors flex flex-col items-center gap-2">
                <Video className="w-6 h-6 text-white/60" />
                <span className="text-sm text-white/60">Add Video</span>
              </button>
            </div>
          </div>

          {/* Privacy Setting */}
          <div>
            <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">
              Privacy
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, isPrivate: true }))}
                className={cn(
                  'flex-1 p-3 rounded-lg border transition-all',
                  formData.isPrivate
                    ? 'bg-violet-600/20 border-violet-600 text-violet-400'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                )}
              >
                🔒 Private
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, isPrivate: false }))}
                className={cn(
                  'flex-1 p-3 rounded-lg border transition-all',
                  !formData.isPrivate
                    ? 'bg-violet-600/20 border-violet-600 text-violet-400'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                )}
              >
                👨‍👩‍👧‍👦 Family
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!formData.childId || !formData.description?.trim()}
            className={cn(
              'w-full py-4 rounded-lg font-medium transition-all',
              'bg-gradient-to-r from-violet-600 to-blue-600',
              'text-white shadow-lg',
              formData.childId && formData.description?.trim()
                ? 'hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]'
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            Save Memory
          </button>
        </div>
      </div>
    </>
  )
}