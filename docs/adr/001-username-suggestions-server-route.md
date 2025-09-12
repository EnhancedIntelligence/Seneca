# ADR-001: Username Suggestions via Server Route vs Action

## Status
Accepted

## Context
The onboarding form needs to provide real-time username availability checking and suggestions. We needed to decide between implementing this as a Server Action or a dedicated API route.

## Decision
We chose to implement username suggestions as a dedicated GET API route (`/api/onboarding/username-suggestions`) rather than a Server Action.

## Rationale

### Why Server Route Over Action

1. **HTTP Semantics**: Username checking is a read-only operation that should use GET. Server Actions are POST-only.

2. **Caching Benefits**: GET requests can leverage browser caching and CDN caching with proper Cache-Control headers.

3. **Abort Support**: Fetch API allows aborting in-flight requests when user types quickly, preventing race conditions.

4. **Rate Limiting**: Easier to implement standard rate limiting middleware for API routes.

5. **Observability**: Standard HTTP metrics, logs, and monitoring tools work better with REST endpoints.

## Tradeoffs

### Advantages of Our Approach
- Clean REST semantics (GET for queries)
- Browser can cache repeated checks
- Simple abort handling for debounced requests
- Standard rate limiting patterns
- Easy to test with standard HTTP tools
- Can be called from any client (not just React)

### Disadvantages
- Slightly more boilerplate than Server Actions
- Need to handle JSON serialization manually
- Separate error handling pattern from form actions

## Implementation Details

```typescript
// Route: GET /api/onboarding/username-suggestions?q=username
{
  available: boolean;
  suggestions: string[];
}
```

- Debounced at 300ms on client
- Rate limited to 10/min per user
- Returns `Cache-Control: no-store` to prevent stale data
- Abortable via AbortController

## Future Considerations

### Batched RPC (Future Optimization)
If performance becomes an issue with multiple username checks, we could implement a batched RPC endpoint that checks multiple usernames in a single request:

```typescript
POST /api/onboarding/batch-check
{
  usernames: string[]
}
// Returns availability for all in one round trip
```

This would remain a separate optimization from the main form submission action.

## References
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [HTTP Caching MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)