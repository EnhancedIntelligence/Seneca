import { describe, it, expect } from 'vitest';
import { toE164, isValidE164, formatForDisplay, DIGIT_MIN, DIGIT_MAX } from '@/lib/utils/phone';

describe('Phone Utilities', () => {
  describe('toE164', () => {
    it.each([
      ['+14155551234', '+14155551234'],
      ['+1 415 555 1234', '+14155551234'],
      ['+1 (415) 555-1234', '+14155551234'],
      ['+14155551234 x55', '+14155551234'],
      ['+14155551234 ext 99', '+14155551234'],
      ['+442012345678;99', '+442012345678'],
      ['+14155551234,77', '+14155551234'],
      ['  +14155551234  ', '+14155551234'], // leading/trailing spaces
      ['+44\u00A020\u20091234\u200B5678', '+442012345678'], // NBSP, thin/ZW spaces
      ['+14155551234p123', '+14155551234'], // pause char
      ['+14155551234w99', '+14155551234'],  // wait char
    ])('normalizes %s → %s', (input, expected) => {
      expect(toE164(input)).toBe(expected);
    });

    it.each([
      ['+1\u2011415\u2013555\u22121234', '+14155551234'], // NB hyphen, en-dash, minus
      ['+1\u2010415\u2014555\u20151234', '+14155551234'], // hyphen, em-dash, horizontal bar
    ])('normalizes hyphen-like separators %s → %s', (input, expected) => {
      expect(toE164(input)).toBe(expected);
    });

    it.each([
      ['14155551234', 'no +'],
      ['(415) 555-1234', 'no country code'],
      ['415-555-1234', 'no +'],
      ['+1234567', 'too short (7)'],
      ['+1234567890123456', 'too long (16)'],
      ['', 'empty'],
      ['not a phone', 'invalid format'],
      ['++14155551234', 'double +'],
      ['\uFF0B14155551234', 'full-width plus'],
      ['tel:+14155551234', 'scheme prefix'],
      ['011 44 20 1234 5678', 'IDD prefix'],
    ])('rejects %s (%s)', (input, reason) => {
      expect(toE164(input)).toBeNull();
    });

    it('accepts international examples', () => {
      expect(toE164('+442012345678')).toBe('+442012345678'); // UK
      expect(toE164('+33123456789')).toBe('+33123456789');   // France
      expect(toE164('+861234567890')).toBe('+861234567890'); // China
      expect(toE164('+81312345678')).toBe('+81312345678');   // Japan
      expect(toE164('+917012345678')).toBe('+917012345678'); // India
    });

    it('boundary: min=8, max=15 digits after country code', () => {
      const minOk = '+' + '1'.repeat(8);
      const tooShort = '+' + '1'.repeat(7);
      const maxOk = '+' + '1'.repeat(15);
      const tooLong = '+' + '1'.repeat(16);
      
      expect(toE164(minOk)).toBe(minOk);
      expect(toE164(tooShort)).toBeNull();
      expect(toE164(maxOk)).toBe(maxOk);
      expect(toE164(tooLong)).toBeNull();
    });

    it('handles edge cases with null/undefined gracefully', () => {
      expect(toE164(null as any)).toBeNull();
      expect(toE164(undefined as any)).toBeNull();
      expect(toE164(12345 as any)).toBeNull(); // number input
    });

    it('round-trip with display formatting', () => {
      const testCases = ['+14155551234', '+442012345678', '+33123456789'];
      testCases.forEach(e164 => {
        const displayed = formatForDisplay(e164);
        expect(toE164(displayed)).toBe(e164);
      });
    });

    it('idempotent - applying twice gives same result', () => {
      const input = '+1 (415) 555-1234';
      const once = toE164(input);
      const twice = toE164(once!);
      expect(twice).toBe(once);
    });
  });

  describe('isValidE164', () => {
    it.each([
      ['+14155551234', true],
      ['+442012345678', true],
      ['+12345678', true],            // min 8 digits
      ['+123456789012345', true],     // max 15 digits
      ['14155551234', false],         // no +
      ['+1 415 555 1234', false],     // has spaces
      ['+1234567', false],            // too short
      ['+1234567890123456', false],   // too long
      ['', false],                    // empty
      ['\uFF0B14155551234', false],   // full-width +
      ['tel:+14155551234', false],    // scheme prefix
    ])('validates %s as %s', (input, expected) => {
      expect(isValidE164(input)).toBe(expected);
    });

    it('valid after normalization', () => {
      const testCases = [
        '+1 (415)\u00A0555-1234',
        '+44 20 1234 5678',
        '+33 1 23 45 67 89',
      ];
      
      testCases.forEach(input => {
        const normalized = toE164(input);
        if (normalized) {
          expect(isValidE164(normalized)).toBe(true);
        }
      });
    });

    it('consistency: toE164 output is always valid E164', () => {
      const inputs = [
        '+1 415 555 1234',
        '+44 (20) 1234-5678',
        '+33-1-23-45-67-89',
        '+1 (415) 555-1234,77', // with extension
      ];
      
      inputs.forEach(input => {
        const result = toE164(input);
        if (result !== null) {
          expect(isValidE164(result)).toBe(true);
        }
      });
    });
  });

  describe('formatForDisplay', () => {
    it('formats US numbers correctly', () => {
      expect(formatForDisplay('+14155551234')).toBe('+1 (415) 555-1234');
      expect(formatForDisplay('+12125551234')).toBe('+1 (212) 555-1234');
      expect(formatForDisplay('+13105551234')).toBe('+1 (310) 555-1234');
    });

    it('formats UK numbers', () => {
      const result = formatForDisplay('+442012345678');
      // Use looser assertion to avoid brittleness
      expect(result).toMatch(/^\+44 20 /);
    });

    it('uses generic formatting for unknown patterns', () => {
      const testCases = [
        ['+33123456789', '+33'],    // France
        ['+861234567890', '+86'],   // China
        ['+81312345678', '+81'],    // Japan
      ];
      
      testCases.forEach(([input, prefix]) => {
        const result = formatForDisplay(input);
        expect(result).toContain(prefix);
        expect(result).toMatch(/\s/); // has spacing
      });
    });

    it('returns input unchanged if not valid E.164', () => {
      expect(formatForDisplay('not a phone')).toBe('not a phone');
      expect(formatForDisplay('')).toBe('');
      expect(formatForDisplay('415-555-1234')).toBe('415-555-1234');
    });

    it('handles null/undefined gracefully', () => {
      expect(formatForDisplay(null as any)).toBe(null);
      expect(formatForDisplay(undefined as any)).toBe(undefined);
    });

    it('reversible - format then normalize returns original', () => {
      const e164Numbers = [
        '+14155551234',
        '+442012345678',
        '+33123456789',
      ];
      
      e164Numbers.forEach(original => {
        const formatted = formatForDisplay(original);
        const normalized = toE164(formatted);
        expect(normalized).toBe(original);
      });
    });
  });

  describe('Invariants', () => {
    it('full cycle: input → normalize → validate → format → normalize', () => {
      const userInput = '+1 (415) 555-1234 ext 99';
      
      // Step 1: Normalize user input
      const normalized = toE164(userInput);
      expect(normalized).toBe('+14155551234');
      
      // Step 2: Validate
      expect(isValidE164(normalized!)).toBe(true);
      
      // Step 3: Format for display
      const displayed = formatForDisplay(normalized!);
      expect(displayed).toBe('+1 (415) 555-1234');
      
      // Step 4: Re-normalize should give same result
      expect(toE164(displayed)).toBe(normalized);
    });

    it('round-trip property for multiple regions', () => {
      const e164Numbers = [
        '+14155551234',   // US
        '+442012345678',  // UK
        '+49301234567',   // Germany
        '+33123456789',   // France
        '+861234567890',  // China
      ];
      
      e164Numbers.forEach(e164 => {
        const formatted = formatForDisplay(e164);
        const normalized = toE164(formatted);
        expect(normalized).toBe(e164);
        expect(isValidE164(normalized!)).toBe(true);
      });
    });

    it('normalized output is always valid E.164', () => {
      const testInputs = [
        '+1 (415) 555-1234,77',
        '  +44 20 1234 5678  ',
        '+33-1-23-45-67-89',
      ];
      
      testInputs.forEach(input => {
        const normalized = toE164(input);
        if (normalized !== null) {
          expect(isValidE164(normalized)).toBe(true);
        }
      });
    });
  });
});