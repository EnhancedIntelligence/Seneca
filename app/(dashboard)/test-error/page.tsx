'use client';

/**
 * Test Page for Error Boundary
 * Simulates various error scenarios to test error boundaries
 * DEVELOPMENT ONLY - Remove in production
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Database, Server, Zap } from 'lucide-react';

export default function TestErrorPage() {
  const [errorType, setErrorType] = useState<string>('');

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">This page is only available in development mode.</p>
      </div>
    );
  }

  const triggerError = (type: string) => {
    setErrorType(type);
    
    switch (type) {
      case 'db':
        throw new Error('Database connection failed: ECONNREFUSED');
      
      case 'auth':
        throw new Error('Authentication failed: Invalid session token');
      
      case 'subscription':
        throw new Error('Subscription check failed: Member record not found');
      
      case 'generic':
        throw new Error('An unexpected error occurred in the dashboard');
      
      case 'async':
        // Simulate async error
        setTimeout(() => {
          throw new Error('Async operation failed after delay');
        }, 100);
        break;
      
      default:
        throw new Error('Unknown error type');
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            Error Boundary Test Page
          </CardTitle>
          <CardDescription>
            Development only - Click buttons below to simulate various error scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">⚠️ Warning</p>
            <p className="mt-1 text-amber-700">
              Clicking these buttons will trigger real errors and activate the error boundary.
              The page will be replaced with the error UI.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="destructive"
              onClick={() => triggerError('db')}
              className="justify-start"
            >
              <Database className="mr-2 h-4 w-4" />
              Simulate DB Error
            </Button>

            <Button
              variant="destructive"
              onClick={() => triggerError('auth')}
              className="justify-start"
            >
              <Server className="mr-2 h-4 w-4" />
              Simulate Auth Error
            </Button>

            <Button
              variant="destructive"
              onClick={() => triggerError('subscription')}
              className="justify-start"
            >
              <Zap className="mr-2 h-4 w-4" />
              Simulate Subscription Error
            </Button>

            <Button
              variant="destructive"
              onClick={() => triggerError('generic')}
              className="justify-start"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Simulate Generic Error
            </Button>
          </div>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>Expected behavior after clicking a button:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>The error boundary should catch the error</li>
              <li>You should see the fail-safe error UI</li>
              <li>Error details should appear in dev mode</li>
              <li>"Try again" button should reload this page</li>
              <li>Console should show error logs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}