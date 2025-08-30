/**
 * HTTP utilities for consistent API responses
 * Implements RFC 7807 Problem Details for HTTP APIs
 */

/**
 * Creates a standardized error response
 * @param status - HTTP status code
 * @param title - A short, human-readable summary of the problem
 * @param detail - A human-readable explanation specific to this occurrence
 * @param meta - Additional metadata about the error
 * @returns Response object with problem+json content type
 */
export function problem(
  status: number,
  title: string,
  detail?: string,
  meta?: Record<string, unknown>,
): Response {
  const body = {
    title,
    status,
    ...(detail && { detail }),
    ...meta,
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
}

/**
 * Common error responses
 */
export const problems = {
  badRequest: (detail?: string, meta?: Record<string, unknown>) =>
    problem(400, "Bad Request", detail, meta),

  unauthorized: (detail?: string) =>
    problem(401, "Unauthorized", detail || "Authentication required"),

  forbidden: (detail?: string) =>
    problem(403, "Forbidden", detail || "Insufficient permissions"),

  notFound: (resource?: string) =>
    problem(
      404,
      "Not Found",
      resource ? `${resource} not found` : "Resource not found",
    ),

  conflict: (detail?: string) => problem(409, "Conflict", detail),

  validationError: (errors: Record<string, string[]>) =>
    problem(422, "Validation Failed", "The request contains invalid fields", {
      errors,
    }),

  tooManyRequests: (retryAfter?: number) =>
    problem(429, "Too Many Requests", "Rate limit exceeded", { retryAfter }),

  serverError: (detail?: string) =>
    problem(
      500,
      "Internal Server Error",
      detail || "An unexpected error occurred",
    ),
} as const;
