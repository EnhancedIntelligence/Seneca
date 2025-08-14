"use client";

import { useState, useEffect } from "react";
// FamilySetup and FamilySelector components not yet implemented
// import { FamilySetup } from "@/components/family/FamilySetup";
// import { FamilySelector } from "@/components/family/FamilySelector";
import { MemoryCreateForm } from "@/components/memory/MemoryCreateForm";
import { MemoryFeed } from "@/components/memory/MemoryFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  Search,
  Heart,
  Sparkles,
} from "lucide-react";
import type { Family, Child } from "@/lib/types";
import { apiChildToUi } from "@/lib/adapters/api";

interface FetchedFamily extends Family {
  role: string;
  joined_at: string;
  children: Child[];
}

type DashboardView = "setup" | "memories" | "create" | "analytics" | "settings";

export default function DashboardPage() {
  const [families, setFamilies] = useState<FetchedFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FetchedFamily | null>(
    null
  );
  const [currentView, setCurrentView] = useState<DashboardView>("memories");
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  // Load user's families on mount
  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual auth
      const userId = "temp-user-id"; // Get from auth context

      const response = await fetch(`/api/families/create?user_id=${userId}`);

      if (!response.ok) {
        throw new Error("Failed to load families");
      }

      const data = await response.json();
      setFamilies(data.families || []);

      // Auto-select first family if available
      if (data.families && data.families.length > 0) {
        setSelectedFamily(data.families[0]);
        setCurrentView("memories");
      } else {
        setCurrentView("setup");
      }
    } catch (error) {
      console.error("Error loading families:", error);
      toast({
        title: "Error",
        description: "Failed to load family information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  interface FamilyCreateData {
    name: string;
    description?: string;
  }

  const handleFamilyCreated = async (familyData: FamilyCreateData) => {
    try {
      const response = await fetch("/api/families/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(familyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create family");
      }

      const result = await response.json();

      toast({
        title: "Family Created!",
        description: `Welcome to ${result.family.name}! You can now start creating memories.`,
      });

      // Reload families and switch to memories view
      await loadFamilies();
      setCurrentView("memories");
    } catch (error) {
      console.error("Error creating family:", error);
      toast({
        title: "Creation Failed",
        description:
          error instanceof Error ? error.message : "Failed to create family",
        variant: "destructive",
      });
    }
  };

  const handleMemoryCreated = () => {
    setShowCreateForm(false);
    toast({
      title: "Memory Created!",
      description: "Your memory has been saved and is being processed by AI.",
    });
  };

  const handleMemoryClick = (memoryId: string) => {
    // Handle memory detail view
    console.log("Memory clicked:", memoryId);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "setup":
        return "Family Setup";
      case "memories":
        return "Family Memories";
      case "create":
        return "Create Memory";
      case "analytics":
        return "Family Analytics";
      case "settings":
        return "Family Settings";
      default:
        return "Dashboard";
    }
  };

  const getWelcomeMessage = () => {
    if (!selectedFamily) return "Welcome! Let{`'`}s set up your family.";

    const childCount = selectedFamily.children.length;
    const childText = childCount === 1 ? "child" : "children";

    return `Welcome back to ${selectedFamily.name} with ${childCount} ${childText}!`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your families...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Family Selector */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Sparkles className="w-8 h-8 text-purple-600 mr-2" />
                <h1 className="text-xl font-bold text-gray-900">
                  Family Memories
                </h1>
              </div>

              {/* FamilySelector component not yet implemented */}
              {/* {families.length > 0 && (
                <FamilySelector
                  onFamilyChange={(family) =>
                    setSelectedFamily(family as FetchedFamily)
                  }
                />
              )} */}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {selectedFamily && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Memory
                </Button>
              )}

              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {getViewTitle()}
          </h2>
          <p className="text-gray-600 text-lg">{getWelcomeMessage()}</p>
        </div>

        {/* Navigation Tabs */}
        {families.length > 0 && selectedFamily && (
          <div className="mb-8">
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md">
              <button
                onClick={() => setCurrentView("memories")}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "memories"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Heart className="w-4 h-4 mr-2" />
                Memories
              </button>

              <button
                onClick={() => setCurrentView("analytics")}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "analytics"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Insights
              </button>

              <button
                onClick={() => setCurrentView("settings")}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "settings"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {/* Family Setup Flow - Component not yet implemented */}
          {/* {currentView === "setup" && (
            <FamilySetup
              onComplete={handleFamilyCreated}
              onSkip={() => setCurrentView("memories")}
            />
          )} */}

          {/* Memories View */}
          {currentView === "memories" && selectedFamily && (
            <MemoryFeed
              familyId={selectedFamily.id}
              onCreateMemory={() => setShowCreateForm(true)}
              onMemoryClick={handleMemoryClick}
            />
          )}

          {/* Analytics View */}
          {currentView === "analytics" && selectedFamily && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Memory Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    24
                  </div>
                  <p className="text-gray-600">Memories this month</p>
                  <div className="mt-4">
                    <Badge variant="secondary">+12% from last month</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    18
                  </div>
                  <p className="text-gray-600">Milestones detected</p>
                  <div className="mt-4">
                    <Badge variant="secondary">3 new this week</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Family Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {selectedFamily.children.length}
                  </div>
                  <p className="text-gray-600">Children in family</p>
                  <div className="mt-4">
                    <Badge variant="secondary">All profiles complete</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings View */}
          {currentView === "settings" && selectedFamily && (
            <Card>
              <CardHeader>
                <CardTitle>Family Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Family Information
                    </h4>
                    <p className="text-gray-600">Name: {selectedFamily.name}</p>
                    <p className="text-gray-600">Role: {selectedFamily.role}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Children</h4>
                    <div className="space-y-2">
                      {selectedFamily.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{child.name}</p>
                            <p className="text-sm text-gray-600">
                              Born:{" "}
                              {new Date(child.birth_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="outline" className="mr-3">
                      Invite Family Member
                    </Button>
                    <Button variant="outline">Export Data</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Memory Creation Modal */}
      {showCreateForm && selectedFamily && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Create New Memory</h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <MemoryCreateForm
                family={selectedFamily}
                children={(selectedFamily.children || []).map(apiChildToUi)}
                onSuccess={handleMemoryCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
