// Test setup file for Vitest
import { beforeAll, afterAll } from 'vitest';

// Setup test environment variables
beforeAll(() => {
  // NODE_ENV is already set by the test runner
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  
  // Mock Supabase if not available in test environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  }
});

// Cleanup after all tests
afterAll(() => {
  // Cleanup any test data or connections
});