'use client';

/**
 * Children Profiles View
 * Manage and view child profiles
 */

import { useEffect, useState } from 'react';
import type { UIChild } from '@/lib/types';
import { apiChildToUi } from '@/lib/adapters/api';
import { useFamily, useMemoryData } from '@/lib/stores/useAppStore';
import { useApi } from '@/lib/services/mockApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Baby, Calendar, Trophy, BookOpen } from 'lucide-react';
import { formatTimestamp } from '@/lib/stores/mockData';

export default function ChildrenPage() {
  const { children, activeChildId, switchChild } = useFamily();
  const { memories, milestones } = useMemoryData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  interface EditChildData {
    id: string;
    name: string;
    age: number;
    ageUnit: 'years' | 'months';
    emoji: string;
  }
  const [editingChild, setEditingChild] = useState<EditChildData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    ageUnit: 'years' as 'years' | 'months',
    emoji: '👶',
  });
  const api = useApi();
  const { toast } = useToast();

  // Local UI copy so we don't need to reload the page on changes
  const [uiChildren, setUiChildren] = useState<UIChild[]>(children);
  useEffect(() => {
    setUiChildren(children);
  }, [children]);

  const emojiOptions = ['👶', '👧', '👦', '👩', '👨', '🧒', '👼', '🍼'];
  const gradientOptions = [
    'bg-gradient-to-r from-pink-500 to-rose-500',
    'bg-gradient-to-r from-blue-500 to-cyan-500',
    'bg-gradient-to-r from-purple-500 to-indigo-500',
    'bg-gradient-to-r from-green-500 to-emerald-500',
    'bg-gradient-to-r from-yellow-500 to-orange-500',
  ];

  const handleAddChild = async () => {
    if (!formData.name || !formData.age) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: Replace with actual API call when backend is ready
      const newChild = await api.addChild({
        name: formData.name,
        age: parseInt(formData.age),
        ageUnit: formData.ageUnit,
        emoji: formData.emoji,
        theme: {
          gradient: gradientOptions[Math.floor(Math.random() * gradientOptions.length)],
          primary: 'bg-blue-500',
          secondary: 'bg-blue-100',
        },
      });

      toast({
        title: 'Child added',
        description: `${newChild.name} has been added to your family`,
      });

      setIsAddDialogOpen(false);
      setFormData({ name: '', age: '', ageUnit: 'years', emoji: '👶' });
      // Update local UI list - convert API response to UI child
      const uiChild = apiChildToUi(newChild);
      setUiChildren((prev) => [...prev, uiChild]);
    } catch {
      toast({
        title: 'Error adding child',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleEditChild = async () => {
    if (!editingChild) return;

    try {
      // TODO: Replace with actual API call when backend is ready
      await api.updateChild(editingChild.id, {
        name: formData.name,
        age: parseInt(formData.age),
        ageUnit: formData.ageUnit,
        emoji: formData.emoji,
      });

      toast({
        title: 'Child updated',
        description: `${formData.name}'s profile has been updated`,
      });

      setIsEditDialogOpen(false);
      setEditingChild(null);
      // Update local UI list
      setUiChildren((prev) =>
        prev.map((c) => {
          if (c.id !== editingChild.id) return c;
          return {
            ...c,
            name: formData.name,
            emoji: formData.emoji,
            // Keep computed properties as-is since they're computed by adapter
          };
        })
      );
    } catch {
      toast({
        title: 'Error updating child',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteChild = async (childId: string, childName: string) => {
    if (!confirm(`Are you sure you want to remove ${childName}? This will also delete all associated memories and milestones.`)) {
      return;
    }

    try {
      // TODO: Replace with actual API call when backend is ready
      await api.deleteChild(childId);

      toast({
        title: 'Child removed',
        description: `${childName} has been removed from your family`,
      });

      // Update local UI list and adjust active selection if needed
      setUiChildren((prev) => prev.filter((c) => c.id !== childId));
      if (activeChildId === childId && uiChildren.length > 1) {
        const next = uiChildren.find((c) => c.id !== childId);
        if (next) switchChild(next.id);
      }
    } catch {
      toast({
        title: 'Error removing child',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (child: UIChild) => {
    setEditingChild({
      id: child.id,
      name: child.name,
      age: 2,
      ageUnit: 'years',
      emoji: '👶'
    });
    setFormData({
      name: child.name,
      age: '2',
      ageUnit: 'years',
      emoji: '👶',
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Children Profiles
          </h1>
          <p className="text-gray-400 mt-1">Manage your family members</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10">
            <DialogHeader>
              <DialogTitle>Add a New Child</DialogTitle>
              <DialogDescription>
                Add a new family member to start tracking their memories
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter child's name"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="2"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label htmlFor="ageUnit">Unit</Label>
                  <Select
                    value={formData.ageUnit}
                    onValueChange={(value: 'years' | 'months') => 
                      setFormData({ ...formData, ageUnit: value })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="years">Years</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Emoji</Label>
                <div className="flex gap-2 mt-2">
                  {emojiOptions.map((emoji) => (
                    <Button
                      key={emoji}
                      variant={formData.emoji === emoji ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className="text-xl"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddChild}>Add Child</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uiChildren.map((child) => {
          const childMemories = memories.filter(m => m.childId === child.id);
          const childMilestones = milestones.filter(m => m.childId === child.id);
          const recentMemory = childMemories[0];
          
          return (
            <Card 
              key={child.id} 
              className={`bg-white/5 border-white/10 p-6 ${
                child.id === activeChildId ? 'ring-2 ring-violet-500' : ''
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="text-5xl p-3 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500">
                  {child.name.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(child)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteChild(child.id, child.name)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>

              {/* Child Info */}
              <div className="mb-4">
                <h3 className="text-xl font-semibold">{child.name}</h3>
                <p className="text-gray-400">
                  Child profile
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <BookOpen className="w-4 h-4" />
                    Memories
                  </div>
                  <span className="text-sm font-medium">{childMemories.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Trophy className="w-4 h-4" />
                    Milestones
                  </div>
                  <span className="text-sm font-medium">{childMilestones.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    Last Activity
                  </div>
                  <span className="text-sm font-medium">
                    {recentMemory ? formatTimestamp(recentMemory.timestamp) : 'No activity'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={child.id === activeChildId ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => switchChild(child.id)}
                >
                  {child.id === activeChildId ? 'Active' : 'Set Active'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    switchChild(child.id);
                    window.location.href = '/memories';
                  }}
                >
                  View Memories
                </Button>
              </div>
            </Card>
          );
        })}

        {/* Add Child Card */}
        {children.length === 0 && (
          <Card className="bg-white/5 border-white/10 border-dashed p-6 flex flex-col items-center justify-center min-h-[300px]">
            <Baby className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-400 text-center mb-4">
              No children added yet
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Child
            </Button>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle>Edit Child Profile</DialogTitle>
            <DialogDescription>
              Update {editingChild?.name}{`'`}s information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter child's name"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-age">Age</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="2"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label htmlFor="edit-ageUnit">Unit</Label>
                <Select
                  value={formData.ageUnit}
                  onValueChange={(value: 'years' | 'months') => 
                    setFormData({ ...formData, ageUnit: value })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="years">Years</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex gap-2 mt-2">
                {emojiOptions.map((emoji) => (
                  <Button
                    key={emoji}
                    variant={formData.emoji === emoji ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, emoji })}
                    className="text-xl"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditChild}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}