"use client";

import { useState, useCallback } from "react";
import { devLog } from "@/lib/client-debug";
import { MemoryCreateForm } from "@/components/memory/MemoryCreateForm";
import { MemoryFeed } from "@/components/memory/MemoryFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  BarChart3,
  Settings,
  Bell,
  Heart,
  Sparkles,
} from "lucide-react";
import type { Family, Child } from "@/lib/types";
import { apiChildToUi } from "@/lib/adapters/api";

interface FetchedFamily extends Family {
  role: string;
  joined_at: string;
  children?: Child[];
}

type DashboardView = "setup" | "memories" | "create" | "analytics" | "settings";

interface HomeClientProps {
  families: FetchedFamily[];
}

export default function HomeClient({ families }: HomeClientProps) {
  const [selectedFamily, setSelectedFamily] = useState<FetchedFamily | null>(
    () => families[0] ?? null,
  );
  const [currentView, setCurrentView] = useState<DashboardView>(() =>
    families.length > 0 ? "memories" : "setup",
  );
  const { toast } = useToast();

  // Handle navigation between views
  const handleViewChange = useCallback((view: DashboardView) => {
    setCurrentView(view);
  }, []);

  const handleFamilySwitch = useCallback((family: FetchedFamily) => {
    setSelectedFamily(family);
    // Potentially reload data for new family
  }, []);

  if (families.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Welcome to Seneca Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Start capturing your family&apos;s precious memories. Create
                your first family to get started.
              </p>
              <Button
                onClick={() => handleViewChange("setup")}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Your First Family
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Family Dashboard</h1>
              {families.length > 1 && (
                <select
                  value={selectedFamily?.id || ""}
                  onChange={(e) => {
                    const family = families.find(
                      (f) => f.id === e.target.value,
                    );
                    if (family) handleFamilySwitch(family);
                  }}
                  className="px-3 py-1 border rounded-md"
                >
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-6">
            <button
              onClick={() => handleViewChange("memories")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                currentView === "memories"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Memories
              </div>
            </button>
            <button
              onClick={() => handleViewChange("create")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                currentView === "create"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Memory
              </div>
            </button>
            <button
              onClick={() => handleViewChange("analytics")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                currentView === "analytics"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => handleViewChange("settings")}
              className={`py-3 px-1 border-b-2 transition-colors ${
                currentView === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {currentView === "memories" && selectedFamily && (
          <MemoryFeed
            familyId={selectedFamily.id}
            onCreateMemory={() => handleViewChange("create")}
            onMemoryClick={(memoryId) => {
              devLog("Memory clicked:", memoryId);
            }}
          />
        )}

        {currentView === "create" && selectedFamily && (
          <MemoryCreateForm
            family={selectedFamily}
            childProfiles={(selectedFamily.children || []).map(apiChildToUi)}
            onSuccess={() => {
              toast({
                title: "Memory Created",
                description: "Your memory has been successfully saved.",
              });
              handleViewChange("memories");
            }}
            onCancel={() => handleViewChange("memories")}
          />
        )}

        {currentView === "analytics" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Memories
                </CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Analytics coming soon
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Milestones
                </CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  AI detected milestones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Family Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedFamily?.children?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active children profiles
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === "settings" && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Family Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Family Name</h3>
                  <p className="text-muted-foreground">
                    {selectedFamily?.name}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Your Role</h3>
                  <Badge>{selectedFamily?.role || "admin"}</Badge>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Member Since</h3>
                  <p className="text-muted-foreground">
                    {selectedFamily?.joined_at
                      ? new Date(selectedFamily.joined_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
