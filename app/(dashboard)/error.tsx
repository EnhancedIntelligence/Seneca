'use client';

/**
 * Dashboard Error Boundary
 * Catches errors in the dashboard route group and provides fail-safe UI
 * Prevents white screens and provides recovery options
 */

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dashboard Error Boundary]:', error);
    }
    
    // TODO: Send error to error reporting service in production
    // Example: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An error occurred while loading this page. Don&apos;t worry, your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-muted p-3 font-mono text-xs">
              <p className="font-semibold">Error:</p>
              <p className="mt-1 text-muted-foreground">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-muted-foreground">Digest: {error.digest}</p>
              )}
            </div>
          )}
          
          {/* Recovery actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={reset}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/'}
            >
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Button>
          </div>
          
          {/* Help text */}
          <p className="text-center text-sm text-muted-foreground">
            If this problem persists, please{' '}
            <a
              href="mailto:support@senecaprotocol.com"
              className="underline hover:text-foreground"
            >
              contact support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}