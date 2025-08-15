# Seneca Protocol API Documentation

## API Pattern & Standards

All API routes in Seneca Protocol follow a consistent pattern for authentication, error handling, and response formatting.

### Standard Route Template

```typescript
/* eslint-disable @typescript-eslint/naming-convention */
import { NextRequest } from 'next/server';
import { ok, err, readJson } from '@/lib/server/api';
import { requireUser, requireFamilyAccess } from '@/lib/server/auth';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/server/errors';
import { checkRateLimit } from '@/lib/server/middleware/rate-limit';
import { z } from 'zod';

// Define validation schema
const inputSchema = z.object({
  field: z.string().min(1),
  // ... other fields
});

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireUser(request);
    
    // 2. Apply rate limiting (for expensive operations)
    await checkRateLimit(`${user.id}:operation-name`);
    
    // 3. Validate input
    const params = inputSchema.parse(await readJson(request));
    
    // 4. Check authorization
    await requireFamilyAccess(user.id, params.familyId);
    
    // 5. Perform operation
    const result = await performOperation(params);
    
    // 6. Return standardized response
    return ok(result);
  } catch (error) {
    // Automatic error handling
    return err(error);
  }
}
```

## Response Format

### Success Response
```json
{
  "data": {
    // Response payload
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

## Status Codes

| Status | Usage |
|--------|-------|
| **200** | Successful GET, PATCH, PUT |
| **201** | Successful POST (resource created) |
| **400** | Validation error / Bad request |
| **401** | Authentication required |
| **403** | Forbidden (authenticated but no access) |
| **404** | Resource not found |
| **422** | Validation failed (with details) |
| **429** | Rate limit exceeded |
| **500** | Internal server error |

## Authentication

All API endpoints require authentication via Bearer token:

```bash
Authorization: Bearer <supabase-jwt-token>
```

The token is validated using `requireUser(request)` which returns the authenticated user or throws an `AuthError`.

## Rate Limiting

Rate limiting is applied to expensive operations:
- **POST** endpoints: 10 requests per 10 seconds
- **AI/Analytics** endpoints: 5 requests per 60 seconds
- **DELETE/PATCH** operations: 10 requests per 10 seconds

Rate limiting is **production-only** and bypassed in development.

## API Endpoints

### Families

#### List Families
```http
GET /api/families?limit=50
```
Returns all families the user is a member of.

#### Create Family
```http
POST /api/families
Content-Type: application/json

{
  "family": {
    "name": "Smith Family",
    "description": "Optional description"
  },
  "children": [
    {
      "name": "Alice",
      "birth_date": "2020-01-15",
      "gender": "girl"
    }
  ]
}
```

#### Get Family
```http
GET /api/families/{id}
```

#### Update Family
```http
PATCH /api/families/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Leave Family (Soft Delete)
```http
DELETE /api/families/{id}
```
Removes the user's membership but preserves data for other members.

### Memories

#### List Memories
```http
GET /api/memories?family_id={id}&limit=20&offset=0
```

Query Parameters:
- `family_id` (required): Family ID
- `child_id`: Filter by child
- `category`: Filter by category
- `search`: Text search
- `processing_status`: Filter by status
- `limit`: Results per page (max 50)
- `offset`: Pagination offset

#### Create Memory
```http
POST /api/memories
Content-Type: application/json

{
  "content": "Today Alice took her first steps!",
  "familyId": "uuid",
  "childId": "uuid",
  "category": "milestone",
  "location": "Home"
}
```

#### Get Memory
```http
GET /api/memories/{id}
```

#### Update Memory
```http
PATCH /api/memories/{id}
Content-Type: application/json

{
  "title": "Updated title",
  "tags": ["milestone", "walking"]
}
```

#### Hide Memory (Soft Delete)
```http
DELETE /api/memories/{id}
```
Hides the memory for the current user only using `app_context.hidden_by`.

### Analytics

#### AI Processing Analytics
```http
GET /api/analytics/ai-processing?familyId={id}&timeframe=30d&metric=all
```

Query Parameters:
- `familyId` (required): Family ID
- `timeframe`: 24h, 7d, 30d, 90d, 1y
- `metric`: all, cost, processing_time, success_rate, milestones

### Queue Statistics

#### Get Queue Stats
```http
GET /api/queue-stats?familyId={id}
```
Returns processing queue statistics for a family.

## Soft Delete Implementation

Seneca uses **user-specific soft deletes** for memories:
- Memories are marked as hidden in `app_context.hidden_by[userId]`
- Hidden memories are filtered out in list endpoints
- Data is preserved for other family members
- Families use membership removal for soft delete

## Error Handling Examples

### Validation Error (422)
```json
{
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "content",
        "message": "String must contain at least 10 character(s)"
      }
    ]
  }
}
```

### Rate Limit Error (429)
```json
{
  "error": {
    "message": "Too Many Requests",
    "details": {
      "limit": 10,
      "remaining": 0,
      "reset": "2025-08-15T12:00:00Z"
    }
  }
}
```

### Not Found Error (404)
```json
{
  "error": {
    "message": "Memory not found"
  }
}
```

## Testing

### Example Integration Test

```typescript
import { describe, it, expect } from 'vitest';

describe('POST /api/memories', () => {
  it('should create memory with valid data', async () => {
    const response = await fetch('/api/memories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'Test memory content',
        familyId: testFamilyId,
        childId: testChildId
      })
    });
    
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.id).toBeDefined();
    expect(data.content).toBe('Test memory content');
  });
  
  it('should return 401 without auth', async () => {
    const response = await fetch('/api/memories', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test' })
    });
    
    expect(response.status).toBe(401);
  });
  
  it('should return 403 for unauthorized family', async () => {
    const response = await fetch('/api/memories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'Test',
        familyId: unauthorizedFamilyId
      })
    });
    
    expect(response.status).toBe(403);
  });
});
```

## Client Error Handling

```typescript
// Recommended client-side fetch wrapper
async function apiRequest(path: string, options?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  if (response.status === 401) {
    // Redirect to login or refresh token
    await refreshAuth();
    throw new Error('Authentication required');
  }
  
  if (response.status === 403) {
    throw new Error('Access denied');
  }
  
  if (response.status === 429) {
    const { error } = await response.json();
    // Show rate limit message to user
    throw new Error(`Rate limited. Try again at ${error.details.reset}`);
  }
  
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error.message);
  }
  
  const { data } = await response.json();
  return data;
}
```

## Security Considerations

1. **Authentication**: All routes require valid Supabase JWT tokens
2. **Authorization**: Family membership verified for all family-scoped operations
3. **Rate Limiting**: Prevents abuse and controls costs
4. **Input Validation**: Zod schemas validate all inputs
5. **SQL Injection**: Prevented by Supabase query builder
6. **Service Role Key**: Only used server-side with `import 'server-only'`
7. **Error Messages**: No sensitive data exposed in error responses

## Performance Optimizations

1. **Pagination**: All list endpoints support limit/offset
2. **Soft Delete**: No data loss, fast filtering
3. **Rate Limiting**: Production-only, no dev friction
4. **Query Optimization**: Indexes on family_id, user_id, deleted_at

## Migration Guide

If migrating from old endpoints:

```typescript
// Old pattern
const response = await fetch('/api/memories/create', {...});
const memory = await response.json();

// New pattern
const response = await fetch('/api/memories', { method: 'POST', ... });
const { data: memory } = await response.json();
```

---

## Version History

- **v1.0.0** (2025-08-15): Initial API standardization
  - Centralized auth with `requireUser`
  - Standardized responses with `ok/err`
  - Rate limiting on expensive operations
  - Consistent error handling