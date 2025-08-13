/**
 * Bidirectional Child Adapters
 * Converts between UI camelCase types and DB snake_case types
 */

import type { Child } from '@/lib/types';

// UI-friendly child type with camelCase and computed fields
export type UIChild = {
  id: string;
  familyId: string | null;
  name: string;
  birthDate: string;
  age: string; // Computed from birthDate
  gender: string | null;
  notes: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // UI-only fields for display
  initials: string;
  gradient: string;
};

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageMs = now.getTime() - birth.getTime();
  const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
  const ageMonths = Math.floor(ageMs / (30.44 * 24 * 60 * 60 * 1000));
  
  if (ageYears >= 2) {
    return `${ageYears} years`;
  } else if (ageMonths >= 1) {
    return `${ageMonths} months`;
  } else {
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    return `${ageDays} days`;
  }
}

/**
 * Generate gradient based on child ID
 */
function generateGradient(id: string): string {
  const gradients = [
    'bg-gradient-to-r from-pink-500 to-rose-500',
    'bg-gradient-to-r from-blue-500 to-cyan-500',
    'bg-gradient-to-r from-purple-500 to-indigo-500',
    'bg-gradient-to-r from-green-500 to-emerald-500',
    'bg-gradient-to-r from-yellow-500 to-orange-500',
  ];
  
  // Use ID to deterministically select a gradient
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

/**
 * Convert DB Child to UI-friendly format
 */
export function dbToUiChild(db: Child): UIChild {
  const initials = db.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  return {
    id: db.id,
    familyId: db.family_id,
    name: db.name,
    birthDate: db.birth_date,
    age: calculateAge(db.birth_date),
    gender: db.gender,
    notes: db.notes,
    profileImageUrl: db.profile_image_url,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    initials,
    gradient: generateGradient(db.id),
  };
}

/**
 * Convert UI child draft to DB Child for creation
 */
export function uiToDbChild(input: {
  name: string;
  birthDate: string;
  gender?: string;
  notes?: string;
  familyId?: string;
}): Child {
  const now = new Date().toISOString();
  return {
    id: `child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    family_id: input.familyId || 'mock-family-1',
    name: input.name,
    birth_date: input.birthDate,
    gender: input.gender || null,
    notes: input.notes || null,
    profile_image_url: null,
    created_by: 'mock-user-1',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Convert partial UI updates to DB update format
 */
export function uiChildUpdateToDb(updates: Partial<UIChild>): Partial<Child> {
  const dbUpdate: Partial<Child> = {};
  
  if (updates.name !== undefined) dbUpdate.name = updates.name;
  if (updates.birthDate !== undefined) dbUpdate.birth_date = updates.birthDate;
  if (updates.gender !== undefined) dbUpdate.gender = updates.gender;
  if (updates.notes !== undefined) dbUpdate.notes = updates.notes;
  if (updates.profileImageUrl !== undefined) dbUpdate.profile_image_url = updates.profileImageUrl;
  
  dbUpdate.updated_at = new Date().toISOString();
  
  return dbUpdate;
}