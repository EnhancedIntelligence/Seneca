# Data Flow Architecture

## Overview

The Seneca Protocol uses a three-layer data architecture with clear boundaries and type conversions at each layer.

## Data Layers

### 1. Database Layer (snake_case)
- **Location**: Supabase PostgreSQL
- **Types**: Raw DB types with snake_case fields
- **Examples**: `memory_entry`, `child_id`, `created_at`
- **Access**: Only through Supabase client or API routes

### 2. API Layer (Mixed)
- **Location**: `/app/api/*` routes and mock API
- **Types**: Domain types with mixed casing
- **Examples**: `Child`, `Memory`, `Family`
- **Purpose**: Business logic and validation

### 3. UI Layer (camelCase)
- **Location**: `/app/(app)/*` pages and `/components/*`
- **Types**: UI-optimized types with camelCase
- **Examples**: `UIMemory`, `UIChild`, `UITag`
- **Purpose**: Display and interaction

## Type Flow

```
Database → API → UI Components
   ↓        ↓         ↓
DbMemory → Memory → UIMemory
DbChild  → Child  → UIChild
```

## Adapters

### Database to UI (`/lib/adapters/*.ts`)
- `dbToUiMemory()`: Converts DB MemoryEntry to UIMemory
- `dbToUiChild()`: Converts DB Child to UIChild
- **Rule**: Total functions - no nullable returns, provide sensible defaults

### API to UI (`/lib/adapters/api.ts`)
- `apiMemoryToUi()`: Converts API Memory response to UIMemory
- `apiChildToUi()`: Converts API Child response to UIChild
- **Rule**: Handle mixed field naming from API responses

## Key Principles

1. **No Snake Case in UI Layer**
   - Components never access `child_id`, `created_at`, etc.
   - All snake_case fields converted at adapter boundary

2. **Required vs Optional Fields**
   - Required fields get sensible defaults (empty arrays, false, etc.)
   - Optional fields only included when data exists
   - Never use `undefined` as a value

3. **No Fabricated Data**
   - Display real data or loading states
   - Never calculate fake metrics
   - Use "N/A" or placeholders for missing data

4. **Type Safety at Boundaries**
   - Validate at API boundaries
   - Use Zod schemas for runtime validation
   - Document expected shapes clearly

## Data Flow Examples

### Creating a Memory
```typescript
// 1. User fills form (UI types)
const formData: MemoryFormValues = { ... }

// 2. API call converts to domain type
const memory = await api.createMemory(formData)

// 3. Response converted to UI type
const uiMemory = apiMemoryToUi(memory)

// 4. Store updated with UI type
store.addMemory(uiMemory)
```

### Fetching Children
```typescript
// 1. API returns domain types
const children = await api.getChildren()

// 2. Convert to UI types
const uiChildren = children.map(apiChildToUi)

// 3. Update store with UI types
store.setChildren(uiChildren)
```

## Common Patterns

### Default Values
```typescript
// ✅ Good - sensible defaults
imageUrls: m.image_urls || []
needsReview: m.needs_review ?? false

// ❌ Bad - undefined as value
imageUrls: m.image_urls ?? undefined
```

### Optional Fields
```typescript
// ✅ Good - only include if present
...(m.location_name && { locationName: m.location_name })

// ❌ Bad - always include with undefined
locationName: m.location_name ?? undefined
```

### Tag Normalization
```typescript
// UI always uses UITag[]
tags: (m.tags || []).map(t => ({
  id: typeof t === 'string' ? t : t.id,
  label: typeof t === 'string' ? t : t.label
}))
```

## Troubleshooting

### Type Mismatch Errors
- Check which layer the types belong to
- Use appropriate adapter for conversion
- Verify field naming (snake_case vs camelCase)

### Missing Fields
- Add to type definition with appropriate optionality
- Update adapters to handle field
- Provide sensible default if required

### API Response Issues
- Use `apiAdapters` for mixed API responses
- Handle both snake_case and camelCase in adapter
- Validate response shape at runtime

## Future Improvements

1. **Runtime Validation**
   - Add Zod schemas for all API responses
   - Validate at adapter boundaries
   - Log type mismatches for debugging

2. **Type Generation**
   - Generate types from Supabase schema
   - Keep DB and domain types in sync
   - Automate adapter creation

3. **Error Boundaries**
   - Catch type errors at component level
   - Provide fallback UI for bad data
   - Report issues to monitoring