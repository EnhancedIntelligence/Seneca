"use client";

/**
 * Settings Page
 * User preferences and app configuration
 */

import { useState } from "react";
import { useAuthContext } from "@/lib/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  CreditCard,
  LogOut,
  Save,
  AlertCircle,
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout, updateProfile } = useAuthContext();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    emailDigest: "weekly",
    autoBackup: true,
    theme: "dark",
    language: "en",
    timezone: "America/New_York",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      const result = await updateProfile({ name: profileData.name });

      if (result.success) {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully",
        });
      }
    } catch {
      toast({
        title: "Error updating profile",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = () => {
    // TODO: Save preferences to backend when ready
    toast({
      title: "Preferences saved",
      description: "Your preferences have been updated",
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-violet-400" />
          <h2 className="text-xl font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) =>
                setProfileData({ ...profileData, name: e.target.value })
              }
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              disabled
              className="bg-white/5 border-white/10 opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed
            </p>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={isLoading}
            className="bg-gradient-to-r from-violet-600 to-blue-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Push Notifications</Label>
              <p className="text-sm text-gray-400">
                Receive alerts for new milestones
              </p>
            </div>
            <Switch
              id="notifications"
              checked={preferences.notifications}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, notifications: checked })
              }
            />
          </div>
          <Separator className="bg-white/10" />
          <div>
            <Label htmlFor="digest">Email Digest</Label>
            <Select
              value={preferences.emailDigest}
              onValueChange={(value) =>
                setPreferences({ ...preferences, emailDigest: value })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Privacy & Security */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold">Privacy & Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="backup">Auto Backup</Label>
              <p className="text-sm text-gray-400">
                Automatically backup your data
              </p>
            </div>
            <Switch
              id="backup"
              checked={preferences.autoBackup}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, autoBackup: checked })
              }
            />
          </div>
          <Separator className="bg-white/10" />
          <div>
            <Button variant="outline" className="bg-white/5 border-white/10">
              <Database className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={preferences.theme}
              onValueChange={(value) =>
                setPreferences({ ...preferences, theme: value })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <Select
              value={preferences.language}
              onValueChange={(value) =>
                setPreferences({ ...preferences, language: value })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-semibold">Subscription</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-violet-600/20 to-blue-600/20 rounded-lg border border-violet-500/30">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Free Plan</span>
              <span className="text-sm text-gray-400">Current Plan</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              100 memories per month • 2 children • Basic AI insights
            </p>
            <Button className="w-full bg-gradient-to-r from-violet-600 to-blue-600">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </Card>

      {/* Save Preferences */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={handleSavePreferences}
          className="bg-white/5 border-white/10"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Preferences
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="bg-red-500/5 border-red-500/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Once you log out, you{`'`}ll need to sign in again to access your
            memories.
          </p>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
