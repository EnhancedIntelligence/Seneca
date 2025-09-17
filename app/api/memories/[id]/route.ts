/**
 * Individual Memory API Routes
 * - GET /api/memories/[id]: fetch single memory (with media assets)
 */

import { createClient } from '@/utils/supabase/server';
import {
  wrapRoute,
  jsonResponse,
  createSuccessResponse,
  APIException,
  ErrorCode,
  mapDbError,
} from '@/lib/api/errors';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/api/rate-limit';

export const GET = wrapRoute(async (req, { requestId }) => {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) {
    throw new APIException(ErrorCode.UNAUTHORIZED, 'Authentication required', undefined, 401);
  }

  // Rate limit (user-scoped)
  const rateHeaders = await withRateLimit(RATE_LIMIT_CONFIGS.get)(req, user.id);

  // Robust id extraction (handles trailing slashes)
  const segments = new URL(req.url).pathname.replace(/\/+$/, '').split('/');
  const id = segments[segments.length - 1];
  if (!id) {
    throw new APIException(
      ErrorCode.INVALID_REQUEST,
      'Invalid memory ID',
      { id },
      400
    );
  }

  // Fetch memory (RLS enforces ownership)
  const { data: memory, error: memErr } = await supabase
    .from('memories')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (memErr) throw mapDbError(memErr);
  if (!memory) {
    // 404 for not found OR not owned (avoid leaking tenancy)
    throw new APIException(
      ErrorCode.NOT_FOUND,
      'Memory not found',
      { id },
      404
    );
  }

  // Belt & suspenders: ensure child ownership for legacy rows
  if (memory.child_id) {
    const { data: child, error: childErr } = await supabase
      .from('children')
      .select('id')
      .eq('id', memory.child_id)
      .eq('created_by', user.id)
      .maybeSingle();
    if (childErr) throw mapDbError(childErr);
    if (!child) {
      throw new APIException(
        ErrorCode.NOT_FOUND,
        'Memory not found',
        { id },
        404
      );
    }
  }

  // Include media assets (sorted for stable UX)
  const { data: media, error: mediaErr } = await supabase
    .from('media_assets')
    .select('*')
    .eq('memory_id', id)
    .order('created_at', { ascending: true });

  if (mediaErr) throw mapDbError(mediaErr);

  return jsonResponse(
    createSuccessResponse({ memory, media_assets: media ?? [] }, requestId),
    { headers: { ...rateHeaders } }
  );
}, ['GET']);