/**
 * API Error Classes
 * Centralized error handling for consistent API responses
 */

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class AuthError extends ApiError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(message, 401, details);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, 403, details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not Found", details?: unknown) {
    super(message, 404, details);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation Failed", details?: unknown) {
    super(message, 422, details);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Too Many Requests", details?: unknown) {
    super(message, 429, details);
    this.name = "RateLimitError";
  }
}

export class ServerError extends ApiError {
  constructor(message = "Internal Server Error", details?: unknown) {
    super(message, 500, details);
    this.name = "ServerError";
  }
}
