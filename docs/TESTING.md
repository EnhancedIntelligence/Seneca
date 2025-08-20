# Testing Guide for Seneca Protocol

## Overview

This guide covers the testing strategy and setup for the Seneca Protocol application.

## Test Structure

```
tests/
├── api/              # API integration tests
│   ├── children.spec.ts
│   ├── memories.spec.ts
│   └── families.spec.ts
├── e2e/              # End-to-end tests
│   ├── auth-redirect.spec.ts
│   ├── memory-capture.spec.ts
│   └── dashboard-flow.spec.ts
└── unit/             # Unit tests
    ├── utils/
    └── components/
```

## Running Tests

### Install Dependencies

```bash
npm install --save-dev vitest @testing-library/react @playwright/test
```

### Unit & Integration Tests

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run e2e tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/auth-redirect.spec.ts
```

## Test Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Playwright Config (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Writing Tests

### API Test Example

```typescript
describe('Children API', () => {
  it('should create a child with proper validation', async () => {
    const response = await fetch('/api/children', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Child',
        family_id: testFamilyId,
        birth_date: '2020-01-01',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toMatchObject({
      name: 'Test Child',
      family_id: testFamilyId,
    });
  });
});
```

### E2E Test Example

```typescript
test('user can create and view a memory', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  // Wait for magic link (in test, mock the auth)
  await page.goto('/auth/callback?code=test-code');
  
  // Navigate to memories
  await page.goto('/memories');
  
  // Create new memory
  await page.click('text=New Memory');
  await page.fill('[name="title"]', 'First Steps');
  await page.fill('[name="content"]', 'Baby took first steps today!');
  await page.click('text=Save Memory');
  
  // Verify memory appears
  await expect(page.locator('text=First Steps')).toBeVisible();
});
```

## Test Data Management

### Setup Test Database

```typescript
// tests/setup.ts
import { createClient } from '@supabase/supabase-js';

const supabaseTest = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_KEY!
);

export async function setupTestFamily() {
  const { data: family } = await supabaseTest
    .from('families')
    .insert({ name: 'Test Family' })
    .select()
    .single();
  
  return family;
}

export async function cleanupTestData(familyId: string) {
  await supabaseTest
    .from('families')
    .delete()
    .eq('id', familyId);
}
```

## Mocking

### Mock Supabase Client

```typescript
// tests/mocks/supabase.ts
export const mockSupabase = {
  auth: {
    getSession: vi.fn(() => ({
      data: {
        session: {
          user: { id: 'test-user-id' },
          access_token: 'test-token',
        },
      },
    })),
    signInWithOtp: vi.fn(() => ({ error: null })),
    signOut: vi.fn(() => ({ error: null })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'test-id' },
          error: null,
        })),
      })),
    })),
  })),
};
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
```

## Best Practices

1. **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
2. **Test Isolation**: Each test should be independent
3. **Mock External Services**: Don't make real API calls in tests
4. **Use Factories**: Create test data factories for consistent test data
5. **Clean Up**: Always clean up test data after tests
6. **Descriptive Names**: Test names should clearly describe what they test
7. **Arrange-Act-Assert**: Follow AAA pattern in test structure
8. **Test User Flows**: E2E tests should mirror real user behavior

## Coverage Goals

- **Unit Tests**: 80% coverage for utilities and hooks
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user paths covered

## Debugging Tests

### Vitest
```bash
# Run specific test file
npm run test -- tests/api/children.spec.ts

# Run tests matching pattern
npm run test -- --grep "soft-delete"

# Debug in VS Code
# Add breakpoint and use "Debug: JavaScript Debug Terminal"
```

### Playwright
```bash
# Debug mode
npx playwright test --debug

# Generate code by recording
npx playwright codegen localhost:3000

# View trace
npx playwright show-trace trace.zip
```

## Common Issues

### Issue: Tests fail with "Cannot find module '@/...'"
**Solution**: Ensure path aliases are configured in both `tsconfig.json` and test config files.

### Issue: E2E tests timeout
**Solution**: Increase timeout in playwright.config.ts or specific test:
```typescript
test.setTimeout(60000); // 60 seconds
```

### Issue: Database connection errors in tests
**Solution**: Ensure test database is running and credentials are correct in `.env.test`.

### Issue: Flaky E2E tests
**Solution**: Add proper wait conditions:
```typescript
await page.waitForSelector('.memory-card');
await expect(page.locator('.spinner')).not.toBeVisible();
```