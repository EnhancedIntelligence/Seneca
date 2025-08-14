/**
 * Mock Data for UI Development
 * SSR-safe with ISO strings and proper type constraints
 * This will be replaced with actual API calls to Supabase
 */

// Import types from central location
import type { 
  MemoryType, 
  MilestoneCategory, 
  Tag,
  TagLabel, 
  AgeUnit, 
  Weather, 
  Mood 
} from '@/lib/types';

// Re-export for backward compatibility
export type { 
  MemoryType, 
  MilestoneCategory, 
  Tag,
  TagLabel, 
  AgeUnit, 
  Weather, 
  Mood 
} from '@/lib/types';

// ===== Helper Functions =====
const hoursAgo = (hours: number): string => 
  new Date(Date.now() - hours * 3600_000).toISOString();

const daysAgo = (days: number): string => 
  new Date(Date.now() - days * 86_400_000).toISOString();

// ===== Core Interfaces (Backend-Ready) =====
export interface Child {
  id: string;
  name: string;
  age: number;
  ageUnit: AgeUnit;
  theme: {
    gradient: string;    // Tailwind gradient classes
    primary: string;     // Primary color for badges/chips
    secondary: string;   // Secondary color for accents
  };
  emoji: string;
}

export interface Memory {
  id: string;
  childId: string;
  content: string;
  type: MemoryType;
  tags: Tag[];
  timestamp: string;   // ISO 8601 for SSR/API compatibility
  emoji?: string;
  // Future fields ready:
  mediaUrl?: string;
  transcription?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  location?: string;
  weather?: Weather;
  mood?: Mood;
}

export interface Milestone {
  id: string;
  childId: string;
  title: string;
  description: string;
  achievedAt: string;  // ISO 8601
  category: MilestoneCategory;
  verifiedBy?: 'ai' | 'parent' | 'both';
}

export interface DetailedMemory extends Memory {
  // Extended fields for manual entry form
  date: string;
  time: string;
  location?: string;
  weather?: Weather;
  mood?: Mood;
  additionalNotes?: string;
  peoplePresent?: string[];
}

// ===== Option Lists (Locked with const assertions) =====
export const tagOptions = [
  { label: '🎯 Milestone', value: 'milestone' },
  { label: '💬 Language', value: 'language' },
  { label: '🧩 Cognitive', value: 'cognitive' },
  { label: '🤝 Social', value: 'social' },
  { label: '🏃 Physical', value: 'physical' },
  { label: '😊 Emotional', value: 'emotional' },
  { label: '🎨 Creative', value: 'creative' },
  { label: '🍽️ Eating', value: 'eating' },
  { label: '😴 Sleep', value: 'sleep' },
  { label: '🎮 Play', value: 'play' },
] satisfies ReadonlyArray<{ label: string; value: TagLabel }>;

export const weatherOptions = [
  { label: '☀️ Sunny', value: 'sunny' },
  { label: '☁️ Cloudy', value: 'cloudy' },
  { label: '🌧️ Rainy', value: 'rainy' },
  { label: '❄️ Snowy', value: 'snowy' },
  { label: '🌤️ Partly Cloudy', value: 'partly-cloudy' },
] as const satisfies ReadonlyArray<{ label: string; value: Weather }>;

export const moodOptions = [
  { label: '😊 Happy', value: 'happy' },
  { label: '😴 Tired', value: 'tired' },
  { label: '😢 Upset', value: 'upset' },
  { label: '🤗 Excited', value: 'excited' },
  { label: '😌 Calm', value: 'calm' },
] as const satisfies ReadonlyArray<{ label: string; value: Mood }>;

// ===== Mock Data =====
export const mockChildren: Child[] = [
  {
    id: 'child-1',
    name: 'Emma',
    age: 2,
    ageUnit: 'years',
    theme: {
      gradient: 'bg-gradient-to-r from-pink-500 to-rose-500',
      primary: 'bg-pink-500',
      secondary: 'bg-pink-100'
    },
    emoji: '👧',
  },
  {
    id: 'child-2',
    name: 'Lucas',
    age: 11,
    ageUnit: 'months',
    theme: {
      gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      primary: 'bg-blue-500',
      secondary: 'bg-blue-100'
    },
    emoji: '👦',
  },
];

export const mockMemories: Memory[] = [
  {
    id: 'mem-1',
    childId: 'child-1',
    content: 'First steps in the living room!',
    type: 'voice',
    tags: [
      { id: 'milestone', label: 'milestone' },
      { id: 'physical', label: 'physical' }
    ],
    timestamp: hoursAgo(2),
    emoji: '👣',
  },
  {
    id: 'mem-2',
    childId: 'child-2',
    content: 'Said "mama" clearly at dinner',
    type: 'text',
    tags: [
      { id: 'language', label: 'language' },
      { id: 'milestone', label: 'milestone' }
    ],
    timestamp: daysAgo(1),
    emoji: '🗣️',
  },
  {
    id: 'mem-3',
    childId: 'child-1',
    content: 'Playing with blocks, built a tall tower',
    type: 'manual',
    tags: [
      { id: 'cognitive', label: 'cognitive' },
      { id: 'play', label: 'play' },
      { id: 'creative', label: 'creative' }
    ],
    timestamp: daysAgo(2),
    emoji: '🧩',
  },
  {
    id: 'mem-4',
    childId: 'child-2',
    content: 'Rolled over from back to tummy',
    type: 'voice',
    tags: [
      { id: 'physical', label: 'physical' },
      { id: 'milestone', label: 'milestone' }
    ],
    timestamp: daysAgo(3),
    emoji: '🔄',
  },
  {
    id: 'mem-5',
    childId: 'child-1',
    content: 'Shared toys with friend at playdate',
    type: 'text',
    tags: [
      { id: 'social', label: 'social' },
      { id: 'emotional', label: 'emotional' }
    ],
    timestamp: daysAgo(5),
    emoji: '🤝',
  },
];

export const mockMilestones: Milestone[] = [
  {
    id: 'milestone-1',
    childId: 'child-1',
    title: 'First Steps',
    description: 'Took first independent steps across the living room',
    achievedAt: hoursAgo(2),
    category: 'physical',
    verifiedBy: 'parent',
  },
  {
    id: 'milestone-2',
    childId: 'child-2',
    title: 'First Word',
    description: 'Said "mama" clearly and intentionally',
    achievedAt: daysAgo(1),
    category: 'language',
    verifiedBy: 'parent',
  },
];

// ===== Utility Functions =====
export const getChildById = (id: string): Child | undefined => 
  mockChildren.find(child => child.id === id);

export const getMemoriesForChild = (childId: string): Memory[] =>
  mockMemories.filter(memory => memory.childId === childId);

export const getMilestonesForChild = (childId: string): Milestone[] =>
  mockMilestones.filter(milestone => milestone.childId === childId);

export const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

// ===== Analytics Mock Data =====
export const mockAnalytics = {
  totalMemories: 247,
  totalMilestones: 34,
  activeChildren: 2,
  processingHealth: 99.7,
  lastWeekGrowth: {
    memories: 12,
    milestones: 8,
  },
  monthlyUsage: {
    cost: 47.82,
    tokens: 68000,
    processingTime: 1.2,
    errorRate: 0.3,
  }
};

// ===== Recent Insights (AI Generated) =====
export const mockInsights = [
  {
    id: 'insight-1',
    type: 'milestone',
    severity: 'info',
    title: 'Developmental Milestone Alert',
    description: 'Emma shows consistent progress in gross motor skills. Consider documenting balance activities.',
    childId: 'child-1',
    timestamp: hoursAgo(4),
  },
  {
    id: 'insight-2',
    type: 'pattern',
    severity: 'success',
    title: 'Language Pattern Detected',
    description: 'Lucas has increased vocabulary by 40% this month. Peak learning: 10-11 AM.',
    childId: 'child-2',
    timestamp: daysAgo(1),
  },
  {
    id: 'insight-3',
    type: 'suggestion',
    severity: 'warning',
    title: 'Memory Suggestion',
    description: "It's been 5 days since last social interaction memory. Consider capturing playtime moments.",
    childId: null,
    timestamp: daysAgo(2),
  },
];