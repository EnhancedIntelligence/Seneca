/**
 * API Integration Tests for Children Endpoints
 * Tests authentication, family access, and soft-delete functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/server-only/admin-client';

describe('Children API', () => {
  let adminClient: ReturnType<typeof createAdminClient>;
  let testFamilyId: string;
  let testChildId: string;
  let authToken: string;

  beforeAll(async () => {
    adminClient = createAdminClient();
    // Setup test data and auth token
    // This would be replaced with actual test setup
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('GET /api/children', () => {
    it('should return 200 for authenticated user with family access', async () => {
      const response = await fetch(`/api/children?family_id=${testFamilyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('items');
      expect(Array.isArray(data.data.items)).toBe(true);
    });

    it('should exclude soft-deleted children', async () => {
      // Create a child and soft-delete it
      const { data: child } = await adminClient
        .from('children')
        .insert({
          name: 'Test Child',
          family_id: testFamilyId,
          deleted_at: new Date().toISOString(),
        })
        .select()
        .single();

      const response = await fetch(`/api/children?family_id=${testFamilyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();
      const childIds = data.data.items.map((c: any) => c.id);
      expect(childIds).not.toContain(child?.id);
    });

    it('should return 403 for non-family member', async () => {
      const response = await fetch(`/api/children?family_id=invalid-family-id`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/children', () => {
    it('should create child and return 201', async () => {
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Child',
          family_id: testFamilyId,
          birth_date: '2020-01-01',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe('New Child');
      
      testChildId = data.data.id;
    });

    it('should handle null birth_date', async () => {
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Child Without Birthdate',
          family_id: testFamilyId,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.birth_date).toBeNull();
    });
  });

  describe('DELETE /api/children/[id]', () => {
    it('should soft-delete child by setting deleted_at', async () => {
      const response = await fetch(`/api/children/${testChildId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.soft_delete).toBe(true);

      // Verify deleted_at is set in database
      const { data: child } = await adminClient
        .from('children')
        .select('deleted_at')
        .eq('id', testChildId)
        .single();

      expect(child?.deleted_at).not.toBeNull();
    });
  });
});