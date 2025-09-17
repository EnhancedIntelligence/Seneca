/**
 * Standard API error handling utilities
 * Provides consistent error responses, logging, and Response helpers across all API routes
 */

import { APIResponse } from '@/lib/types/api/memories';

// Error codes enum
export enum ErrorCode {
  // Authentication/Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation / request
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // Rate limiting / quotas
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// HTTP status code mapping
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,

  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: 415,
  [ErrorCode.INVALID_STATE_TRANSITION]: 400,

  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,

  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 402,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

/** Custom API error class */
export class APIException extends Error {
  public statusCode: number;
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'APIException';
    this.statusCode = statusCode || ERROR_STATUS_MAP[code] || 500;
  }
}

/** Generate a request ID for tracking (propagate if provided by gateway) */
export function correlationIdFrom(req?: Request): string {
  const external =
    req?.headers.get('x-request-id') ||
    req?.headers.get('cf-ray') ||
    req?.headers.get('x-vercel-id');
  // Prefer crypto UUID when available
  const local =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return external ?? local;
}

/** Redact obviously sensitive fields from error details */
function redact(obj: Record<string, any> | undefined) {
  if (!obj) return undefined;
  const redacted: Record<string, any> = {};
  const SENSITIVE = /pass|pwd|secret|token|auth|cookie|session|key|email|phone|ssn/i;
  for (const [k, v] of Object.entries(obj)) {
    redacted[k] = SENSITIVE.test(k) ? '[redacted]' : v;
  }
  return redacted;
}

/** Map common DB / Supabase errors to our error model */
export function mapDbError(e: any): APIException {
  // Postgres error codes if present
  const pgCode: string | undefined = e?.code || e?.details?.code;
  switch (pgCode) {
    case '23505': // unique_violation
      return new APIException(ErrorCode.CONFLICT, 'Resource already exists', redact(e));
    case '23503': // foreign_key_violation
      return new APIException(ErrorCode.INVALID_REQUEST, 'Invalid reference', redact(e));
    case '23514': // check_violation
      return new APIException(ErrorCode.VALIDATION_ERROR, 'Validation failed', redact(e));
    case '42501': // insufficient_privilege
      return new APIException(ErrorCode.FORBIDDEN, 'Forbidden', undefined);
    default:
      break;
  }

  // PostgREST / Supabase HTTP-level shapes
  const status = e?.status || e?.statusCode;
  if (status === 404) return new APIException(ErrorCode.NOT_FOUND, 'Not found', redact(e), 404);
  if (status === 401) return new APIException(ErrorCode.UNAUTHORIZED, 'Unauthorized', undefined, 401);
  if (status === 403) return new APIException(ErrorCode.FORBIDDEN, 'Forbidden', undefined, 403);
  if (status === 409) return new APIException(ErrorCode.CONFLICT, 'Conflict', redact(e), 409);
  if (status === 422)
    return new APIException(ErrorCode.VALIDATION_ERROR, 'Validation failed', redact(e), 422);

  return new APIException(ErrorCode.INTERNAL_ERROR, 'Database error', redact(e));
}

/** Map Zod error without importing zod directly */
export function mapZodError(e: any): APIException {
  const isZod = e?.name === 'ZodError' || Array.isArray(e?.issues);
  if (!isZod) return new APIException(ErrorCode.INVALID_REQUEST, 'Invalid request body');
  return new APIException(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    { issues: e.issues?.map((i: any) => ({ path: i.path, message: i.message })) },
    422
  );
}

/** Create a standard API error response payload */
export function createErrorResponse<T>(
  error: APIException | Error,
  requestId?: string
): APIResponse<T> {
  const reqId = requestId || correlationIdFrom();
  if (error instanceof APIException) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: redact(error.details),
      },
      request_id: reqId,
    };
  }
  return {
    ok: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      details:
        process.env.NODE_ENV === 'development'
          ? { originalError: (error as Error)?.message }
          : undefined,
    },
    request_id: reqId,
  };
}

/** Create a success payload */
export function createSuccessResponse<T>(data: T, requestId?: string): Extract<APIResponse<T>, { ok: true }> {
  return { ok: true, data, request_id: requestId || correlationIdFrom() };
}

/** Serialize APIResponse<T> to a proper HTTP Response with status & headers */
export function jsonResponse<T>(
  payload: APIResponse<T>,
  init?: { status?: number; headers?: HeadersInit }
): Response {
  const baseHeaders: HeadersInit = {
    'content-type': 'application/json; charset=utf-8',
    'x-request-id': (payload as any)?.request_id ?? correlationIdFrom(),
  };
  let status = init?.status ?? 200;

  if ((payload as any)?.ok === false) {
    // choose status from error code map
    const code = (payload as any).error?.code as ErrorCode | undefined;
    status = init?.status ?? (code ? ERROR_STATUS_MAP[code] : 500);

    // Add Retry-After header for rate limited responses
    if (code === ErrorCode.RATE_LIMITED) {
      const details = (payload as any).error?.details;
      if (details?.reset_in_seconds) {
        (baseHeaders as any)['Retry-After'] = String(details.reset_in_seconds);
      }
    }
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...baseHeaders, ...init?.headers },
  });
}

/** Logger utility for API operations (JSON lines) */
export class APILogger {
  constructor(private route: string) {}

  private write(level: 'info' | 'warn' | 'error', message: string, requestId?: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      route: this.route,
      request_id: requestId,
      message,
      ...data,
    };
    (level === 'error' ? console.error : console.log)(JSON.stringify(logData));
  }

  info(message: string, requestId?: string, data?: any): void {
    this.write('info', message, requestId, data);
  }
  warn(message: string, requestId?: string, data?: any): void {
    this.write('warn', message, requestId, data);
  }
  error(message: string, requestId?: string, error?: any): void {
    const errorData =
      error instanceof Error
        ? {
            error_name: error.name,
            error_message: error.message,
            error_stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          }
        : { error: redact(error) };
    this.write('error', message, requestId, errorData);
  }
}

/** Validate request method helper (throws 405 and lists Allow header) */
export function validateMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new APIException(
      ErrorCode.METHOD_NOT_ALLOWED,
      `Method ${request.method} not allowed. Use: ${allowedMethods.join(', ')}`,
      { allowed_methods: allowedMethods },
      405
    );
  }
}

/** Parse and validate JSON body (content-type + JSON parse) */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  const ct = request.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    throw new APIException(
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      'Content-Type must be application/json'
    );
  }
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new APIException(
      ErrorCode.INVALID_REQUEST,
      'Invalid JSON in request body',
      { parse_error: error instanceof Error ? error.message : 'Unknown parse error' }
    );
  }
}

/** Extract user ID from session (temporary header-based fallback for PR-2) */
export async function getUserIdFromSession(request: Request): Promise<string> {
  // TODO(PR-1/PR-2): replace with Supabase server client session lookup.
  const headerUser = request.headers.get('x-user-id');
  if (headerUser) return headerUser;
  throw new APIException(
    ErrorCode.UNAUTHORIZED,
    'Authentication required',
    { hint: 'Implement Supabase auth middleware and session extraction' }
  );
}

/**
 * Check if error looks like a database/PostgREST error
 * Be conservative: only match genuine DB errors, not APIException with a code property
 */
function isDbLikeError(x: any): boolean {
  // PostgREST errors have status (number) or details
  // PostgreSQL errors have 5-digit string codes like '23505'
  return (
    typeof x?.status === 'number' ||
    typeof x?.details === 'string' ||
    (typeof x?.code === 'string' && /^\d{5}$/.test(x.code)) // PG error code format
  );
}

/**
 * Higher-order route wrapper:
 * - validates method
 * - sets/propagates request id
 * - catches errors (Zod/DB/unknown)
 * - returns proper JSON Response
 *
 * Usage:
 * export const POST = wrapRoute(async (req, { logger, requestId }) => {
 *   // Option 1: Return APIResponse (wrapRoute converts to Response)
 *   return createSuccessResponse(data, requestId);
 *
 *   // Option 2: Return Response directly (for custom headers/status)
 *   return jsonResponse(createSuccessResponse(data, requestId), { headers: customHeaders });
 * }, ['POST']);
 */
export function wrapRoute(
  handler: (request: Request, ctx: { logger: APILogger; requestId: string }) => Promise<APIResponse<any> | Response>,
  allowedMethods: string[]
) {
  return async function route(request: Request): Promise<Response> {
    const requestId = correlationIdFrom(request);
    const logger = new APILogger(new URL(request.url).pathname);

    try {
      validateMethod(request, allowedMethods);
      const result = await handler(request, { logger, requestId });

      // If the handler already built a Response (to attach headers, status, etc.), return it as-is
      if (result instanceof Response) {
        return result;
      }

      // Otherwise treat it as an APIResponse<T> and convert to Response
      return jsonResponse(result, { headers: { 'x-request-id': requestId } });
    } catch (e: any) {
      // Classify errors - check APIException first!
      let err: APIException;
      if (e instanceof APIException) {
        // Our own exceptions should pass through unchanged
        err = e;
      } else if (e?.name === 'ZodError') {
        // Validation errors from Zod
        err = mapZodError(e);
      } else if (isDbLikeError(e)) {
        // Database/Supabase errors
        err = mapDbError(e);
      } else {
        // Unknown errors
        err = new APIException(ErrorCode.INTERNAL_ERROR, 'Unhandled error');
      }

      logger.error('route_error', requestId, err);
      const payload = createErrorResponse(err, requestId);
      return jsonResponse(payload, { status: err.statusCode, headers: { 'x-request-id': requestId } });
    }
  };
}