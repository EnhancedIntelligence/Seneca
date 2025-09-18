# Legacy Alias Removal Plan

## Overview
This document outlines the plan to remove legacy type aliases that were created for backward compatibility during the memory_entries → memories table migration.

## Current State (As of 2025-09-18)

### Legacy Aliases in Use
```typescript
// lib/database.ts
export type MemoryEntry = Memory;
export type MemoryEntryInsert = MemoryInsert;
export type MemoryEntryUpdate = MemoryUpdate;

// lib/types.ts
export type MemoryEntry = Memory;
export type MemoryEntryInsert = MemoryInsert;
export type MemoryEntryUpdate = MemoryUpdate;
```

### Files Still Using Legacy Aliases
- `lib/ai-processor.ts` - imports MemoryEntry
- `lib/stores/mockDataAdapter.ts` - imports MemoryEntry
- `lib/adapters/memory.ts` - imports MemoryEntryInsert, MemoryEntryUpdate

## Phase 1: Preparation (Current)
✅ **Completed:**
- Created ESLint rule to prevent new usage
- Added CI grep gate to catch regressions
- Centralized status mapping functions
- All tests passing with current setup

## Phase 2: Replace Imports (Next PR)
**Timeline: Within 1-2 days after Phase 4 migration is applied**

### Changes Required:
1. **lib/ai-processor.ts**
   ```diff
   - import { MemoryEntry, Child, Family, MemoryStatus } from "./database";
   + import { Memory, Child, Family, MemoryStatus } from "./database";

   interface MemoryAnalysisContext {
   -  memory: MemoryEntry;
   +  memory: Memory;
   ```

2. **lib/stores/mockDataAdapter.ts**
   ```diff
   - import type { MemoryEntry, Child, ProcessingStatus } from "@/lib/types";
   + import type { Memory, Child, ProcessingStatus } from "@/lib/types";

   - export function mockMemoryToDbMemory(mock: MockMemory): MemoryEntry {
   + export function mockMemoryToDbMemory(mock: MockMemory): Memory {
   ```

3. **lib/adapters/memory.ts**
   ```diff
   - import type {
   -   DbMemory,
   -   UIMemory,
   -   UIMemoryType,
   -   UITag,
   -   ProcessingStatus,
   -   MemoryEntryInsert,
   -   MemoryEntryUpdate,
   - } from "@/lib/types";
   + import type {
   +   DbMemory,
   +   UIMemory,
   +   UIMemoryType,
   +   UITag,
   +   ProcessingStatus,
   +   MemoryInsert,
   +   MemoryUpdate,
   + } from "@/lib/types";

   - export function uiToDbMemoryInsert(m: Omit<UIMemory, "id">): MemoryEntryInsert {
   + export function uiToDbMemoryInsert(m: Omit<UIMemory, "id">): MemoryInsert {

   - export function uiUpdateToDb(updates: Partial<UIMemory>): MemoryEntryUpdate {
   + export function uiUpdateToDb(updates: Partial<UIMemory>): MemoryUpdate {
   ```

## Phase 3: Remove Aliases (Following PR)
**Timeline: After Phase 2 is tested and deployed**

### Changes:
1. Remove alias exports from `lib/database.ts`
2. Remove alias exports from `lib/types.ts`
3. Update ESLint config to error on any MemoryEntry* imports
4. Update CI to fail on any MemoryEntry* references

## Phase 4: Cleanup
**Timeline: 30 days after Phase 3**

### Actions:
1. Remove `StatusCompat` from `lib/database-compatibility.ts`
2. Consider removing entire `database-compatibility.ts` if no longer needed
3. Archive this document to `docs/archive/`

## Validation Checklist

Before each phase:
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint passing
- [ ] CI legacy guard passing
- [ ] Manual testing of memory CRUD operations
- [ ] Review of bundle size impact

## Rollback Plan

If issues arise:
1. **Quick Fix**: Re-add aliases temporarily
2. **Root Cause**: Identify missed imports
3. **Fix Forward**: Update imports and remove aliases again

## Commands for Validation

```bash
# Find all current usage
rg "MemoryEntry" --type ts --type tsx

# Test build
npm run build

# Run all tests
npm run test:unit

# Type check
npm run typecheck

# Lint
npm run lint
```

## Risk Assessment

**Low Risk**:
- Changes are purely type-level
- No runtime behavior changes
- ESLint will catch any missed imports

**Mitigation**:
- Gradual rollout (imports first, then aliases)
- Comprehensive test coverage exists
- CI gates prevent regressions