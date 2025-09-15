/**
 * Production-Grade Error Handling
 * Centralized error handling for the Seneca Protocol application
 */

import { NextResponse } from "next/server";
import React from "react";
import { isDevelopment, isDebug } from "./env";
import { devError } from "@/lib/client-debug";

// Error types
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "EXTERNAL_API_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR"
  | "SCHEMA_VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "PERMISSION_DENIED"
  | "INVALID_INPUT"
  | "RESOURCE_NOT_FOUND"
  | "PROCESSING_ERROR";

// Custom error classes
export class SenecaError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = "SenecaError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SenecaError);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(isDevelopment && { stack: this.stack }),
    };
  }
}

// Specific error classes
export class DatabaseError extends SenecaError {
  constructor(message: string, details?: Record<string, any>) {
    super("DATABASE_ERROR", message, 500, details);
  }
}

export class ValidationError extends SenecaError {
  constructor(message: string, details?: Record<string, any>) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class AuthenticationError extends SenecaError {
  constructor(message: string = "Authentication required") {
    super("AUTHENTICATION_ERROR", message, 401);
  }
}

export class AuthorizationError extends SenecaError {
  constructor(message: string = "Permission denied") {
    super("PERMISSION_DENIED", message, 403);
  }
}

export class NotFoundError extends SenecaError {
  constructor(resource: string) {
    super("RESOURCE_NOT_FOUND", `${resource} not found`, 404);
  }
}

export class ProcessingError extends SenecaError {
  constructor(message: string, details?: Record<string, any>) {
    super("PROCESSING_ERROR", message, 500, details);
  }
}

export class ExternalAPIError extends SenecaError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super("EXTERNAL_API_ERROR", `${service} error: ${message}`, 502, details);
  }
}

export class RateLimitError extends SenecaError {
  constructor(message: string = "Rate limit exceeded") {
    super("RATE_LIMIT_EXCEEDED", message, 429);
  }
}

// Error logging interface
export interface ErrorLogger {
  log(error: Error, context?: Record<string, any>): void;
}

// Console error logger
class ConsoleErrorLogger implements ErrorLogger {
  log(error: Error, context?: Record<string, any>): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof SenecaError && {
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        }),
      },
      context,
    };

    if (isDevelopment || isDebug) {
      devError("🚨 Error:", JSON.stringify(logData, null, 2));
    } else {
      devError("Error:", JSON.stringify(logData));
    }
  }
}

// Error logger singleton
export const errorLogger: ErrorLogger = new ConsoleErrorLogger();

// Helper function to handle and log errors
export function handleError(
  error: unknown,
  context?: Record<string, any>,
): SenecaError {
  let senecaError: SenecaError;

  if (error instanceof SenecaError) {
    senecaError = error;
  } else if (error instanceof Error) {
    senecaError = new SenecaError("INTERNAL_SERVER_ERROR", error.message, 500, {
      originalError: error.name,
    });
  } else {
    senecaError = new SenecaError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      500,
      { originalError: String(error) },
    );
  }

  // Log the error
  errorLogger.log(senecaError, context);

  return senecaError;
}

// API error response helper
export function createErrorResponse(error: SenecaError): NextResponse {
  const responseBody = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      ...(isDevelopment && error.details && { details: error.details }),
      ...(isDevelopment && error.stack && { stack: error.stack }),
    },
  };

  return NextResponse.json(responseBody, { status: error.statusCode });
}

// Try-catch wrapper for API routes
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, { function: fn.name, args });
    }
  };
}

// Database error handler
export function handleDatabaseError(error: any, operation: string): never {
  let message = `Database operation failed: ${operation}`;
  const details: Record<string, any> = { operation };

  if (error?.code) {
    details.code = error.code;
  }

  if (error?.message) {
    details.originalMessage = error.message;
  }

  if (error?.details) {
    details.originalDetails = error.details;
  }

  // Handle specific database errors
  switch (error?.code) {
    case "23505": // unique_violation
      message = "A record with this information already exists";
      break;
    case "23503": // foreign_key_violation
      message = "Referenced record does not exist";
      break;
    case "23502": // not_null_violation
      message = "Required field is missing";
      break;
    case "42P01": // undefined_table
      message = "Database table not found";
      break;
    case "42703": // undefined_column
      message = "Database column not found";
      break;
    default:
      if (error?.message?.includes("JWT")) {
        message = "Authentication token invalid or expired";
      } else if (error?.message?.includes("RLS")) {
        message = "Access denied by security policy";
      }
  }

  throw new DatabaseError(message, details);
}

// Validation error handler
export function handleValidationError(errors: any[]): never {
  const details = {
    errors: errors.map((err) => ({
      field: err.path?.join("."),
      message: err.message,
      code: err.code,
    })),
  };

  throw new ValidationError("Input validation failed", details);
}

// External API error handler
export function handleExternalAPIError(
  service: string,
  response: any,
  operation: string,
): never {
  const details = {
    service,
    operation,
    status: response?.status,
    statusText: response?.statusText,
    data: response?.data,
  };

  const message = `${service} API error during ${operation}`;

  if (response?.status === 429) {
    throw new RateLimitError(`${service} rate limit exceeded`);
  }

  if (response?.status === 401) {
    throw new AuthenticationError(`${service} authentication failed`);
  }

  if (response?.status === 403) {
    throw new AuthorizationError(`${service} access denied`);
  }

  throw new ExternalAPIError(service, message, details);
}

// Error boundary for React components
export function createErrorBoundary(
  fallback: React.ComponentType<{ error: Error }>,
) {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorLogger.log(error, {
        component: "ErrorBoundary",
        errorInfo,
      });
    }

    render() {
      if (this.state.hasError && this.state.error) {
        const FallbackComponent = fallback;
        return <FallbackComponent error={this.state.error} />;
      }

      return this.props.children;
    }
  };
}

// Type guard for Seneca errors
export function isSenecaError(error: unknown): error is SenecaError {
  return error instanceof SenecaError;
}

// HTTP status code mapping
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
