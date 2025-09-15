/**
 * Username Suggestions Utility
 * Generates username suggestions based on full name
 * Follows the username format requirements from validation schema
 */

import { USERNAME_REGEX } from '@/lib/validation/onboarding';

// Configuration constants
const MIN_SUGGESTIONS = 5;
const MAX_SUGGESTIONS = 8;
const MAX_BASE_OPTIONS = 16; // Cap work to avoid explosion

/**
 * Normalize a string for username generation
 * - Converts to lowercase
 * - Removes accents and diacritics
 * - Replaces spaces and special chars with underscores
 * - Removes consecutive underscores
 * 
 * @export Can be used to pre-fill username from full name
 */
export function normalizeForUsername(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9_-]/g, '_')    // Replace invalid chars with underscore
    .replace(/_+/g, '_')              // Collapse multiple underscores
    .replace(/^-/, '_')               // Can't start with hyphen
    .replace(/^_+|_+$/g, '');         // Trim underscores from ends
}

/**
 * Random number generator type for deterministic testing
 */
type RNG = () => number;

/**
 * Simple convenience wrapper for most common use case
 * @param fullName - The user's full name
 * @returns Array of 5-8 username suggestions
 */
export function suggestUsernames(fullName: string): string[] {
  return generateUsernameSuggestions(fullName);
}

/**
 * Generate username suggestions from a full name
 * 
 * @param fullName - The user's full name
 * @param existingUsernames - Optional list of usernames to avoid (for uniqueness)
 * @param reserved - Optional set of reserved usernames to never suggest
 * @param rng - Optional RNG function for deterministic testing (provides stable output when seeded)
 * @returns Array of 5-8 username suggestions in stable order when using deterministic RNG
 */
export function generateUsernameSuggestions(
  fullName: string,
  existingUsernames: string[] = [],
  reserved: Set<string> = new Set(),
  rng: RNG = Math.random
): string[] {
  const suggestions: string[] = [];
  const existingSet = new Set(existingUsernames.map(u => u.toLowerCase()));
  
  // Clean and split the name
  const cleanName = normalizeForUsername(fullName);
  const parts = cleanName.split('_').filter(p => p.length > 0);
  
  if (parts.length === 0) {
    // Fallback if name normalization results in nothing
    return generateRandomSuggestions(existingSet, reserved, rng);
  }
  
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleNames = parts.slice(1, -1);
  const yearSuffix = getYearSuffix();
  
  // Strategy 1: First name variations
  if (firstName && firstName.length >= 3) {
    addIfValid(suggestions, existingSet, reserved, firstName);
    addIfValid(suggestions, existingSet, reserved, `${firstName}_${yearSuffix}`);
    addIfValid(suggestions, existingSet, reserved, `${firstName}${yearSuffix}`);
  }
  
  // Strategy 2: Last name variations (if different from first)
  if (lastName && lastName.length >= 3 && lastName !== firstName) {
    addIfValid(suggestions, existingSet, reserved, lastName);
    addIfValid(suggestions, existingSet, reserved, `${lastName}_${yearSuffix}`);
    addIfValid(suggestions, existingSet, reserved, `${lastName}${yearSuffix}`);
  }
  
  // Strategy 3: First + Last combinations
  if (firstName && lastName && firstName !== lastName) {
    addIfValid(suggestions, existingSet, reserved, `${firstName}_${lastName}`);
    addIfValid(suggestions, existingSet, reserved, `${firstName}${lastName}`);
    addIfValid(suggestions, existingSet, reserved, `${firstName[0]}${lastName}`);
    addIfValid(suggestions, existingSet, reserved, `${firstName}_${lastName[0]}`);
  }
  
  // Strategy 4: With middle initial
  if (middleNames.length > 0 && firstName && lastName) {
    const middleInitial = middleNames[0][0];
    addIfValid(suggestions, existingSet, reserved, `${firstName}_${middleInitial}_${lastName}`);
    addIfValid(suggestions, existingSet, reserved, `${firstName}${middleInitial}${lastName}`);
  }
  
  // Strategy 5: Add numeric suffixes to make unique
  // Cap base options to avoid explosion
  const baseOptions = suggestions.slice(0, MAX_BASE_OPTIONS);
  for (const base of baseOptions) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    
    // Try common number patterns (2 and 3 digit variations)
    for (const suffix of [yearSuffix, getRandomDigits(2, rng), getRandomDigits(3, rng)]) {
      const candidate = `${base}${suffix}`;
      if (addIfValid(suggestions, existingSet, reserved, candidate)) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;
      }
    }
  }
  
  // If we still don't have enough, add some creative variations
  while (suggestions.length < MIN_SUGGESTIONS) {
    const randomSuggestion = createCreativeSuggestion(firstName, lastName, rng);
    if (!addIfValid(suggestions, existingSet, reserved, randomSuggestion)) {
      // Avoid infinite loop if we can't generate more valid suggestions
      break;
    }
  }
  
  return suggestions.slice(0, MAX_SUGGESTIONS);
}

/**
 * Add a username to suggestions if it's valid and unique
 */
function addIfValid(
  suggestions: string[], 
  existing: Set<string>, 
  reserved: Set<string>,
  candidate: string
): boolean {
  // Ensure it meets the regex requirements
  const formatted = candidate.slice(0, 30); // Max 30 chars
  
  // Must be 3-30 chars, match regex, and be unique
  if (
    formatted.length >= 3 &&
    formatted.length <= 30 &&
    USERNAME_REGEX.test(formatted) &&
    !existing.has(formatted) &&
    !reserved.has(formatted) &&
    !suggestions.includes(formatted)
  ) {
    suggestions.push(formatted);
    return true;
  }
  
  return false;
}

/**
 * Generate random username suggestions as fallback
 */
function generateRandomSuggestions(
  existing: Set<string>,
  reserved: Set<string>,
  rng: RNG
): string[] {
  const suggestions: string[] = [];
  const adjectives = ['cool', 'swift', 'bright', 'clever', 'happy', 'lucky', 'super', 'mega'];
  const nouns = ['user', 'person', 'friend', 'member', 'buddy', 'pal', 'mate', 'hero'];
  
  for (const adj of adjectives) {
    for (const noun of nouns) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      const base = `${adj}_${noun}`;
      const withYear = `${base}_${getYearSuffix()}`;
      
      if (!existing.has(base) && !reserved.has(base) && !suggestions.includes(base)) {
        suggestions.push(base);
      }
      if (!existing.has(withYear) && !reserved.has(withYear) && !suggestions.includes(withYear)) {
        suggestions.push(withYear);
      }
    }
  }
  
  return suggestions.slice(0, MAX_SUGGESTIONS);
}

/**
 * Create a creative username variation
 */
function createCreativeSuggestion(firstName: string | undefined, lastName: string | undefined, rng: RNG): string {
  const prefixes = ['the', 'real', 'og', 'its', 'im'];
  const suffixes = ['rocks', 'rules', 'vibes', 'zone', 'world'];
  
  const prefix = prefixes[Math.floor(rng() * prefixes.length)];
  const suffix = suffixes[Math.floor(rng() * suffixes.length)];
  const base = firstName || lastName || 'user';
  
  if (rng() > 0.5) {
    return `${prefix}_${base}`;
  } else {
    return `${base}_${suffix}`;
  }
}

/**
 * Get current year (last 2 digits) for compact suffixes
 */
function getYearSuffix(): string {
  return new Date().getFullYear().toString().slice(-2);
}

/**
 * Generate random digits for unique suffixes
 */
function getRandomDigits(count: number, rng: RNG): string {
  let result = '';
  for (let i = 0; i < count; i++) {
    result += Math.floor(rng() * 10);
  }
  return result;
}