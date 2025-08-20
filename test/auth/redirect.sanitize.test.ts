import { describe, it, expect } from 'vitest';
import { sanitizeNextPath } from '@/lib/auth/redirect';

describe('sanitizeNextPath', () => {
  it('allows internal paths', () => {
    expect(sanitizeNextPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeNextPath('/home')).toBe('/home');
    expect(sanitizeNextPath('/auth/login')).toBe('/auth/login');
    expect(sanitizeNextPath('/')).toBe('/');
  });

  it('rejects external URLs', () => {
    expect(sanitizeNextPath('https://evil.com/boom')).toBe('/');
    expect(sanitizeNextPath('http://malicious.site')).toBe('/');
    expect(sanitizeNextPath('//evil.com/boom')).toBe('/');
    expect(sanitizeNextPath('javascript:alert(1)')).toBe('/');
    expect(sanitizeNextPath('data:text/html,<script>alert(1)</script>')).toBe('/');
  });

  it('rejects protocol-relative URLs', () => {
    expect(sanitizeNextPath('//external.com/path')).toBe('/');
    expect(sanitizeNextPath('///triple-slash')).toBe('/');
  });

  it('handles null/undefined gracefully', () => {
    expect(sanitizeNextPath(undefined)).toBe('/');
    expect(sanitizeNextPath(null)).toBe('/');
    expect(sanitizeNextPath('')).toBe('/');
  });

  it('handles encoded URLs', () => {
    // Even encoded external URLs should be rejected
    expect(sanitizeNextPath('%2F%2Fevil.com')).toBe('/');
    expect(sanitizeNextPath('https%3A%2F%2Fevil.com')).toBe('/');
  });

  it('preserves query params and fragments on internal paths', () => {
    expect(sanitizeNextPath('/dashboard?tab=overview')).toBe('/dashboard?tab=overview');
    expect(sanitizeNextPath('/docs#section-1')).toBe('/docs#section-1');
    expect(sanitizeNextPath('/search?q=test&page=2')).toBe('/search?q=test&page=2');
  });

  it('handles edge cases', () => {
    expect(sanitizeNextPath(' /dashboard ')).toBe('/'); // Leading space breaks it
    expect(sanitizeNextPath('/ dashboard')).toBe('/ dashboard'); // Space after slash is ok
    expect(sanitizeNextPath('/\x00')).toBe('/\x00'); // Null byte (edge case)
  });
});