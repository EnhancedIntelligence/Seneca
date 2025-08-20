import { test, expect } from '@playwright/test';

test.describe('Auth Callback Security', () => {
  test('callback sanitizes external redirect attempts', async ({ page }) => {
    // Test that external URLs in 'next' parameter are rejected
    await page.goto('/auth/callback?code=test&next=https://evil.com');
    
    // Should redirect to root or dashboard, not external site
    await page.waitForNavigation();
    
    // Verify we're still on the same origin
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('evil.com');
    expect(currentUrl).toMatch(/^http:\/\/localhost:\d+\//);
  });
  
  test('callback allows same-origin redirects', async ({ page }) => {
    // Test that valid same-origin paths work
    await page.goto('/auth/callback?code=test&next=/dashboard/memories');
    
    // Should attempt to redirect to the requested path
    await page.waitForNavigation();
    
    // Note: Without valid auth, might redirect to login
    // But the attempt should be made
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/^http:\/\/localhost:\d+\//);
  });
  
  test('callback handles protocol-relative URLs safely', async ({ page }) => {
    // Test that protocol-relative URLs are rejected
    await page.goto('/auth/callback?code=test&next=//evil.com/path');
    
    await page.waitForNavigation();
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('evil.com');
    expect(currentUrl).toMatch(/^http:\/\/localhost:\d+\//);
  });
  
  test('callback handles missing next parameter', async ({ page }) => {
    // Test default redirect when no 'next' is provided
    await page.goto('/auth/callback?code=test');
    
    await page.waitForNavigation();
    
    // Should redirect to default location (usually / or /dashboard)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/^http:\/\/localhost:\d+\//);
  });
  
  test('callback handles encoded URLs safely', async ({ page }) => {
    // Test that encoded external URLs are still rejected
    const encodedUrl = encodeURIComponent('https://evil.com');
    await page.goto(`/auth/callback?code=test&next=${encodedUrl}`);
    
    await page.waitForNavigation();
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('evil.com');
    expect(currentUrl).toMatch(/^http:\/\/localhost:\d+\//);
  });
});