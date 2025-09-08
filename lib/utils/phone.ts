/** Phone number utilities for E.164 formatting */

const E164_REGEX = /^\+\d{8,15}$/;

/**
 * Convert phone input to strict E.164 format.
 * Accepts only numbers that already include a '+' country code.
 * Returns null if invalid (we do NOT guess the country code).
 * Strips extensions (ext, x, ;, #, ,) before processing.
 * 
 * Examples:
 * - "+14155551234" → "+14155551234" (valid US)
 * - "+1 415 555 1234" → "+14155551234" (strips spaces)
 * - "+14155551234 x55" → "+14155551234" (strips extension)
 * - "+442012345678;99" → "+442012345678" (strips extension)
 * - "+14155551234,77" → "+14155551234" (strips pause/extension)
 * - "14155551234" → null (no leading +)
 * - "(415) 555-1234" → null (no country code)
 * - "+1234567" → null (too short, min 8 digits)
 */
export function toE164(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith('+')) return null;

  // Remove extension-like suffixes (e.g., ext, x, ;, #, ,, letters) before digit cleanup
  const rawBody = trimmed.slice(1);
  const cutAt = rawBody.search(/[A-Za-z#;,]/); // first letter or special marker
  const body = cutAt >= 0 ? rawBody.slice(0, cutAt) : rawBody;

  // Keep only digits in the significant number
  const digits = body.replace(/\D/g, '');
  const normalized = `+${digits}`;

  return E164_REGEX.test(normalized) ? normalized : null;
}

/**
 * True if the string is already strict E.164 (+ and 8–15 digits).
 */
export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

/**
 * Very basic display formatting for known patterns; falls back to generic grouping.
 * NOTE: This is intentionally light-weight; for international formatting,
 * consider libphonenumber-js in a later iteration.
 * 
 * Examples:
 * - "+14155551234" → "+1 415 555 1234" (US)
 * - "+447911123456" → "+44 7911 123456" (UK)
 * - "+33612345678" → "+336 1234 5678" (generic)
 */
export function formatE164Display(e164: string): string {
  if (!isValidE164(e164)) return e164;
  
  // US: +1 NXX NXX XXXX
  if (e164.startsWith('+1') && e164.length === 12) {
    return e164.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '+1 $1 $2 $3');
  }
  
  // UK (very simplified): +44 XXXX XXXXXX
  if (e164.startsWith('+44') && e164.length === 13) {
    return e164.replace(/^\+44(\d{4})(\d{6})$/, '+44 $1 $2');
  }
  
  // Generic fallback: country code + grouped remainder
  const cc = e164.match(/^\+\d{1,3}/)?.[0] ?? '';
  const rest = e164.slice(cc.length);
  const chunks = rest.match(/.{1,4}/g) ?? [];
  return `${cc} ${chunks.join(' ')}`.trim();
}