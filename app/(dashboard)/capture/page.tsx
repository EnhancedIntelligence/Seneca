'use client';

/**
 * Main Capture Screen
 * Primary interface for recording memories
 */

import { useState, useMemo } from 'react';
import { RecordButton } from '@/components/capture/RecordButton';
import { QuickEntry } from '@/components/capture/QuickEntry';
import { ManualEntrySheet } from '@/components/capture/ManualEntrySheet';
import { useCapture, useFamily, useMemoryData } from '@/lib/stores/useAppStore';
import type { UIChild, UITag, Tag, Weather, Mood } from '@/lib/types';

// Helper to convert string array to Tag objects (Tag is alias for UITag)
const toTags = (arr: string[]): Tag[] => arr.map(label => ({ id: label, label }));
import { useApi } from '@/lib/services/mockApi';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, TrendingUp } from 'lucide-react';

export default function CapturePage() {
  const { isRecording, startRecording, stopRecording } = useCapture();
  const { children, activeChildId, switchChild } = useFamily();
  const { addMemory } = useMemoryData();
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const api = useApi();
  const { toast } = useToast();

  const activeChild = children.find(c => c.id === activeChildId);

  const handleRecordEnd = async (duration: number) => {
    if (!activeChild) {
      toast({
        title: 'No child selected',
        description: 'Please select a child first',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Replace with actual voice upload when backend is ready
    try {
      await api.uploadVoiceRecording(duration, activeChild.id);
      toast({
        title: 'Memory saved',
        description: `Voice recording (${duration}s) has been saved`,
      });
    } catch {
      toast({
        title: 'Error saving memory',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleQuickSend = async () => {
    if (!quickText.trim() || !activeChild) return;

    try {
      await addMemory(quickText, 'text', []);
      setQuickText('');
      toast({
        title: 'Memory saved',
        description: 'Your text memory has been saved',
      });
    } catch {
      toast({
        title: 'Error saving memory',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Import the type from ManualEntrySheet to ensure consistency
  type ManualMemoryData = import('@/components/capture/ManualEntrySheet').ManualMemoryData;

  const handleManualSave: (data: ManualMemoryData) => void = (data) => {
    if (!activeChild) return;

    // Convert string tags to UITag objects, filtering valid tags
    const validTags = (data.tags || []).filter(t => 
      ['milestone', 'language', 'cognitive', 'social', 'physical', 
       'emotional', 'creative', 'eating', 'sleep', 'play'].includes(t)
    );
    const tagsUi = toTags(validTags);

    void (async () => {
      try {
        await api.createDetailedMemory({
          childId: activeChild.id,
          content: data.description, // ManualEntrySheet uses 'description'
          type: 'text', // UI uses 'text', API can map to 'manual' category if needed
          tags: tagsUi, // API expects Tag[]
          date: data.date ?? '',          // satisfy string
          time: data.time ?? '',          // satisfy string
          location: data.location,
          weather: (data.weather as Weather) ?? undefined,
          mood: (data.mood as Mood) ?? undefined,
          additionalNotes: data.parentInsight,
        });
        
        setIsManualEntryOpen(false);
        toast({
          title: 'Memory saved',
          description: 'Your detailed memory has been saved',
        });
      } catch {
        toast({
          title: 'Error saving memory',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    })();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Child Selector */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((child) => (
            <Button
              key={child.id}
              variant={child.id === activeChildId ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchChild(child.id)}
              className={`flex items-center gap-2 shrink-0 ${
                child.id === activeChildId
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600'
                  : ''
              }`}
            >
              <span className="text-lg">{child.emoji}</span>
              <span>{child.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Active Child Display */}
        {activeChild && (
          <div className="mb-8 text-center">
            <div className="text-5xl mb-2">{activeChild.emoji}</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Recording for {activeChild.name}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {activeChild.age ? `${activeChild.age.years} years, ${activeChild.age.months} months` : 'Age not set'} old
            </p>
          </div>
        )}

        {/* Record Button */}
        <div className="mb-8">
          <RecordButton
            onRecordStart={startRecording}
            onRecordEnd={handleRecordEnd}
            size="lg"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-violet-400" />
            <div className="text-2xl font-bold">12</div>
            <div className="text-xs text-gray-400">Today</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold">47</div>
            <div className="text-xs text-gray-400">This Week</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold">{children.length}</div>
            <div className="text-xs text-gray-400">Children</div>
          </Card>
        </div>
      </div>

      {/* Bottom Input */}
      <div className="px-4 pb-4">
        <QuickEntry
          value={quickText}
          onChange={setQuickText}
          onSend={handleQuickSend}
          onPlusClick={() => setIsManualEntryOpen(true)}
          placeholder={`What did ${activeChild?.name || 'they'} do today?`}
        />
      </div>

      {/* Manual Entry Sheet */}
      <ManualEntrySheet
        isOpen={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        onSubmit={handleManualSave}
      />
    </div>
  );
}