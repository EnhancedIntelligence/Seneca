/**
 * Child Adapter with Computed Fields
 * Converts between DB Child type and UI-friendly format with computed properties
 */

import type { DbChild, UIChild, ChildInsert, ChildUpdate } from "@/lib/types";

/**
 * Generate initials from a name
 */
const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") ||
  name[0]?.toUpperCase() ||
  "?";

/**
 * Generate a consistent emoji based on name
 */
const emojiOf = (name: string): string => {
  const table = ["🦊", "🐻", "🐨", "🦁", "🐯", "🐼", "🐵", "🐧", "🦄", "🐙"];
  const hash = Math.abs(
    Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0),
  );
  const index = hash % table.length;
  return table[index] ?? "🌟";
};

/**
 * Generate a gradient based on a seed string
 */
const gradientOf = (seed: string): string => {
  const hash = Math.abs(
    Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0),
  );
  const hue = hash % 360;
  // Return Tailwind-compatible gradient classes
  const gradients = [
    "bg-gradient-to-r from-pink-500 to-rose-500",
    "bg-gradient-to-r from-blue-500 to-cyan-500",
    "bg-gradient-to-r from-purple-500 to-indigo-500",
    "bg-gradient-to-r from-green-500 to-emerald-500",
    "bg-gradient-to-r from-yellow-500 to-orange-500",
    "bg-gradient-to-r from-violet-500 to-purple-500",
    "bg-gradient-to-r from-teal-500 to-cyan-500",
    "bg-gradient-to-r from-amber-500 to-orange-500",
  ];
  return gradients[hash % gradients.length] ?? gradients[0];
};

/**
 * Calculate age from birth date
 */
const ageFrom = (
  iso: string | null,
): { years: number; months: number } | null => {
  if (!iso) return null;

  try {
    const birth = new Date(iso);
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    // Adjust if day hasn't occurred yet this month
    if (now.getDate() < birth.getDate()) {
      months -= 1;
      if (months < 0) {
        years -= 1;
        months += 12;
      }
    }

    return { years, months };
  } catch {
    return null;
  }
};

/**
 * Convert DB Child to UI-friendly format with computed fields
 */
export function dbToUiChild(c: DbChild): UIChild {
  const name = c.name;

  return {
    id: c.id,
    familyId: c.family_id,
    name,
    avatarUrl: c.profile_image_url,
    birthDate: c.birth_date,
    age: ageFrom(c.birth_date),
    initials: initialsOf(name),
    emoji: emojiOf(name),
    gradient: gradientOf(c.id + name), // Use id + name for uniqueness
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/**
 * Convert UI Child to DB Insert format
 */
export function uiToDbChildInsert(
  c: Omit<
    UIChild,
    "id" | "createdAt" | "updatedAt" | "age" | "initials" | "emoji" | "gradient"
  >,
  createdBy: string,
): ChildInsert {
  return {
    family_id: c.familyId,
    name: c.name,
    birth_date: c.birthDate || "", // DB requires string, use empty string for null
    profile_image_url: c.avatarUrl,
    created_by: createdBy,
    // created_at/updated_at are DB defaults
  };
}

/**
 * Convert UI Child back to full DB format (for mocking/testing)
 */
export function uiToDbChild(c: UIChild): DbChild {
  return {
    id: c.id,
    family_id: c.familyId,
    name: c.name,
    birth_date: c.birthDate ?? "",
    gender: null,
    notes: null,
    profile_image_url: c.avatarUrl,
    created_by: "system",
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

/**
 * Convert partial UI updates to DB update format
 */
export function uiChildUpdateToDb(updates: Partial<UIChild>): ChildUpdate {
  const dbUpdate: ChildUpdate = {};

  if (updates.name !== undefined) dbUpdate.name = updates.name;
  if (updates.birthDate !== undefined)
    dbUpdate.birth_date = updates.birthDate || "";
  if (updates.avatarUrl !== undefined)
    dbUpdate.profile_image_url = updates.avatarUrl;

  // updated_at handled by DB trigger
  return dbUpdate;
}
