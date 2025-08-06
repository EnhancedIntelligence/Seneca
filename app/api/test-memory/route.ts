import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server-only/admin-client'
import type { MemoryEntryInsert } from '@/lib/types'

export async function GET() {
  try {
    const adminClient = createAdminClient()
    
    console.log('🧪 Testing memory entry retrieval...')
    
    // Test basic memory retrieval
    const { data: memories, error } = await adminClient
      .from('memory_entries')
      .select(`
        id,
        title,
        content,
        location_name,
        category,
        processing_status,
        milestone_detected,
        milestone_type,
        created_at,
        children (
          name,
          birth_date
        ),
        families (
          name,
          description
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        status: 'error',
        error: error.message,
        suggestion: 'Check if memory_entries table exists and has proper permissions'
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        memory_count: memories.length,
        memories: memories.map(memory => ({
          id: memory.id,
          title: memory.title,
          content_preview: memory.content?.substring(0, 100) + '...',
          location: memory.location_name,
          category: memory.category,
          processing_status: memory.processing_status,
          milestone_detected: memory.milestone_detected,
          milestone_type: memory.milestone_type,
          child_name: (memory as any).children?.name || (memory as any).child?.name,
          family_name: (memory as any).families?.name || (memory as any).family?.name,
          created_at: memory.created_at
        }))
      },
      processing_pipeline: {
        step_1: 'Memory stored in Supabase database',
        step_2: 'RLS policies applied for security',
        step_3: 'Ready for AI background processing',
        step_4: 'Accessible via REST API and real-time subscriptions'
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    const adminClient = createAdminClient()
    
    // Create a test memory entry directly via API
    const testMemory: MemoryEntryInsert = {
      title: 'Emma\'s First Egg Adventure!',
      content: `Emma tried a scrambled egg for the first time today! She was hesitant at first, poking it with her fork and making funny faces. But after the first bite, she gobbled up the whole portion and asked for more. She kept saying "egg, egg!" and pointing to her plate. It was such a sweet milestone - her first time really enjoying eggs. She even tried to feed some to her teddy bear! The way her face lit up when she tasted it was absolutely precious. This is definitely a memory worth preserving.`,
      location_name: 'Kitchen at home',
      category: 'milestone',
      processing_status: 'queued',
      milestone_detected: false,
      milestone_type: 'first_food',
      family_id: '11111111-1111-1111-1111-111111111111', // Test family ID
      child_id: '22222222-2222-2222-2222-222222222222',   // Test child ID
      created_by: '550e8400-e29b-41d4-a716-446655440000'   // Test user ID
    }

    const { data: memory, error } = await adminClient
      .from('memory_entries')
      .insert(testMemory)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        status: 'error',
        error: error.message,
        suggestion: 'Make sure test family and child exist first by running the SQL script'
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Test memory entry created successfully!',
      data: {
        memory_id: memory.id,
        title: memory.title,
        processing_status: memory.processing_status,
        created_at: memory.created_at
      },
      next_steps: [
        'Memory is now in the database with "pending" status',
        'Background AI processing would analyze this for milestones',
        'AI would detect this as a "first food" milestone',
        'Status would update to "completed" after processing'
      ]
    })

  } catch (error) {
    console.error('Memory creation error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}