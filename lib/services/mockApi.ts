/**
 * Mock API Service
 * Simulates API calls with realistic delays and responses
 * TODO: Replace with actual API calls to backend
 */

import {
  Memory,
  Child,
  Milestone,
  mockMemories,
  mockChildren,
  mockMilestones,
  mockAnalytics,
  mockInsights,
  MemoryType,
  Tag,
  DetailedMemory,
} from "@/lib/stores/mockData";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate unique IDs
const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Memory storage (in-memory for demo)
let memories = [...mockMemories];
let children = [...mockChildren];
let milestones = [...mockMilestones];

class MockApiService {
  // ===== MEMORIES =====

  /**
   * Fetch all memories with optional filters
   * TODO: Replace with actual API call to /api/memories
   */
  async getMemories(filters?: {
    childId?: string;
    type?: MemoryType;
    tags?: Tag[];
    startDate?: string;
    endDate?: string;
  }): Promise<Memory[]> {
    await delay(300);

    let filtered = [...memories];

    if (filters?.childId) {
      filtered = filtered.filter((m) => m.childId === filters.childId);
    }

    if (filters?.type) {
      filtered = filtered.filter((m) => m.type === filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((m) =>
        filters.tags!.some((filterTag) =>
          m.tags.some((memTag) => memTag.id === filterTag.id),
        ),
      );
    }

    if (filters?.startDate) {
      filtered = filtered.filter(
        (m) => new Date(m.timestamp) >= new Date(filters.startDate!),
      );
    }

    if (filters?.endDate) {
      filtered = filtered.filter(
        (m) => new Date(m.timestamp) <= new Date(filters.endDate!),
      );
    }

    // Sort by timestamp descending
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Create a new memory
   * TODO: Replace with actual POST to /api/memories
   */
  async createMemory(
    memory: Omit<Memory, "id" | "timestamp">,
  ): Promise<Memory> {
    await delay(500);

    const newMemory: Memory = {
      ...memory,
      id: generateId("mem"),
      timestamp: new Date().toISOString(),
      processingStatus: "pending",
    };

    memories.unshift(newMemory);

    // Simulate AI processing
    setTimeout(() => {
      const memIndex = memories.findIndex((m) => m.id === newMemory.id);
      if (memIndex > -1) {
        memories[memIndex].processingStatus = "completed";

        // Randomly detect milestones
        if (
          Math.random() > 0.7 &&
          memory.tags.some((t) => t.id === "milestone")
        ) {
          this.createMilestone({
            childId: memory.childId,
            title: "Achievement Detected",
            description: memory.content,
            category: "cognitive",
            achievedAt: new Date().toISOString(),
            verifiedBy: "ai",
          });
        }
      }
    }, 2000);

    return newMemory;
  }

  /**
   * Update a memory
   * TODO: Replace with actual API call to /api/memories/[id]
   */
  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    await delay(300);

    const index = memories.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error("Memory not found");
    }

    memories[index] = { ...memories[index], ...updates };
    return memories[index];
  }

  /**
   * Delete a memory
   * TODO: Replace with actual API call to /api/memories/[id]
   */
  async deleteMemory(id: string): Promise<void> {
    await delay(300);
    memories = memories.filter((m) => m.id !== id);
  }

  /**
   * Create a detailed memory with additional metadata
   * TODO: Replace with actual API call
   */
  async createDetailedMemory(
    memory: Omit<DetailedMemory, "id" | "timestamp">,
  ): Promise<Memory> {
    const { date, time, peoplePresent, additionalNotes, ...baseMemory } =
      memory;

    // Combine date and time into timestamp
    const timestamp = new Date(`${date}T${time}`).toISOString();

    // Add additional context to content
    let enrichedContent = baseMemory.content;
    if (additionalNotes) {
      enrichedContent += `\n\nNotes: ${additionalNotes}`;
    }
    if (peoplePresent && peoplePresent.length > 0) {
      enrichedContent += `\n\nPeople present: ${peoplePresent.join(", ")}`;
    }

    return this.createMemory({
      ...baseMemory,
      content: enrichedContent,
    });
  }

  // ===== CHILDREN =====

  /**
   * Get all children in the family
   * TODO: Replace with actual API call to /api/children
   */
  async getChildren(): Promise<Child[]> {
    await delay(200);
    return [...children];
  }

  /**
   * Add a new child
   * TODO: Replace with actual API call to /api/children/create
   */
  async addChild(child: Omit<Child, "id">): Promise<Child> {
    await delay(500);

    const newChild: Child = {
      ...child,
      id: generateId("child"),
    };

    children.push(newChild);
    return newChild;
  }

  /**
   * Update child information
   * TODO: Replace with actual API call to /api/children/[id]
   */
  async updateChild(id: string, updates: Partial<Child>): Promise<Child> {
    await delay(300);

    const index = children.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Child not found");
    }

    children[index] = { ...children[index], ...updates };
    return children[index];
  }

  /**
   * Delete a child (and associated memories)
   * TODO: Replace with actual API call to /api/children/[id]
   */
  async deleteChild(id: string): Promise<void> {
    await delay(500);

    // Remove child
    children = children.filter((c) => c.id !== id);

    // Remove associated memories
    memories = memories.filter((m) => m.childId !== id);

    // Remove associated milestones
    milestones = milestones.filter((m) => m.childId !== id);
  }

  // ===== MILESTONES =====

  /**
   * Get milestones for a child
   * TODO: Replace with actual API call to /api/milestones
   */
  async getMilestones(childId?: string): Promise<Milestone[]> {
    await delay(300);

    if (childId) {
      return milestones.filter((m) => m.childId === childId);
    }

    return [...milestones];
  }

  /**
   * Create a new milestone
   * TODO: Replace with actual API call to /api/milestones/create
   */
  async createMilestone(milestone: Omit<Milestone, "id">): Promise<Milestone> {
    await delay(400);

    const newMilestone: Milestone = {
      ...milestone,
      id: generateId("milestone"),
    };

    milestones.unshift(newMilestone);
    return newMilestone;
  }

  /**
   * Update a milestone
   * TODO: Replace with actual API call to /api/milestones/[id]
   */
  async updateMilestone(
    id: string,
    updates: Partial<Milestone>,
  ): Promise<Milestone> {
    await delay(300);

    const index = milestones.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error("Milestone not found");
    }

    milestones[index] = { ...milestones[index], ...updates };
    return milestones[index];
  }

  // ===== ANALYTICS =====

  /**
   * Get analytics data
   * TODO: Replace with actual API call to /api/analytics
   */
  async getAnalytics() {
    await delay(500);

    // Calculate real-time stats
    const totalMemories = memories.length;
    const totalMilestones = milestones.length;
    const activeChildren = children.length;

    // Calculate growth
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMemories = memories.filter(
      (m) => new Date(m.timestamp) > oneWeekAgo,
    ).length;
    const recentMilestones = milestones.filter(
      (m) => new Date(m.achievedAt) > oneWeekAgo,
    ).length;

    return {
      ...mockAnalytics,
      totalMemories,
      totalMilestones,
      activeChildren,
      lastWeekGrowth: {
        memories: recentMemories,
        milestones: recentMilestones,
      },
    };
  }

  /**
   * Get AI insights
   * TODO: Replace with actual API call to /api/insights
   */
  async getInsights(childId?: string) {
    await delay(600);

    if (childId) {
      return mockInsights.filter((i) => i.childId === childId);
    }

    return mockInsights;
  }

  // ===== VOICE RECORDING =====

  /**
   * Simulate voice recording upload
   * TODO: Replace with actual API call to upload audio
   */
  async uploadVoiceRecording(
    duration: number,
    childId: string,
  ): Promise<Memory> {
    await delay(1000);

    // Simulate transcription
    const transcriptions = [
      "Today we went to the park and played on the swings",
      "She said her first complete sentence!",
      "Walked all the way to school without help",
      "Counted to ten in Spanish",
      "Drew a picture of our family",
    ];

    const content =
      transcriptions[Math.floor(Math.random() * transcriptions.length)];

    return this.createMemory({
      childId,
      content: `[Voice ${duration}s] ${content}`,
      type: "voice",
      tags: [{ id: "voice", label: "voice" }],
    });
  }

  // ===== SEARCH =====

  /**
   * Search memories
   * TODO: Replace with actual API call to /api/search/memories
   */
  async searchMemories(query: string): Promise<Memory[]> {
    await delay(400);

    const lowerQuery = query.toLowerCase();
    return memories.filter(
      (m) =>
        m.content.toLowerCase().includes(lowerQuery) ||
        m.tags.some((tag) => tag.label.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Get search suggestions
   * TODO: Replace with actual API call to /api/search/suggestions
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    await delay(200);

    const suggestions = [
      "first steps",
      "first word",
      "birthday",
      "milestone",
      "playground",
      "drawing",
      "singing",
      "reading",
    ];

    return suggestions
      .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }
}

// Export singleton instance
export const apiService = new MockApiService();

// Export hook for React components
export function useApi() {
  return apiService;
}
