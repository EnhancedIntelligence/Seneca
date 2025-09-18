/**
 * Test helpers for Next.js route handlers
 */

/**
 * Helper to create params context for Next.js 15 dynamic route handlers
 * @param p - The params object
 * @returns Context object with params as a Promise
 */
export function params<T extends Record<string, string>>(p: T) {
  return { params: Promise.resolve(p) } as { params: Promise<T> };
}