"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  Mic,
  Brain,
  Users,
  Shield,
  Sparkles,
  Heart,
} from "lucide-react";

export default function Home() {
  // Removed automatic redirect - let users stay on landing page until they explicitly sign in

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-40 w-80 h-80 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute top-0 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-20 w-80 h-80 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
        </div>

        <div className="z-10 max-w-4xl w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl">
              <Heart className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-violet-400 via-blue-400 to-violet-400 bg-clip-text text-transparent animate-gradient">
              Seneca
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300">
              Your Family{`'`}s Memory Vault
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Capture precious moments, track developmental milestones, and let
              AI help you understand your child{`'`}s growth journey.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-lg px-8"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/10 text-lg px-8"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Demo Account Info */}
          <div className="text-sm text-gray-400">
            <p>
              Try with demo account:{" "}
              <code className="text-violet-400">demo@seneca.com</code>
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Designed for Modern Families
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Mic className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold">Voice Recording</h3>
              </div>
              <p className="text-gray-400">
                Simply hold to record. Capture moments in seconds with automatic
                transcription.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold">AI Insights</h3>
              </div>
              <p className="text-gray-400">
                Get intelligent insights about developmental milestones and
                growth patterns.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold">Multi-Child Support</h3>
              </div>
              <p className="text-gray-400">
                Track multiple children with personalized profiles and
                development tracking.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold">Smart Organization</h3>
              </div>
              <p className="text-gray-400">
                Automatic tagging and categorization keeps memories organized
                effortlessly.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold">Privacy First</h3>
              </div>
              <p className="text-gray-400">
                Your family{`'`}s memories are encrypted and secure. You control
                your data.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold">Made with Love</h3>
              </div>
              <p className="text-gray-400">
                Built by parents, for parents. We understand what matters most.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p>
            © 2024 Seneca. A demo application showcasing modern React
            architecture.
          </p>
        </div>
      </footer>
    </main>
  );
}
