'use client'

import { useState, useEffect } from 'react'
import { MemoryCard } from './MemoryCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Plus, 
  RefreshCw,
  Grid,
  List,
  Loader2
} from 'lucide-react'
import type { MemoryEntry, Child } from '@/lib/types'

interface MemoryFeedProps {
  familyId: string
  onCreateMemory?: () => void
  onMemoryClick?: (memoryId: string) => void
  className?: string
}

export function MemoryFeed({ 
  familyId, 
  onCreateMemory, 
  onMemoryClick,
  className = ''
}: MemoryFeedProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Load initial data
  useEffect(() => {
    loadMemories()
    loadChildren()
  }, [familyId])
  
  const loadMemories = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        family_id: familyId,
        limit: '50'
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await fetch(`/api/memories?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load memories')
      }
      
      const data = await response.json()
      setMemories(data.memories || [])
      
    } catch (error) {
      console.error('Error loading memories:', error)
      setMemories([])
    } finally {
      setLoading(false)
    }
  }
  
  const loadChildren = async () => {
    try {
      const response = await fetch(`/api/memories/create?family_id=${familyId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load children')
      }
      
      const data = await response.json()
      setChildren(data.children || [])
      
    } catch (error) {
      console.error('Error loading children:', error)
      setChildren([])
    }
  }
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadMemories()
  }
  
  const refreshMemories = () => {
    loadMemories()
  }
  
  const getChildById = (childId: string) => {
    return children.find(child => child.id === childId)
  }
  
  const filteredMemories = memories.filter(memory => {
    if (!searchTerm) return true
    return memory.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
           memory.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  })
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Family Memories</h2>
          <p className="text-gray-600">
            {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'} 
            {searchTerm && ` found for "${searchTerm}"`}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMemories}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          
          <Button onClick={onCreateMemory} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Memory
          </Button>
        </div>
      </div>
      
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search memories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </form>
      
      {/* Memory Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading memories...</span>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No memories found' : 'No memories yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? `Try searching for something else or create a new memory`
              : 'Start creating memories to build your family\'s story'
            }
          </p>
          <Button onClick={onCreateMemory}>
            <Plus className="w-4 h-4 mr-2" />
            {searchTerm ? 'Create New Memory' : 'Create First Memory'}
          </Button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredMemories.map(memory => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              child={memory.child_id ? getChildById(memory.child_id) : undefined}
              onCardClick={onMemoryClick}
              className={viewMode === 'list' ? 'max-w-none' : ''}
            />
          ))}
        </div>
      )}
    </div>
  )
} 