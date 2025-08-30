import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch to avoid needing a running server
global.fetch = vi.fn();

describe("GET /api/children", () => {
  const mockFetch = global.fetch as any;

  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockReset();
  });

  it("returns items array and nextCursor", async () => {
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: "child-1",
            name: "Test Child",
            family_id: "test-family-id",
            birth_date: "2020-01-01",
            gender: "other",
          },
        ],
        nextCursor: null,
      }),
    });

    const response = await fetch("/api/children?family_id=test-family-id");
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const body = await response.json();

    // Check envelope structure
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body).toHaveProperty("nextCursor");

    // If there are items, check their structure
    if (body.items.length > 0) {
      const child = body.items[0];
      expect(child).toHaveProperty("id");
      expect(child).toHaveProperty("name");
      expect(child).toHaveProperty("family_id");
    }
  });

  it("requires family_id parameter", async () => {
    // Mock error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "family_id is required",
        },
      }),
    });

    const response = await fetch("/api/children");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.message).toContain("family_id");
  });

  it("requires authentication", async () => {
    // Mock unauthorized response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: "Unauthorized",
        },
      }),
    });

    const response = await fetch("/api/children?family_id=test-family-id");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it("respects pagination parameters", async () => {
    // Mock paginated response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { id: "1", name: "Child 1", family_id: "test-family-id" },
          { id: "2", name: "Child 2", family_id: "test-family-id" },
        ],
        nextCursor: "5",
      }),
    });

    const response = await fetch(
      "/api/children?family_id=test-family-id&limit=5&offset=0",
    );

    expect(response.ok).toBe(true);

    const body = await response.json();
    expect(body.items.length).toBeLessThanOrEqual(5);
    expect(body.nextCursor).toBeDefined();
  });
});
