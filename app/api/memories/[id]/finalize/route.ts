/**
 * Memory Finalize API Route
 * - POST /api/memories/[id]/finalize: attach media assets and (optionally) mark ready
 */

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import {
  wrapRoute,
  jsonResponse,
  createSuccessResponse,
  APIException,
  ErrorCode,
  mapZodError,
  mapDbError,
  parseJsonBody,
} from '@/lib/api/errors';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';

/* ----------------------------- Validation Schema ---------------------------- */

const zSize = z.union([
  z.string().regex(/^\d+$/),   // safe for BIGINT
  z.number().int().min(1),     // typical browser number
]);

// Safe size_bytes parsing with validation
const parseSize = (v: string | number): number => {
  const n = typeof v === 'number' ? v : Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new APIException(
      ErrorCode.VALIDATION_ERROR,
      'Invalid size_bytes',
      { size_bytes: v },
      422
    );
  }
  return n;
};

const zMediaAsset = z.object({
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: zSize,
  width: z.number().int().min(1).nullable().optional(),
  height: z.number().int().min(1).nullable().optional(),
  duration: z.number().int().min(0).nullable().optional(), // seconds for audio/video (DB is INTEGER)
});

const zFinalize = z.object({
  media_assets: z.array(zMediaAsset).max(10).optional(), // reasonable batch limit
  mark_ready: z.boolean().optional().default(false),
});

/* --------------------------------- POST / ---------------------------------- */

export const POST = wrapRoute(async (req, { requestId }) => {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) {
    throw new APIException(ErrorCode.UNAUTHORIZED, 'Authentication required', undefined, 401);
  }

  // Stricter rate limit for finalize
  const rateHeaders = await withRateLimit(RATE_LIMIT_CONFIGS.finalizeMemory)(req, user.id);

  // Robust id extraction (handles trailing slashes, missing segment)
  const segments = new URL(req.url).pathname.replace(/\/+$/, '').split('/');
  const finalizeIdx = segments.lastIndexOf('finalize');
  const id = finalizeIdx > 0 ? segments[finalizeIdx - 1] : undefined;
  if (!id) {
    throw new APIException(ErrorCode.INVALID_REQUEST, 'Invalid memory ID', { id }, 400);
  }

  // Validate body
  const body = await parseJsonBody<unknown>(req);
  const parsed = zFinalize.safeParse(body);
  if (!parsed.success) throw mapZodError(parsed.error);
  const { media_assets, mark_ready } = parsed.data;

  // Fetch memory (RLS enforces ownership)
  const { data: memory, error: memErr } = await supabase
    .from('memories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (memErr) throw mapDbError(memErr);
  if (!memory) {
    throw new APIException(ErrorCode.NOT_FOUND, 'Memory not found', { id }, 404);
  }

  // Only finalize drafts
  if (memory.status !== 'draft') {
    throw new APIException(
      ErrorCode.INVALID_STATE_TRANSITION,
      'Only draft memories can be finalized',
      { id, current_status: memory.status },
      400
    );
  }

  // Belt & suspenders: verify child ownership if child_id exists
  if (memory.child_id) {
    const { data: child, error: childErr } = await supabase
      .from('children')
      .select('id')
      .eq('id', memory.child_id)
      .eq('created_by', user.id)
      .maybeSingle();
    if (childErr) throw mapDbError(childErr);
    if (!child) {
      // Hide ownership details
      throw new APIException(ErrorCode.NOT_FOUND, 'Memory not found', { id }, 404);
    }
  }

  // --- Attach media assets (idempotent & safe) --------------------------------

  let insertedCount = 0;

  if (media_assets?.length) {
    const paths = media_assets.map((m) => m.storage_path);

    // Preflight to find existing assets by path
    const { data: existing, error: existingErr } = await supabase
      .from('media_assets')
      .select('storage_path,memory_id')
      .in('storage_path', paths);
    if (existingErr) throw mapDbError(existingErr);

    const existingByPath = new Map(existing?.map((e) => [e.storage_path, e.memory_id]) ?? []);

    // If any existing path belongs to a different memory_id, hard conflict
    const conflicts = paths.filter((p) => {
      const owner = existingByPath.get(p);
      return owner && owner !== id;
    });
    if (conflicts.length) {
      throw new APIException(
        ErrorCode.CONFLICT,
        'One or more media assets belong to another memory',
        { conflicts },
        409
      );
    }

    // Insert only new paths (not already attached to this memory)
    const newAssets = media_assets
      .filter((a) => !existingByPath.has(a.storage_path))
      .map((asset) => ({
        memory_id: id,
        storage_path: asset.storage_path,
        mime_type: asset.mime_type,
        size_bytes: parseSize(asset.size_bytes), // Use safe parsing with validation
        width: asset.width ?? null,
        height: asset.height ?? null,
        duration: asset.duration ?? null,
      }));

    if (newAssets.length) {
      const { error: insErr } = await supabase.from('media_assets').insert(newAssets);
      if (insErr) {
        // Handle unique_violation due to race after preflight
        if (insErr.code === '23505') {
          const conflictedPaths = newAssets.map(a => a.storage_path);
          const { data: recheck, error: recheckErr } = await supabase
            .from('media_assets')
            .select('storage_path,memory_id')
            .in('storage_path', conflictedPaths);
          if (recheckErr) throw mapDbError(recheckErr);

          const bad = (recheck ?? []).filter(r => r.memory_id !== id).map(r => r.storage_path);
          if (bad.length) {
            throw new APIException(
              ErrorCode.CONFLICT,
              'One or more media assets belong to another memory',
              { conflicts: bad },
              409
            );
          }
          // All conflicts belong to this memory → treat as idempotent insert
          // insertedCount remains what actually made it in; don't increment
        } else {
          throw mapDbError(insErr);
        }
      } else {
        insertedCount = newAssets.length;
      }
    }
  }

  // --- Mark ready (if requested) ---------------------------------------------

  let updatedMemory = memory;
  let statusUpdated = false;

  if (mark_ready) {
    // Determine if memory now satisfies "ready" conditions:
    //  - text memory with non-empty content, OR
    //  - memory has at least one media asset attached
    let okToReady = false;
    if (memory.kind === 'text' && memory.content && memory.content.trim() !== '') {
      okToReady = true;
    } else {
      // Check total media count (existing + just-inserted)
      const { count, error: cntErr } = await supabase
        .from('media_assets')
        .select('id', { count: 'exact', head: true })
        .eq('memory_id', id);
      if (cntErr) throw mapDbError(cntErr);
      okToReady = (count ?? 0) > 0;
    }

    if (!okToReady) {
      throw new APIException(
        ErrorCode.INVALID_STATE_TRANSITION,
        'Cannot mark ready without text content or at least one media asset',
        { id, kind: memory.kind },
        400
      );
    }

    const { data: upd, error: updErr } = await supabase
      .from('memories')
      .update({ status: 'ready' })
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) throw mapDbError(updErr);
    updatedMemory = upd!;
    statusUpdated = updatedMemory.status !== memory.status;
  }

  // Fetch all media for response (sorted for stable UX with secondary sort)
  const { data: allMedia, error: allMediaErr } = await supabase
    .from('media_assets')
    .select('*')
    .eq('memory_id', id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (allMediaErr) throw mapDbError(allMediaErr);

  return jsonResponse(
    createSuccessResponse(
      {
        memory: updatedMemory,
        media_assets: allMedia ?? [],
        inserted_assets_count: insertedCount,
        status_updated: statusUpdated,
        ready: updatedMemory.status === 'ready', // Nice-to-have: explicit ready flag
      },
      requestId
    ),
    { status: 200, headers: { ...rateHeaders } }
  );
}, ['POST']);