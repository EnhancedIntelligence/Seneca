/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Memory Create Route Handler (Legacy)
 * @deprecated Use POST /api/memories instead
 * Kept for backward compatibility with existing UI components
 */

import { NextRequest } from 'next/server';
import { ok, err, readJson } from '@/lib/server/api';
import { requireUser, requireFamilyAccess } from '@/lib/server/auth';
import { ValidationError, ServerError } from '@/lib/server/errors';
import { checkRateLimit } from '@/lib/server/middleware/rate-limit';
import { createAdminClient } from '@/lib/server-only/admin-client';
import { MemoryQueue } from '@/lib/queue';
import { z } from 'zod';
import type { Database } from '@/lib/types';

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
  tags: z.array(z.string().max(50)).max(20).optional(),
  image_urls: z.array(z.string().url()).max(10).optional(),
  video_urls: z.array(z.string().url()).max(5).optional(),
  auto_process: z.boolean().default(true),
  processing_priority: z.enum(['low', 'normal', 'high']).default('normal'),
  processing_options: z.object({
    generate_embedding: z.boolean().default(true),
    detect_milestones: z.boolean().default(true),
    analyze_sentiment: z.boolean().default(true),
    generate_insights: z.boolean().default(true)
  }).optional()
});

type CreateMemoryInput = z.infer<typeof createMemorySchema>;

/**
 * POST /api/memories/create
 * Create a new memory with enhanced options
 * @deprecated Use POST /api/memories instead
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    
    // Rate limit memory creation
    await checkRateLimit(`${user.id}:memory-create`);
    
    // Parse and validate request body
    const body = await readJson<CreateMemoryInput>(request);
    const validatedData = createMemorySchema.parse(body);
    
    // Verify user has access to this family
    await requireFamilyAccess(user.id, validatedData.family_id);
    
    const adminClient = createAdminClient();
    
    // Map processing priority to numeric value
    const priorityMap = { low: 0, normal: 5, high: 10 };
    const processingPriority = priorityMap[validatedData.processing_priority];
    
    // Create memory entry
    const { data: memory, error: createError } = await adminClient
      .from('memory_entries')
      .insert({
        title: validatedData.title,
        content: validatedData.content,
        family_id: validatedData.family_id,
        child_id: validatedData.child_id,
        memory_date: validatedData.memory_date,
        location_name: validatedData.location_name,
        location_lat: validatedData.location_lat,
        location_lng: validatedData.location_lng,
        category: validatedData.category,
        tags: validatedData.tags || [],
        image_urls: validatedData.image_urls || [],
        video_urls: validatedData.video_urls || [],
        processing_status: validatedData.auto_process ? 'queued' : 'completed',
        processing_priority: processingPriority,
        app_context: validatedData.processing_options ? {
          processing_options: validatedData.processing_options
        } : null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (createError || !memory) {
      console.error('Memory creation error:', createError);
      throw new ServerError('Failed to create memory');
    }
    
    // Queue for processing if auto_process is enabled
    let jobId: string | undefined;
    if (validatedData.auto_process) {
      try {
        const queue = new MemoryQueue();
        jobId = await queue.addJob(
          memory.id, 
          validatedData.family_id
        );
      } catch (queueError) {
        // Log but don't fail the request if queue is unavailable
        console.error('Queue error (non-blocking):', queueError);
      }
    }

    return ok({
      id: memory.id,
      title: memory.title,
      content: memory.content,
      family_id: memory.family_id,
      child_id: memory.child_id,
      processing_status: memory.processing_status,
      created_at: memory.created_at,
      jobId,
      message: jobId 
        ? 'Memory created and queued for processing'
        : validatedData.auto_process
        ? 'Memory created (processing queue unavailable)'
        : 'Memory created (manual processing)',
    }, 201); // 201 Created for POST

  } catch (error) {
    return err(error);
  }
}