/**
 * Integration tests for Memories API
 * Tests the memory lifecycle with mocked Supabase responses
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- Module mocks (must be defined before SUT imports) ---
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(), // async in app code → we'll .mockResolvedValue in tests
}));

vi.mock('@/lib/api/rate-limit', () => ({
  withRateLimit: vi.fn(() => async () => ({
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': '3600',
    'X-RateLimit-Policy': 'user;w=60;scope=test',
    'RateLimit-Limit': '10',
    'RateLimit-Remaining': '9',
    'RateLimit-Reset': '3600',
  })),
  RATE_LIMIT_CONFIGS: {
    createMemory: { requests: 10, window: '1m', identifier: 'user', scope: 'createMemory' },
    finalizeMemory: { requests: 5, window: '1m', identifier: 'user', scope: 'finalizeMemory' },
    get: { requests: 100, window: '1m', identifier: 'ip', scope: 'get' },
  },
}));

// Import the mocked symbol (this is a mock fn now)
import { createClient as mockCreateClient } from '@/utils/supabase/server';

// --- SUT imports (after mocks) ---
import { POST as createMemory, GET as listMemories } from '@/app/api/memories/route';
import { GET as getMemory } from '@/app/api/memories/[id]/route';
import { POST as finalizeMemory } from '@/app/api/memories/[id]/finalize/route';

describe('Memories API', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Build a fresh client stub per test
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn(),
    };

    // Because createClient() is async in app code, resolve to supabase
    (mockCreateClient as unknown as any).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/memories', () => {
    it('creates a text memory in draft', async () => {
      const mockMemory = {
        id: 'mem-123',
        user_id: mockUser.id,
        kind: 'text',
        title: 'Test Memory',
        content: 'This is a test memory',
        child_id: null,
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockMemory, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'text', title: 'Test Memory', content: 'This is a test memory' }),
      });

      const res = await createMemory(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.ok).toBe(true);
      expect(body.data.memory).toMatchObject({
        kind: 'text',
        title: 'Test Memory',
        content: 'This is a test memory',
        status: 'draft',
      });
    });

    it('validates child ownership when child_id provided', async () => {
      const childId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'children') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: childId }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'memories') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'mem-124',
                    user_id: mockUser.id,
                    kind: 'text',
                    content: 'Memory for child',
                    child_id: childId,
                    status: 'draft',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'text', content: 'Memory for child', child_id: childId }),
      });

      const res = await createMemory(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.ok).toBe(true);
    });

    it('rejects text memory without content (422)', async () => {
      const req = new Request('http://localhost/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'text', title: 'Missing content' }),
      });

      const res = await createMemory(req);
      const body = await res.json();

      expect(res.status).toBe(422);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/memories', () => {
    it('lists memories with pagination', async () => {
      const mockMemories = [
        { id: 'mem-1', user_id: mockUser.id, kind: 'text', content: 'Memory 1', status: 'ready', created_at: '2024-01-02T00:00:00Z' },
        { id: 'mem-2', user_id: mockUser.id, kind: 'audio', content: null, status: 'draft', created_at: '2024-01-01T00:00:00Z' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          const range = vi.fn().mockResolvedValue({ data: mockMemories, count: 2, error: null });
          const order2 = vi.fn().mockReturnValue({ range });
          const order1 = vi.fn().mockReturnValue({ order: order2 });
          const select = vi.fn().mockReturnValue({ order: order1 });
          return { select };
        }
        return {};
      });

      const req = new Request('http://localhost/api/memories?per_page=10&offset=0', { method: 'GET' });

      const res = await listMemories(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.memories).toHaveLength(2);
      expect(body.data.pagination).toMatchObject({
        total: 2,
        page: 1,
        per_page: 10,
        has_next: false,
        has_prev: false,
      });
    });

    it('filters by status', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          const range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
          const eq = vi.fn().mockReturnValue({ range });
          const order2 = vi.fn().mockReturnValue({ eq });
          const order1 = vi.fn().mockReturnValue({ order: order2 });
          const select = vi.fn().mockReturnValue({ order: order1 });
          return { select };
        }
        return {};
      });

      const req = new Request('http://localhost/api/memories?status=ready', { method: 'GET' });
      const res = await listMemories(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it('searches by title and content', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          const range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
          const or = vi.fn().mockReturnValue({ range });
          const order2 = vi.fn().mockReturnValue({ or });
          const order1 = vi.fn().mockReturnValue({ order: order2 });
          const select = vi.fn().mockReturnValue({ order: order1 });
          return { select };
        }
        return {};
      });

      const req = new Request('http://localhost/api/memories?search=birthday', { method: 'GET' });
      const res = await listMemories(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });
  });

  describe('GET /api/memories/[id]', () => {
    it('fetches single memory with media assets', async () => {
      const memoryId = 'mem-123';
      const mockMemory = {
        id: memoryId,
        user_id: mockUser.id,
        kind: 'image',
        content: 'Photo from birthday',
        status: 'ready',
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockMedia = [{
        id: 'media-1',
        memory_id: memoryId,
        storage_path: 'uploads/photo1.jpg',
        mime_type: 'image/jpeg',
        size_bytes: '1048576',
        width: 1920,
        height: 1080,
        created_at: '2024-01-01T00:01:00Z',
      }];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockMemory, error: null }),
              }),
            }),
          };
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockMedia, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request(`http://localhost/api/memories/${memoryId}`, { method: 'GET' });

      const res = await getMemory(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.memory.id).toBe(memoryId);
      expect(body.data.media_assets).toHaveLength(1);
      expect(body.data.media_assets[0].storage_path).toBe('uploads/photo1.jpg');
    });

    it('returns 404 for non-existent memory', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost/api/memories/non-existent', { method: 'GET' });

      const res = await getMemory(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/memories/[id]/finalize', () => {
    it('attaches media and marks memory ready', async () => {
      const memoryId = 'mem-123';
      const mockMemory = {
        id: memoryId,
        user_id: mockUser.id,
        kind: 'image',
        content: null,
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockMediaFinal = [{
        id: 'media-1',
        memory_id: memoryId,
        storage_path: 'uploads/photo.jpg',
        mime_type: 'image/jpeg',
        size_bytes: '2048576',
        created_at: '2024-01-01T00:01:00Z',
      }];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockMemory, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { ...mockMemory, status: 'ready' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockImplementation((cols: string) => {
              if (cols.includes('storage_path')) {
                // Preflight check - no existing
                return {
                  in: vi.fn().mockResolvedValue({ data: [], error: null }),
                };
              }
              if (cols.includes('id')) {
                // Count check for ready validation
                return {
                  eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
                };
              }
              // Final fetch with double order
              const order2 = vi.fn().mockResolvedValue({ data: mockMediaFinal, error: null });
              const order1 = vi.fn().mockReturnValue({ order: order2 });
              return {
                eq: vi.fn().mockReturnValue({ order: order1 }),
              };
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const req = new Request(`http://localhost/api/memories/${memoryId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_assets: [{
            storage_path: 'uploads/photo.jpg',
            mime_type: 'image/jpeg',
            size_bytes: 2048576,
            width: 1920,
            height: 1080,
          }],
          mark_ready: true,
        }),
      });

      const res = await finalizeMemory(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.memory.status).toBe('ready');
      expect(body.data.inserted_assets_count).toBe(1);
      expect(body.data.status_updated).toBe(true);
    });

    it('handles idempotent media attachment', async () => {
      const memoryId = 'mem-123';
      const storagePath = 'uploads/existing.jpg';

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: memoryId, user_id: mockUser.id, kind: 'image', status: 'draft' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockImplementation((cols: string) => {
              if (cols.includes('storage_path')) {
                // Preflight sees asset already linked to this memory
                return {
                  in: vi.fn().mockResolvedValue({ data: [{ storage_path: storagePath, memory_id: memoryId }], error: null }),
                };
              }
              // Final fetch with double order
              const order2 = vi.fn().mockResolvedValue({
                data: [{ storage_path: storagePath, memory_id: memoryId }],
                error: null,
              });
              const order1 = vi.fn().mockReturnValue({ order: order2 });
              return {
                eq: vi.fn().mockReturnValue({ order: order1 }),
              };
            }),
            insert: vi.fn().mockResolvedValue({ error: null }), // won't be called
          };
        }
        return {};
      });

      const req = new Request(`http://localhost/api/memories/${memoryId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_assets: [{ storage_path: storagePath, mime_type: 'image/jpeg', size_bytes: 1024 }],
        }),
      });

      const res = await finalizeMemory(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.inserted_assets_count).toBe(0);
    });

    it('is race-safe on duplicate insert (23505) when asset belongs to same memory', async () => {
      const memoryId = 'mem-999';
      const storagePath = 'uploads/race.jpg';
      let selectCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: memoryId, user_id: mockUser.id, kind: 'image', status: 'draft' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockImplementation((cols: string) => {
              selectCallCount++;
              if (cols.includes('storage_path')) {
                if (selectCallCount === 1) {
                  // First preflight - no existing
                  return { in: vi.fn().mockResolvedValue({ data: [], error: null }) };
                } else {
                  // Recheck after 23505 - now exists with same memory
                  return {
                    in: vi.fn().mockResolvedValue({
                      data: [{ storage_path: storagePath, memory_id: memoryId }],
                      error: null
                    })
                  };
                }
              }
              if (cols.includes('id')) {
                // Count check
                return {
                  eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
                };
              }
              // Final fetch
              const order2 = vi.fn().mockResolvedValue({
                data: [{ storage_path: storagePath, memory_id: memoryId }],
                error: null,
              });
              const order1 = vi.fn().mockReturnValue({ order: order2 });
              return {
                eq: vi.fn().mockReturnValue({ order: order1 }),
              };
            }),
            insert: vi.fn().mockResolvedValue({
              error: { code: '23505', message: 'duplicate key value violates unique constraint' },
            }),
          };
        }
        return {};
      });

      const req = new Request(`http://localhost/api/memories/${memoryId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_assets: [{ storage_path: storagePath, mime_type: 'image/jpeg', size_bytes: 100 }],
        }),
      });

      const res = await finalizeMemory(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.data.inserted_assets_count).toBe(0); // No actual insert due to race
    });

    it('rejects finalize when media path belongs to another memory', async () => {
      const memoryId = 'mem-abc';
      const otherMemoryId = 'mem-zzz';
      const storagePath = 'uploads/conflict.jpg';

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: memoryId, user_id: mockUser.id, kind: 'image', status: 'draft' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockImplementation((cols: string) => {
              if (cols.includes('storage_path')) {
                // Preflight finds it belongs to different memory
                return {
                  in: vi.fn().mockResolvedValue({
                    data: [{ storage_path: storagePath, memory_id: otherMemoryId }],
                    error: null
                  })
                };
              }
              return { eq: vi.fn().mockResolvedValue({ count: 0, error: null }) };
            }),
            insert: vi.fn(), // should not be called
          };
        }
        return {};
      });

      const req = new Request(`http://localhost/api/memories/${memoryId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_assets: [{ storage_path: storagePath, mime_type: 'image/jpeg', size_bytes: 1 }],
        }),
      });

      const res = await finalizeMemory(req);
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('rejects finalize on non-draft memory', async () => {
      const memoryId = 'mem-123';

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'memories') {
          // Build the exact chain: select('*').eq('id', id).maybeSingle()
          const maybeSingle = vi.fn().mockResolvedValue({
            data: {
              id: memoryId,
              user_id: mockUser.id,
              kind: 'text',
              content: 'Already ready',
              status: 'ready',
              child_id: null,
              title: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            error: null,
          });
          const eq = vi.fn().mockReturnValue({ maybeSingle });
          const select = vi.fn().mockReturnValue({ eq });
          return { select };
        }
        // Return a default mock structure for any other table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const req = new Request(`http://localhost/api/memories/${memoryId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_ready: true }),
      });

      const res = await finalizeMemory(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});