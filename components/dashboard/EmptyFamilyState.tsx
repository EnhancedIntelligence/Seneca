"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * EmptyFamilyState Component
 *
 * Displayed when a user has no families yet.
 * Provides a friendly welcome message and CTA to create their first family.
 *
 * Features:
 * - Accessible icons with aria-hidden
 * - Theme-aware styling using design tokens
 * - Link semantics for navigation
 * - Responsive layout
 *
 * @component
 * @example
 * ```tsx
 * // In overview/page.tsx
 * if (!families || families.length === 0) {
 *   return <EmptyFamilyState />;
 * }
 * ```
 */
export function EmptyFamilyState() {
  const router = useRouter();

  // Prefetch the onboarding route for better performance
  useEffect(() => {
    router.prefetch("/onboarding?step=family");
  }, [router]);

  return (
    <div
      className="grid place-items-center py-12 sm:py-16 min-h-[60vh] sm:min-h-[70vh] px-4"
      data-testid="empty-family-state"
    >
      <Card className="max-w-2xl w-full bg-card text-card-foreground border-border">
        <CardContent className="p-10 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-violet-600/20 to-blue-600/20 flex items-center justify-center">
            <Users
              className="w-10 h-10 text-violet-400"
              aria-hidden="true"
              focusable="false"
            />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Create your first family
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start capturing precious memories and milestones. Set up your family profile to begin your journey.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid gap-4 sm:grid-cols-3 text-left max-w-lg mx-auto">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Heart
                  className="w-5 h-5 text-blue-400"
                  aria-hidden="true"
                  focusable="false"
                />
              </div>
              <p className="text-sm text-muted-foreground">Capture memories</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <Sparkles
                  className="w-5 h-5 text-violet-400"
                  aria-hidden="true"
                  focusable="false"
                />
              </div>
              <p className="text-sm text-muted-foreground">AI insights</p>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                <Users
                  className="w-5 h-5 text-emerald-400"
                  aria-hidden="true"
                  focusable="false"
                />
              </div>
              <p className="text-sm text-muted-foreground">Share with loved ones</p>
            </div>
          </div>

          {/* CTA Button with Link semantics */}
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
            data-testid="cta-create-family"
          >
            <Link href="/onboarding?step=family">
              <Plus
                className="w-5 h-5 mr-2"
                aria-hidden="true"
                focusable="false"
              />
              Create Family
            </Link>
          </Button>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Takes less than a minute to set up
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmptyFamilyState;