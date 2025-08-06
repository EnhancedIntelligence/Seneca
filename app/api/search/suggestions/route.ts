import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  withApiHandler, 
  authenticateRequest, 
  verifyFamilyAccess,
  validateQueryParams,
  createSuccessResponse
} from '@/lib/api-utils'
import { createAdminClient } from '@/lib/server-only/admin-client'

// Search suggestions request validation schema
const suggestionsQuerySchema = z.object({
  query: z.string().min(1).max(100),
  familyId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(20).default(10)
})

type SuggestionsQuery = z.infer<typeof suggestionsQuerySchema>

/**
 * Search Suggestions API
 * Provides intelligent search suggestions based on existing memories
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  // Authenticate user
  const user = await authenticateRequest(request)
  
  // Validate query parameters
  const params = validateQueryParams(request, suggestionsQuerySchema)
  
  // Verify family access
  await verifyFamilyAccess(user.id, params.familyId)
  
  // Get search suggestions
  const suggestions = await getSearchSuggestions(params)
  
  return createSuccessResponse({
    suggestions,
    query: params.query,
    suggestion_types: {
      categories: suggestions.filter(s => s.type === 'category').length,
      tags: suggestions.filter(s => s.type === 'tag').length,
      children: suggestions.filter(s => s.type === 'child').length,
      locations: suggestions.filter(s => s.type === 'location').length
    }
  })
})

async function getSearchSuggestions(params: SuggestionsQuery): Promise<Array<{
  text: string
  type: 'category' | 'tag' | 'child' | 'location'
  count: number
  relevance_score: number
}>> {
  const adminClient = createAdminClient()
  const query = params.query.toLowerCase()
  
  try {
    // Get category suggestions
    const { data: categories } = await adminClient
      .from('memory_entries')
      .select('category')
      .eq('family_id', params.familyId)
      .not('category', 'is', null)
      .ilike('category', `%${query}%`)
      .limit(params.limit)

    // Get tag suggestions
    const { data: tagData } = await adminClient
      .from('memory_entries')
      .select('tags')
      .eq('family_id', params.familyId)
      .not('tags', 'is', null)
      .limit(100) // Get more to filter through

    // Get child name suggestions
    const { data: children } = await adminClient
      .from('children')
      .select('name, id')
      .eq('family_id', params.familyId)
      .ilike('name', `%${query}%`)
      .limit(params.limit)

    // Get location suggestions
    const { data: locations } = await adminClient
      .from('memory_entries')
      .select('location_name')
      .eq('family_id', params.familyId)
      .not('location_name', 'is', null)
      .ilike('location_name', `%${query}%`)
      .limit(params.limit)

    const suggestions: Array<{
      text: string
      type: 'category' | 'tag' | 'child' | 'location'
      count: number
      relevance_score: number
    }> = []

    // Process category suggestions
    const categoryGroups = groupAndCount(categories?.map(c => c.category) || [])
    for (const [category, count] of Array.from(categoryGroups)) {
      if (category && category.toLowerCase().includes(query)) {
        suggestions.push({
          text: category,
          type: 'category',
          count,
          relevance_score: calculateRelevanceScore(category, query)
        })
      }
    }

    // Process tag suggestions
    const allTags = tagData?.flatMap(t => t.tags || []) || []
    const tagGroups = groupAndCount(allTags)
    for (const [tag, count] of Array.from(tagGroups)) {
      if (tag && tag.toLowerCase().includes(query)) {
        suggestions.push({
          text: tag,
          type: 'tag',
          count,
          relevance_score: calculateRelevanceScore(tag, query)
        })
      }
    }

    // Process child suggestions
    children?.forEach(child => {
      if (child.name && child.name.toLowerCase().includes(query)) {
        suggestions.push({
          text: child.name,
          type: 'child',
          count: 1, // Children are unique
          relevance_score: calculateRelevanceScore(child.name, query)
        })
      }
    })

    // Process location suggestions
    const locationGroups = groupAndCount(locations?.map(l => l.location_name) || [])
    for (const [location, count] of Array.from(locationGroups)) {
      if (location && location.toLowerCase().includes(query)) {
        suggestions.push({
          text: location,
          type: 'location',
          count,
          relevance_score: calculateRelevanceScore(location, query)
        })
      }
    }

    // Sort by relevance score and count, then limit
    return suggestions
      .sort((a, b) => {
        if (b.relevance_score !== a.relevance_score) {
          return b.relevance_score - a.relevance_score
        }
        return b.count - a.count
      })
      .slice(0, params.limit)

  } catch (error) {
    console.error('Search suggestions error:', error)
    return []
  }
}

function groupAndCount<T>(items: T[]): Map<T, number> {
  const groups = new Map<T, number>()
  items.forEach(item => {
    groups.set(item, (groups.get(item) || 0) + 1)
  })
  return groups
}

function calculateRelevanceScore(text: string, query: string): number {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  // Exact match gets highest score
  if (lowerText === lowerQuery) return 1.0
  
  // Starts with query gets high score
  if (lowerText.startsWith(lowerQuery)) return 0.8
  
  // Contains query gets medium score
  if (lowerText.includes(lowerQuery)) return 0.6
  
  // Calculate character similarity for fuzzy matching
  const similarity = calculateStringSimilarity(lowerText, lowerQuery)
  return Math.max(0.3, similarity)
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = calculateEditDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function calculateEditDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}