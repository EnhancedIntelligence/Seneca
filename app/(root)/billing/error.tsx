"use client";

/**
 * Billing Error Boundary
 * Catches errors in the billing route and provides fail-safe UI
 * Includes subscription status checking and accessibility features
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Home,
  LogIn,
  Clipboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthStatus {
  authenticated: boolean;
  active: boolean;
  subscription:
    | null
    | { tier?: string; expiresAt?: string }
    | Record<string, unknown>;
  userId: string | null;
  error?: string;
}

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // A11y: move focus to the title
    headingRef.current?.focus();

    if (process.env.NODE_ENV === "development") {
      console.error("[Billing Error Boundary]:", error);
    }

    // Optional telemetry - only import if Sentry is configured
    // Uncomment when Sentry is installed:
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   import('@sentry/nextjs')
    //     .then((Sentry) => Sentry.captureException(error))
    //     .catch(() => void 0);
    // }
  }, [error]);

  async function refreshAuthStatus() {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/status", { cache: "no-store" });
      const json: AuthStatus = await res.json();
      setStatus(json);

      // If authenticated and active, redirect to home
      if (json.authenticated && json.active) {
        router.push("/home");
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to refresh auth status:", e);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyDevDetails() {
    if (process.env.NODE_ENV !== "development") return;

    const text = `Error: ${error.message}\nDigest: ${error.digest ?? "N/A"}\nTimestamp: ${new Date().toISOString()}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      aria-live="polite"
    >
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
            <CardTitle
              ref={headingRef}
              tabIndex={-1}
              className="outline-none"
              role="alert"
            >
              Billing System Unavailable
            </CardTitle>
          </div>
          <CardDescription>
            The billing page failed to load. Try again or check your
            subscription status below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Neutral guidance (no unverified claims) */}
          <Alert>
            <CreditCard className="h-4 w-4" aria-hidden />
            <AlertDescription>
              If you have an active subscription, you can return to the
              dashboard. Otherwise, you can retry loading this page or contact
              support.
            </AlertDescription>
          </Alert>

          {/* Recovery actions */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={reset}
              className="w-full"
              aria-label="Retry loading this page"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>

            <Link href="/billing" className="w-full">
              <Button
                variant="outline"
                className="w-full"
                aria-label="Go back to billing plans"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Back to Plans
              </Button>
            </Link>

            <Link href="/home" className="w-full">
              <Button
                variant="secondary"
                className="w-full"
                aria-label="Go to home dashboard"
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            <Link href="/login" className="w-full">
              <Button
                variant="ghost"
                className="w-full"
                aria-label="Sign in to your account"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Button>
            </Link>
          </div>

          {/* Live status check */}
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Subscription Status</p>
              <Button
                size="sm"
                onClick={refreshAuthStatus}
                disabled={loading}
                aria-label="Refresh subscription status"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Checking..." : "Check Status"}
              </Button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {status ? (
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Authenticated:{" "}
                    <span className="font-mono">
                      {String(status.authenticated)}
                    </span>
                  </li>
                  <li>
                    Active:{" "}
                    <span className="font-mono">{String(status.active)}</span>
                  </li>
                  <li>
                    User ID:{" "}
                    <span className="font-mono">{status.userId ?? "—"}</span>
                  </li>
                  {status.subscription &&
                    typeof status.subscription === "object" &&
                    "tier" in status.subscription && (
                      <li>
                        Tier:{" "}
                        <span className="font-mono">
                          {String(status.subscription.tier)}
                        </span>
                      </li>
                    )}
                </ul>
              ) : (
                <p>
                  Click "Check Status" to verify your subscription is active.
                </p>
              )}
            </div>
          </div>

          {/* Dev-only diagnostics */}
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-muted p-3 font-mono text-xs">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold">Error Details</p>
                  <p className="mt-1 break-all text-muted-foreground">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="mt-2 text-muted-foreground">
                      Digest: {error.digest}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyDevDetails}
                  aria-label="Copy error details to clipboard"
                  className="ml-2"
                >
                  {copySuccess ? (
                    <>✓ Copied</>
                  ) : (
                    <>
                      <Clipboard className="mr-2 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Support contact */}
          <p className="text-center text-sm text-muted-foreground">
            Need help?{" "}
            <a
              href={`mailto:billing@senecaprotocol.com?subject=Billing%20Error&body=Error%20Digest:%20${encodeURIComponent(
                error.digest ?? "N/A",
              )}%0A%0APlease%20describe%20what%20you%20were%20trying%20to%20do:`}
              className="underline hover:text-foreground"
            >
              Contact billing support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
