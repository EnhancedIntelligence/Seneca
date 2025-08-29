/**
 * API Response Helpers
 * Standardized response formatting for consistent API behavior
 */

import { NextResponse } from "next/server";
import { ApiError } from "./errors";
import { ZodError } from "zod";

/**
 * Success response wrapper
 * @param data - The data to return
 * @param status - HTTP status code (default 200)
 * @param headers - Optional headers to include in the response
 */
export function ok<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status, headers });
}

/**
 * Error response wrapper
 * @param error - The error to handle
 */
export function err(error: unknown) {
  // Handle our custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  // Log unexpected errors
  console.error("Unexpected error:", error);

  // Generic error response
  return NextResponse.json(
    {
      error: {
        message: "Internal Server Error",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
    },
    { status: 500 },
  );
}

/**
 * Safe JSON body parser with error handling
 * @param req - The request object
 */
export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (!text) {
      throw new ApiError("Request body is empty", 400);
    }
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Invalid JSON in request body", 400);
  }
}

/**
 * Pagination helper for list responses
 * Returns standardized envelope with items and nextCursor
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
) {
  // Calculate next cursor - null if no more items
  const nextOffset = offset + items.length;
  const nextCursor = nextOffset < total ? String(nextOffset) : null;

  return NextResponse.json({
    items,
    nextCursor,
  });
}
