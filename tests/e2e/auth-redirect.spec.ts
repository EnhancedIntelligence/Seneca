/**
 * E2E Test for Authentication Redirects
 * Ensures unauthenticated users are redirected to login
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication Redirects", () => {
  test("should redirect unauthenticated users to login from dashboard routes", async ({
    page,
  }) => {
    // Clear any existing auth cookies/storage
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to visit a protected dashboard route
    await page.goto("/home");

    // Should be redirected to login
    await expect(page).toHaveURL("/login");
  });

  test("should redirect to login from any dashboard sub-route", async ({
    page,
  }) => {
    const protectedRoutes = [
      "/overview",
      "/memories",
      "/children",
      "/analytics",
      "/settings",
      "/profile",
    ];

    for (const route of protectedRoutes) {
      await page.context().clearCookies();
      await page.goto(route);
      await expect(page).toHaveURL("/login");
    }
  });

  test("should allow access to auth routes without authentication", async ({
    page,
  }) => {
    await page.context().clearCookies();

    // Should be able to access login page
    await page.goto("/login");
    await expect(page).toHaveURL("/login");

    // Should see login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("magic link callback should exchange code for session", async ({
    page,
  }) => {
    // Simulate magic link click with code
    const mockCode = "test-auth-code";
    await page.goto(`/auth/callback?code=${mockCode}`);

    // Should show loading message
    await expect(page.locator("text=/Completing sign-in/i")).toBeVisible();

    // Note: In a real test, you'd mock the Supabase auth exchange
    // and verify the redirect to dashboard
  });

  test("callback without code should redirect to login", async ({ page }) => {
    await page.goto("/auth/callback");

    // Should show error message
    await expect(page.locator("text=/Missing code/i")).toBeVisible();

    // Should redirect to login after delay
    await page.waitForURL("/login", { timeout: 2000 });
  });
});
