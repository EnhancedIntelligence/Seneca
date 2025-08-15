import { describe, it, expect } from 'vitest';
import { apiChildToUi, apiMemoryToUi } from '../api';

describe('API Adapter', () => {
  describe('apiChildToUi', () => {
    it('handles mixed field naming from API', () => {
      const apiChild = {
        id: 'c1',
        name: 'Emma',
        familyId: 'f1', // camelCase
        birth_date: '2020-01-01', // snake_case
        profile_image_url: 'https://example.com/img.jpg',
        emoji: '👧',
        createdAt: '2025-01-01T00:00:00Z',
      };

      const ui = apiChildToUi(apiChild);

      expect(ui.id).toBe('c1');
      expect(ui.name).toBe('Emma');
      expect(ui.familyId).toBe('f1');
      expect(ui.birthDate).toBe('2020-01-01');
      expect(ui.avatarUrl).toBe('https://example.com/img.jpg');
      expect(ui.emoji).toBe('👧');
      expect(ui.age).toBeTruthy();
      expect(ui.initials).toBe('E');
    });

    it('calculates age correctly', () => {
      const now = new Date();
      const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      
      const apiChild = {
        id: 'c1',
        name: 'Test Child',
        birthDate: threeYearsAgo.toISOString(),
      };

      const ui = apiChildToUi(apiChild);
      
      expect(ui.age?.years).toBe(3);
      expect(ui.age?.months).toBe(0);
    });

    it('generates initials correctly', () => {
      const tests = [
        { name: 'Emma Rose', expected: 'ER' },
        { name: 'John', expected: 'J' },
        { name: 'Mary Jane Smith', expected: 'MJ' },
        { name: '', expected: '?' },
      ];

      tests.forEach(({ name, expected }) => {
        const ui = apiChildToUi({ id: '1', name });
        expect(ui.initials).toBe(expected);
      });
    });
  });

  describe('apiMemoryToUi', () => {
    it('handles mixed field naming and preserves false/0', () => {
      const apiMemory = {
        id: 'm1',
        childId: 'c1', // camelCase
        family_id: 'f1', // snake_case
        created_by: 'user1',
        title: 'Test',
        content: 'Memory content',
        tags: ['play', 'outdoor'],
        imageUrls: ['url1'],
        video_urls: [], // snake_case
        milestone_detected: false, // Should preserve false
        milestone_confidence: 0, // Should preserve 0
        location_name: 'Park',
        created_at: '2025-01-01T00:00:00Z',
        processing_status: 'completed',
      };

      const ui = apiMemoryToUi(apiMemory);

      expect(ui.childId).toBe('c1');
      expect(ui.familyId).toBe('f1');
      expect(ui.imageUrls).toEqual(['url1']);
      expect(ui.videoUrls).toEqual([]);
      expect(ui.milestoneDetected).toBe(false);
      expect(ui.milestoneConfidence).toBe(0);
      expect(ui.locationName).toBe('Park');
      expect(ui.tags).toEqual([
        { id: 'play', label: 'play' },
        { id: 'outdoor', label: 'outdoor' }
      ]);
    });

    it('normalizes various tag formats', () => {
      const tests = [
        {
          input: ['string1', 'string2'],
          expected: [
            { id: 'string1', label: 'string1' },
            { id: 'string2', label: 'string2' }
          ]
        },
        {
          input: [
            { id: 'id1', label: 'label1' },
            { id: 'id2', label: 'label2' }
          ],
          expected: [
            { id: 'id1', label: 'label1' },
            { id: 'id2', label: 'label2' }
          ]
        },
        {
          input: [
            'string',
            { id: 'id', label: 'label' },
            null,
            undefined,
            { id: '', label: '' }, // Should be filtered
          ] as any,
          expected: [
            { id: 'string', label: 'string' },
            { id: 'id', label: 'label' }
          ]
        },
        {
          input: null,
          expected: []
        },
        {
          input: undefined,
          expected: []
        }
      ];

      tests.forEach(({ input, expected }) => {
        const ui = apiMemoryToUi({
          id: 'm1',
          content: 'test',
          tags: input,
        });
        expect(ui.tags).toEqual(expected);
      });
    });

    it('derives type from media and category', () => {
      const tests = [
        { videoUrls: ['url'], expected: 'video' },
        { imageUrls: ['url'], expected: 'photo' },
        { category: 'voice', expected: 'voice' },
        { category: 'recording', expected: 'voice' },
        { category: 'milestone', expected: 'event' },
        { category: 'other', expected: 'text' },
        { /* no media or category */ expected: 'text' },
      ];

      tests.forEach((test) => {
        const ui = apiMemoryToUi({
          id: 'm1',
          content: 'test',
          ...test,
        });
        expect(ui.type).toBe(test.expected);
      });
    });

    it('uses fallback timestamp priority', () => {
      const dates = {
        timestamp: '2025-01-05T00:00:00Z',
        memoryDate: '2025-01-04T00:00:00Z',
        memory_date: '2025-01-03T00:00:00Z',
        createdAt: '2025-01-02T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      // Test priority order
      const tests = [
        { input: { ...dates }, expected: dates.timestamp },
        { input: { ...dates, timestamp: undefined }, expected: dates.memoryDate },
        { input: { ...dates, timestamp: undefined, memoryDate: undefined }, expected: dates.memory_date },
        { input: { ...dates, timestamp: undefined, memoryDate: undefined, memory_date: undefined }, expected: dates.createdAt },
        { input: { ...dates, timestamp: undefined, memoryDate: undefined, memory_date: undefined, createdAt: undefined }, expected: dates.created_at },
      ];

      tests.forEach(({ input, expected }) => {
        const ui = apiMemoryToUi({
          id: 'm1',
          content: 'test',
          ...input,
        });
        expect(ui.timestamp).toBe(expected);
      });
    });
  });
});