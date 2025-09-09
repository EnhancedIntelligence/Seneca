"use client";

/**
 * Client-side debug utilities for development-only logging.
 * These helpers are no-ops in production builds.
 *
 * Use these in client components instead of console.* to avoid ESLint errors
 * while maintaining debugging capability during development.
 */

const isDev = process.env.NODE_ENV !== "production";

export const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: unknown[]) => {
  if (isDev) console.error(...args);
};

export const devInfo = (...args: unknown[]) => {
  if (isDev) console.info(...args);
};

export const devDebug = (...args: unknown[]) => {
  if (isDev) console.debug(...args);
};

export const devTrace = (...args: unknown[]) => {
  if (isDev) console.trace(...args);
};

/**
 * Measure and log performance in development
 * @param label - Label for the timing
 * @param fn - Function to measure
 * @returns The result of the function
 */
export async function devTime<T>(
  label: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  if (!isDev) return fn();

  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERF] ${label}: ${duration.toFixed(2)}ms (failed)`, error);
    throw error;
  }
}
