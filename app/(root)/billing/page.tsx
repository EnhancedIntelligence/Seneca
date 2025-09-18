"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { devError } from "@/lib/client-debug";

type PlanTier = "free" | "basic" | "premium";

interface Plan {
  tier: PlanTier;
  name: string;
  price: string;
  priceMonthly: number;
  description: string;
  features: string[];
  recommended?: boolean;
  icon: ReactNode;
  buttonText: string;
  popular?: boolean;
}

// Currency formatter for displaying savings
const formatUSD = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

// Plans configuration with proper typing
const PLANS: readonly Plan[] = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    priceMonthly: 0,
    description: "Get started with basic features",
    features: [
      "Up to 10 memories per month",
      "1 child profile",
      "Basic milestone tracking",
      "Community support",
    ],
    icon: <Zap className="w-5 h-5" />,
    buttonText: "Start Free",
  },
  {
    tier: "basic",
    name: "Basic",
    price: "$9",
    priceMonthly: 9,
    description: "Perfect for growing families",
    features: [
      "Unlimited memories",
      "Up to 3 children",
      "AI-powered insights",
      "Photo & video storage",
      "Export memories",
      "Email support",
    ],
    recommended: true,
    popular: true,
    icon: <Sparkles className="w-5 h-5" />,
    buttonText: "Get Basic",
  },
  {
    tier: "premium",
    name: "Premium",
    price: "$19",
    priceMonthly: 19,
    description: "Advanced features for large families",
    features: [
      "Everything in Basic",
      "Unlimited children",
      "Advanced AI analytics",
      "Family sharing",
      "API access",
      "Priority support",
      "Custom integrations",
    ],
    icon: <Crown className="w-5 h-5" />,
    buttonText: "Go Premium",
  },
];

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const isUpgrade = searchParams.get("upgrade") === "true";
  const redirectTo = searchParams.get("redirect") || "/home";

  async function handleSubscribe(tier: PlanTier) {
    try {
      setLoading(tier);

      // Call the dev-subscribe endpoint
      const headers = new Headers({ "Content-Type": "application/json" });
      const res = await fetch("/api/auth/dev-subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Subscription activated!",
          description:
            tier === "free"
              ? "You are on the free tier. Upgrade anytime for more features."
              : `You now have ${tier} tier access. Redirecting to dashboard...`,
        });

        // Avoid redirect loop for Free tier (no active subscription)
        // Free tier users stay on billing page since they don't have dashboard access
        if (tier === "free") {
          return; // Stay on billing page
        }

        // Only redirect for paid tiers (basic/premium)
        setTimeout(() => {
          router.push(redirectTo);
        }, 500);
      } else {
        throw new Error(data.error || "Subscription failed");
      }
    } catch (error) {
      devError("Subscription error:", error);
      toast({
        title: "Subscription failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            {isUpgrade ? "Upgrade Your Plan" : "Choose Your Plan"}
          </h1>
          <p className="text-gray-400 text-lg">
            Start capturing and preserving your family&apos;s precious moments
          </p>
          {process.env.NODE_ENV === "development" && (
            <Badge variant="secondary" className="mt-4">
              Development Mode: Click any plan to activate
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative bg-gray-900 border-gray-800 ${
                plan.recommended
                  ? "ring-2 ring-blue-500 scale-105 shadow-2xl"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gray-800 rounded-lg">{plan.icon}</div>
                  {plan.tier !== "free" && (
                    <Badge variant="outline" className="text-xs">
                      Save {formatUSD(plan.priceMonthly * 12 * 0.2)}/year
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl text-white">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.tier !== "free" && (
                    <span className="text-gray-400 ml-2">/month</span>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full ${
                    plan.recommended
                      ? "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
                      : ""
                  }`}
                  variant={plan.recommended ? "default" : "outline"}
                  disabled={loading === plan.tier} // Only disable the clicked button
                  onClick={() => handleSubscribe(plan.tier)}
                  aria-busy={loading === plan.tier}
                  aria-label={`Subscribe to ${plan.name} plan`}
                >
                  {loading === plan.tier ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>No credit card required for development mode</p>
          <p className="mt-2">
            Questions? Contact us at{" "}
            <a
              href="mailto:support@seneca.app"
              className="text-blue-400 hover:text-blue-300"
            >
              support@seneca.app
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
