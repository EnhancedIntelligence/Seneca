'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// Simple Avatar component for this file
const Avatar = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ''}`} {...props}>
    {children}
  </div>
)

const AvatarImage = ({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img className={`aspect-square h-full w-full object-cover ${className || ''}`} {...props} />
)

const AvatarFallback = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 ${className || ''}`} {...props}>
    {children}
  </div>
)
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Star, 
  MessageCircle, 
  Heart,
  Eye,
  MoreVertical,
  Tag,
  Brain,
  Sparkles,
  Image as ImageIcon,
  Video
} from 'lucide-react'
// Simple date formatting utility
const formatDistanceToNow = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  return 'Just now'
}
import type { MemoryEntry, Child } from '@/lib/types'

interface MemoryCardProps {
  memory: MemoryEntry
  child?: Child
  onCardClick?: (memoryId: string) => void
  onLike?: (memoryId: string) => void
  onComment?: (memoryId: string) => void
  className?: string
}

export function MemoryCard({ 
  memory, 
  child, 
  onCardClick,
  onLike,
  onComment,
  className = ''
}: MemoryCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
    onLike?.(memory.id)
  }
  
  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation()
    onComment?.(memory.id)
  }
  
  const handleCardClick = () => {
    onCardClick?.(memory.id)
  }
  
  const hasMedia = (memory.image_urls && memory.image_urls.length > 0) || 
                   (memory.video_urls && memory.video_urls.length > 0)
  
  const processingStatusColor = {
    'queued': 'bg-yellow-500',
    'processing_classification': 'bg-blue-500',
    'categorized': 'bg-blue-600',
    'processing_embedding': 'bg-purple-500',
    'embedded': 'bg-purple-600',
    'processing': 'bg-blue-500',
    'completed': 'bg-green-500',
    'failed': 'bg-red-500',
    'error': 'bg-red-500'
  }[memory.processing_status] || 'bg-gray-500'
  
  const processingStatusText = {
    'queued': 'Queued',
    'processing_classification': 'Analyzing...',
    'categorized': 'Categorized',
    'processing_embedding': 'Embedding...',
    'embedded': 'Embedded',
    'processing': 'Processing...',
    'completed': 'AI Processed',
    'failed': 'Failed',
    'error': 'Error'
  }[memory.processing_status] || 'Unknown'
  
  const truncatedContent = memory.content.length > 150 
    ? memory.content.substring(0, 150) + '...'
    : memory.content
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-shadow duration-200 ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {child && (
              <Avatar className="w-10 h-10">
                <AvatarImage 
                  src={child.profile_image_url || undefined} 
                  alt={child.name} 
                />
                <AvatarFallback>
                  {child.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className="font-semibold text-lg leading-tight">
                {memory.title || 'Untitled Memory'}
              </h3>
              {child && (
                <p className="text-sm text-gray-600">{child.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className={`text-xs ${processingStatusColor} text-white`}
            >
              {processingStatusText}
            </Badge>
            <Button variant="ghost" size="sm" className="p-1">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Memory Content */}
        <div className="space-y-2">
          <p className="text-gray-700 leading-relaxed">
            {showFullContent ? memory.content : truncatedContent}
          </p>
          {memory.content.length > 150 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
              onClick={(e) => {
                e.stopPropagation()
                setShowFullContent(!showFullContent)
              }}
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </Button>
          )}
        </div>
        
        {/* Media Preview */}
        {hasMedia && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {memory.image_urls && memory.image_urls.length > 0 && (
              <div className="flex items-center space-x-1">
                <ImageIcon className="w-4 h-4" />
                <span>{memory.image_urls.length} photo{memory.image_urls.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {memory.video_urls && memory.video_urls.length > 0 && (
              <div className="flex items-center space-x-1">
                <Video className="w-4 h-4" />
                <span>{memory.video_urls.length} video{memory.video_urls.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {memory.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {memory.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{memory.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {/* AI Insights */}
        {memory.processing_status === 'completed' && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">AI Insights</span>
            </div>
            <div className="space-y-1 text-sm">
              {memory.milestone_detected && (
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  <span className="text-gray-700">
                    Milestone detected: {memory.milestone_type}
                  </span>
                  {memory.milestone_confidence && (
                    <span className="text-xs text-gray-500">
                      ({Math.round(memory.milestone_confidence * 100)}% confidence)
                    </span>
                  )}
                </div>
              )}
              {memory.category && (
                <div className="flex items-center space-x-2">
                  <Star className="w-3 h-3 text-blue-500" />
                  <span className="text-gray-700">
                    Category: {memory.category.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Location */}
        {memory.location_name && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{memory.location_name}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>
                {memory.memory_date 
                  ? formatDistanceToNow(new Date(memory.memory_date))
                  : formatDistanceToNow(new Date(memory.created_at))
                }
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(memory.created_at))}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
              onClick={handleLike}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-gray-500"
              onClick={handleComment}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-gray-500"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
} 