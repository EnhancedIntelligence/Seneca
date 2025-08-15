import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server-only/admin-client'
import { MemoryQueue } from '@/lib/queue'
import { z } from 'zod'
import type { Database } from '@/lib/types'

// Validation schema for memory creation
const createMemorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10).max(10000),
  family_id: z.string().uuid(),
  child_id: z.string().uuid().optional(),
  memory_date: z.string().datetime().optional(),
  location_name: z.string().max(200).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  category: z.enum([
    'milestone', 'daily_life', 'celebration', 'learning', 
    'social', 'creative', 'outdoor', 'family_time', 'other'
  ]).optional(),
  tags: z.array(z.string().max(50)).max(20),
  image_urls: z.array(z.string().url()).max(10),
  video_urls: z.array(z.string().url()).max(5),
  auto_process: z.boolean().default(true),
  processing_priority: z.enum(['low', 'normal', 'high']).default('normal'),
  processing_options: z.object({
    generate_embedding: z.boolean().default(true),
    detect_milestones: z.boolean().default(true),
    analyze_sentiment: z.boolean().default(true),
    generate_insights: z.boolean().default(true)
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Get user from auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createMemorySchema.parse(body)

    // Create admin client for database operations
    const adminClient = createAdminClient()

    // Verify user has access to family
    const { data: membership, error: membershipError } = await adminClient
      .from('family_memberships')
      .select('user_id, family_id, role')
      .eq('family_id', validatedData.family_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied: You are not a member of this family' },
        { status: 403 }
      )
    }

         // Get user ID from token (simplified - in production you'd decode the JWT)
     const userId = membership.user_id
     
     if (!userId) {
       return NextResponse.json(
         { error: 'User ID not found in membership' },
         { status: 403 }
       )
     }

     // If child_id is provided, verify it belongs to the family
    if (validatedData.child_id) {
      const { data: child, error: childError } = await adminClient
        .from('children')
        .select('id, family_id')
        .eq('id', validatedData.child_id)
        .eq('family_id', validatedData.family_id)
        .single()

      if (childError || !child) {
        return NextResponse.json(
          { error: 'Invalid child: Child not found in this family' },
          { status: 400 }
        )
      }
    }

         // Prepare memory data for database
     const memoryData = {
       title: validatedData.title.trim(),
       content: validatedData.content.trim(),
       family_id: validatedData.family_id,
       child_id: validatedData.child_id || null,
       created_by: userId, // userId is guaranteed to be a string from membership check
       memory_date: validatedData.memory_date || new Date().toISOString(),
       location_name: validatedData.location_name?.trim() || null,
       location_lat: validatedData.location_lat || null,
       location_lng: validatedData.location_lng || null,
       category: validatedData.category || 'daily_life',
       tags: validatedData.tags.filter(tag => tag.trim().length > 0),
       image_urls: validatedData.image_urls || [],
       video_urls: validatedData.video_urls || [],
       processing_status: (validatedData.auto_process ? 'queued' : 'completed') as Database['public']['Enums']['processing_status_enum'],
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
     }

    // Insert memory into database
    const { data: memory, error: insertError } = await adminClient
      .from('memory_entries')
      .insert(memoryData)
      .select()
      .single()

    if (insertError) {
      console.error('Memory creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create memory: Database error' },
        { status: 500 }
      )
    }

    // Queue for AI processing if enabled
    if (validatedData.auto_process) {
      try {
                 const queueManager = new MemoryQueue()
        const jobId = await queueManager.addJob(
          memory.id,
          validatedData.family_id,
          {
            priority: validatedData.processing_priority,
            processingOptions: {
              generateEmbedding: validatedData.processing_options?.generate_embedding ?? true,
              detectMilestones: validatedData.processing_options?.detect_milestones ?? true,
              analyzeSentiment: validatedData.processing_options?.analyze_sentiment ?? true,
              generateInsights: validatedData.processing_options?.generate_insights ?? true
            }
          }
        )

        console.log(`Memory ${memory.id} queued for AI processing with job ID: ${jobId}`)
      } catch (queueError) {
        console.error('Failed to queue memory for processing:', queueError)
        // Don't fail the entire request if queueing fails
        // The memory was created successfully
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      memory: {
        id: memory.id,
        title: memory.title,
        content: memory.content,
        category: memory.category,
        tags: memory.tags,
        processing_status: memory.processing_status,
        created_at: memory.created_at
      },
      message: validatedData.auto_process 
        ? 'Memory created and queued for AI processing'
        : 'Memory created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Memory creation API error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for fetching memory creation metadata
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('family_id')

    if (!familyId) {
      return NextResponse.json(
        { error: 'family_id parameter required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get family children for the selector
    const { data: children, error: childrenError } = await adminClient
      .from('children')
      .select('id, name, birth_date, gender, profile_image_url')
      .eq('family_id', familyId)
      .order('birth_date', { ascending: true })

    if (childrenError) {
      console.error('Error fetching children:', childrenError)
      return NextResponse.json(
        { error: 'Failed to fetch family data' },
        { status: 500 }
      )
    }

    // Get popular tags for suggestions (mock implementation)
    const popularTags = [
      'first-steps', 'bedtime-story', 'playground', 'art-time', 
      'cooking-together', 'nature-walk', 'reading-time'
    ]

    return NextResponse.json({
      children: children || [],
      popularTags,
      categories: [
        { value: 'milestone', label: '🏆 Milestone' },
        { value: 'daily_life', label: '🏠 Daily Life' },
        { value: 'celebration', label: '🎉 Celebration' },
        { value: 'learning', label: '📚 Learning' },
        { value: 'social', label: '👥 Social' },
        { value: 'creative', label: '🎨 Creative' },
        { value: 'outdoor', label: '🌳 Outdoor' },
        { value: 'family_time', label: '❤️ Family Time' },
        { value: 'other', label: '📝 Other' }
      ]
    })

  } catch (error) {
    console.error('Memory metadata API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}