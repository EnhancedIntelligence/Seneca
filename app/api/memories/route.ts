/**
 * Memories API Routes
 * - POST /api/memories: create draft memory
 * - GET  /api/memories: list memories (with filters + pagination)
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
import {
  MemoryKindValues,
  MemoryStatusValues,
  DEFAULT_MEMORIES_PER_PAGE,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
} from '@/lib/types/api/memories';

/* ----------------------------- Validation Schemas ---------------------------- */

const zCreate = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    title: z.string().max(MAX_TITLE_LENGTH).nullable().optional(),
    child_id: z.string().uuid().nullable().optional(),
    content: z.string().min(1).max(MAX_CONTENT_LENGTH), // required for text
  }),
  z.object({
    kind: z.enum(['audio', 'image', 'video']),
    title: z.string().max(MAX_TITLE_LENGTH).nullable().optional(),
    child_id: z.string().uuid().nullable().optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional(), // optional caption/notes
  }),
]);

/* --------------------------------- POST / ---------------------------------- */

export const POST = wrapRoute(async (req, { requestId }) => {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) {
    throw new APIException(ErrorCode.UNAUTHORIZED, 'Authentication required', undefined, 401);
  }

  // Apply rate limiting (user-scoped)
  const rateHeaders = await withRateLimit(RATE_LIMIT_CONFIGS.createMemory)(req, user.id);

  // Validate body
  const body = await parseJsonBody<unknown>(req);
  const parsed = zCreate.safeParse(body);
  if (!parsed.success) throw mapZodError(parsed.error);

  // Optional: pre-check child ownership for clearer errors (RLS will enforce anyway)
  if (parsed.data.child_id) {
    const { data: child, error: childErr } = await supabase
      .from('children')
      .select('id')
      .eq('id', parsed.data.child_id)
      .eq('created_by', user.id)
      .maybeSingle();
    if (childErr) throw mapDbError(childErr);
    if (!child) {
      throw new APIException(
        ErrorCode.FORBIDDEN,
        'Child not found or access denied',
        { child_id: parsed.data.child_id },
        403
      );
    }
  }

  // Insert draft memory (RLS WITH CHECK enforces ownership)
  const { data: memory, error: insErr } = await supabase
    .from('memories')
    .insert([{ user_id: user.id, status: 'draft', ...parsed.data }])
    .select('*')
    .single();

  if (insErr) throw mapDbError(insErr);

  return jsonResponse(
    createSuccessResponse({ memory }, requestId),
    { status: 201, headers: { ...rateHeaders } }
  );
}, ['POST']);

/* ---------------------------------- GET / ---------------------------------- */

export const GET = wrapRoute(async (req, { requestId }) => {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) {
    throw new APIException(ErrorCode.UNAUTHORIZED, 'Authentication required', undefined, 401);
  }

  // Apply rate limiting (user-scoped for GET as well)
  const rateHeaders = await withRateLimit(RATE_LIMIT_CONFIGS.get)(req, user.id);

  const url = new URL(req.url);
  // Support both ?per_page and ?limit; cap at 100
  const perPageRaw = url.searchParams.get('per_page') ?? url.searchParams.get('limit') ?? `${DEFAULT_MEMORIES_PER_PAGE}`;
  const limit = Math.min(Math.max(parseInt(perPageRaw, 10) || DEFAULT_MEMORIES_PER_PAGE, 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  const status = url.searchParams.get('status');
  const childId = url.searchParams.get('child_id');
  const kind   = url.searchParams.get('kind');
  const search = url.searchParams.get('search'); // title/content

  // Build RLS-protected query with stable ordering
  let q = supabase
    .from('memories')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }); // Secondary sort for stability

  // Apply filters with type-safe enum checks
  if (status && (MemoryStatusValues as readonly string[]).includes(status)) {
    q = q.eq('status', status as 'draft' | 'ready' | 'processing' | 'error');
  }
  if (kind && (MemoryKindValues as readonly string[]).includes(kind)) {
    q = q.eq('kind', kind as 'text' | 'audio' | 'image' | 'video');
  }
  if (childId) {
    q = q.eq('child_id', childId);
  }
  if (search) {
    q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw mapDbError(error);

  return jsonResponse(
    createSuccessResponse(
      {
        memories: data ?? [],
        pagination: {
          total: count ?? 0,
          page: Math.floor(offset / limit) + 1,
          per_page: limit,
          has_next: (count ?? 0) > offset + limit,
          has_prev: offset > 0,
        },
      },
      requestId
    ),
    { headers: { ...rateHeaders } }
  );
}, ['GET']);