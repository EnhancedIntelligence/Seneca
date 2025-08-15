import { describe, it, expect } from 'vitest';
import { dbToUiMemory, uiToDbMemory } from '../memory';
import type { DbMemory, UIMemory } from '@/lib/types';

describe('Memory Adapter', () => {
  describe('dbToUiMemory', () => {
    it('preserves false/0 values and provides sensible defaults', () => {
      const dbMemory: DbMemory = {
        id: '1',
        child_id: 'c1',
        family_id: 'f1',
        created_by: 'user1',
        title: 'Test Memory',
        content: 'Test content',
        memory_date: null,
        category: null,
        tags: ['play', 'sleep'],
        image_urls: null,
        video_urls: undefined,
        location_name: 'Park',
        processing_status: 'completed',
        classification_confidence: null,
        milestone_detected: false, // Should be preserved
        milestone_type: null,
        milestone_confidence: 0, // Should be preserved
        sentiment_score: null,
        sentiment_magnitude: null,
        entities_detected: null,
        error_message: null,
        needs_review: false,
        embedding: null,
        vector_indexed: null,
        searchable_text: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      } as DbMemory;

      const ui = dbToUiMemory(dbMemory);

      // Required fields with defaults
      expect(ui.imageUrls).toEqual([]); // null → []
      expect(ui.videoUrls).toEqual([]); // undefined → []
      
      // Preserved false/0 values
      expect(ui.milestoneDetected).toBe(false);
      expect(ui.milestoneConfidence).toBe(0);
      
      // Tags normalized
      expect(ui.tags).toEqual([
        { id: 'play', label: 'play' },
        { id: 'sleep', label: 'sleep' }
      ]);
      
      // Optional fields included when present
      expect(ui.locationName).toBe('Park');
    });

    it('handles missing optional fields correctly', () => {
      const dbMemory = {
        id: '2',
        child_id: null,
        family_id: null,
        created_by: 'system',
        title: null,
        content: 'Content',
        created_at: '2025-01-01T00:00:00Z',
        processing_status: 'pending',
        tags: null,
        needs_review: null,
      } as unknown as DbMemory;

      const ui = dbToUiMemory(dbMemory);

      // Optional fields not included when null/undefined
      expect(ui.milestoneDetected).toBeUndefined();
      expect(ui.milestoneType).toBeUndefined();
      expect(ui.locationName).toBeUndefined();
      
      // Required fields have defaults
      expect(ui.tags).toEqual([]);
      expect(ui.imageUrls).toEqual([]);
      expect(ui.videoUrls).toEqual([]);
      expect(ui.needsReview).toBe(false);
    });

    it('handles mixed tag formats', () => {
      const dbMemory = {
        id: '3',
        child_id: 'c1',
        family_id: 'f1',
        created_by: 'user',
        content: 'Test',
        tags: ['string-tag', { id: 'obj-id', label: 'obj-label' }] as any,
        created_at: '2025-01-01T00:00:00Z',
        processing_status: 'completed',
      } as unknown as DbMemory;

      const ui = dbToUiMemory(dbMemory);

      expect(ui.tags).toEqual([
        { id: 'string-tag', label: 'string-tag' },
        { id: 'obj-id', label: 'obj-label' }
      ]);
    });

    it('uses memory_date over created_at for timestamp', () => {
      const dbMemory = {
        id: '4',
        child_id: 'c1',
        family_id: 'f1',
        created_by: 'user',
        content: 'Test',
        memory_date: '2025-01-15T12:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        processing_status: 'completed',
      } as unknown as DbMemory;

      const ui = dbToUiMemory(dbMemory);
      
      expect(ui.timestamp).toBe('2025-01-15T12:00:00Z');
      expect(ui.memoryDate).toBe('2025-01-15T12:00:00Z');
    });
  });

  describe('uiToDbMemory', () => {
    it('converts UI memory back to DB format', () => {
      const uiMemory: UIMemory = {
        id: '1',
        childId: 'c1',
        familyId: 'f1',
        createdBy: 'user1',
        title: 'Test',
        content: 'Content',
        timestamp: '2025-01-01T00:00:00Z',
        type: 'text',
        tags: [
          { id: 'play', label: 'play' },
          { id: 'sleep', label: 'sleep' }
        ],
        category: 'daily',
        needsReview: false,
        processingStatus: 'completed',
        imageUrls: ['url1', 'url2'],
        videoUrls: [],
        locationName: 'Home',
        milestoneDetected: true,
        milestoneType: 'motor',
        milestoneConfidence: 0.95,
      };

      const db = uiToDbMemory(uiMemory);

      expect(db.child_id).toBe('c1');
      expect(db.family_id).toBe('f1');
      expect(db.tags).toEqual(['play', 'sleep']);
      expect(db.image_urls).toEqual(['url1', 'url2']);
      expect(db.video_urls).toEqual([]);
      expect(db.location_name).toBe('Home');
      expect(db.milestone_detected).toBe(true);
      expect(db.milestone_type).toBe('motor');
      expect(db.milestone_confidence).toBe(0.95);
    });
  });
});