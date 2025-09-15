# Logging Architecture

## Overview

This application implements a strict logging architecture with clear client/server boundaries and PII protection.

## Environment Variables

### Required in Production

- `LOG_SALT` - Salt for hashing PII data (emails, IDs). Must be stable across all instances.
  ```bash
  LOG_SALT=your-stable-salt-here
  ```

### Optional Configuration

- `LOG_LEVEL` - Minimum log level (`error` | `warn` | `info` | `debug`). Default: `info`
  ```bash
  LOG_LEVEL=warn  # Only log warnings and errors
  ```

- `LOG_CONSOLE_IN_PROD` - Enable console output in production (default: false)
  ```bash
  LOG_CONSOLE_IN_PROD=true  # For debugging production issues
  ```

## Logging Patterns

### Server-Side Logging

All server code (API routes, server libraries) uses structured logging:

```typescript
import { createLogger } from "@/lib/logger";

const log = createLogger({ where: "api.families" });

// Usage
log.info("Family created", { familyId, userId });
log.error(error, { op: "createFamily", familyId });
```

#### Metadata Conventions

- `where` - Component location (e.g., `api.families`, `lib.queue`)
- `op` - Operation name (e.g., `create`, `update`, `fetch`, `delete`)
- Resource IDs - Include relevant IDs without PII

### Client-Side Logging

Client components use development-only helpers:

```typescript
import { devLog, devError, devWarn } from "@/lib/client-debug";

// These are no-ops in production
devError("Failed to load", error);
devLog("State updated", { newState });
```

For user-facing errors, add toast notifications:

```typescript
import { toast } from "sonner";

toast.error("Failed to save", {
  description: "Please try again"
});
```

## PII Protection

Never log raw PII. Use the `hashId` function for sensitive data:

```typescript
import { hashId } from "@/lib/logger";

const emailHash = await hashId(email);
log.info("User login", { emailHash });
```

## ESLint Enforcement

The repository enforces `no-console` as an error globally with only three exceptions:
- `lib/logger.ts` - Server logger implementation
- `lib/client-debug.ts` - Client debug helpers
- `lib/env.ts` - Startup environment validation

## Rate Limiting & Sampling

For high-throughput paths, consider:

1. **Sampling** - Log only a percentage of events
2. **Rate limiting** - Throttle logs per time window
3. **Aggregation** - Batch similar events

Example:
```typescript
// Log only 10% of successful queue jobs
if (Math.random() < 0.1) {
  log.info("Queue job completed", { jobId });
}
```

## Monitoring Integration

Logs are structured for easy parsing by monitoring tools:

```json
{
  "level": "error",
  "message": "Database query failed",
  "where": "api.memories",
  "op": "fetch",
  "familyId": "uuid-here",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Best Practices

1. **Be Specific** - Use descriptive operation names
2. **Be Consistent** - Follow naming conventions
3. **Be Safe** - Never log passwords, tokens, or PII
4. **Be Helpful** - Include context for debugging
5. **Be Efficient** - Don't log in tight loops

## Migration Guide

If you encounter `console.*` statements:

1. **Server code** → Use `createLogger`
2. **Client code** → Use `dev*` helpers
3. **Shared code** → Move logging to call sites
4. **Critical startup** → Keep in `lib/env.ts` only