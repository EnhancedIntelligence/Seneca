# UI Components Specification

This document contains the component specifications and implementation guidelines for the Seneca Protocol Memory Vault App.

## 📊 Component Implementation Status

### ✅ Fully Implemented Components

#### Layout Components (`/components/layout/`)

- ✅ `AppShell.tsx` - Main wrapper with hydration gate pattern
- ✅ `TopBar.tsx` - Header with menu/profile buttons
- ✅ `SideMenu.tsx` - Navigation drawer with sections
- ✅ `ProfileMenu.tsx` - User profile dropdown

#### Capture Components (`/components/capture/`)

- ✅ `RecordButton.tsx` - Hold-to-record button with animations
- ✅ `QuickEntry.tsx` - Text input with plus button
- ✅ `ManualEntrySheet.tsx` - Bottom sheet for detailed entry

#### Dashboard Components (`/components/dashboard/`)

- ✅ `MetricCard.tsx` - Stats display card
- ✅ `ChildCard.tsx` - Child profile card
- ✅ `InsightCard.tsx` - AI insight display
- ✅ `MilestoneTimeline.tsx` - Milestone timeline view

#### Memory Components (`/components/memory/`)

- ✅ `MemoryCard.tsx` - Memory list item
- ✅ `MemoryFeed.tsx` - Memory list container
- ✅ `MemoryCreateForm.tsx` - Memory creation form

#### Shared Components (`/components/memory/shared/`)

- ✅ `ChildSelector.tsx` - Quick child selection
- ✅ `TagSelector.tsx` - Tag selection grid
- ✅ `MediaUpload.tsx` - Media upload interface
- ✅ `LocationPicker.tsx` - Location input

#### UI Components (`/components/ui/`)

- ✅ `BottomSheet.tsx` - Reusable bottom sheet
- ✅ All Shadcn components (Button, Card, Dialog, etc.)

### ⚠️ Partially Implemented Pages

#### Routes Created (`/app/(app)/`)

- ✅ `capture/page.tsx` - Main capture screen (functional)
- ⚠️ `overview/page.tsx` - Dashboard overview (placeholder)
- ⚠️ `memories/page.tsx` - Memories list (placeholder)
- ⚠️ `children/page.tsx` - Children profiles (placeholder)
- ⚠️ `analytics/page.tsx` - Analytics view (placeholder)
- ⚠️ `settings/page.tsx` - Settings page (placeholder)
- ⚠️ `profile/page.tsx` - Profile page (placeholder)

### ❌ Missing/Incomplete Features

#### 1. Analytics Page Components

- ❌ Development charts
- ❌ Milestone progress graphs
- ❌ Activity heatmaps
- ❌ Comparison views
- ❌ Export functionality

#### 2. Settings Page Components

- ❌ Notification preferences
- ❌ Privacy controls
- ❌ Data export options
- ❌ Account management
- ❌ Theme selection

#### 3. Profile Page Components

- ❌ User avatar upload
- ❌ Family member management
- ❌ Subscription status
- ❌ Usage statistics

#### 4. Help & Support Components

- ❌ FAQ accordion
- ❌ Contact support form
- ❌ Tutorial walkthroughs
- ❌ Documentation links

#### 5. Advanced Features

- ❌ Real audio recording (Web Audio API)
- ❌ Voice transcription
- ❌ Photo/video capture
- ❌ Offline sync queue
- ❌ Push notifications

---

## 🎨 Design System

### Color Palette (Tailwind)

```css
Primary Gradient: violet-600 (#8b5cf6) to blue-600 (#3b82f6)
Recording State: red-500 (#ef4444) to red-600 (#dc2626)
Background: black (#000) to zinc-900 (#18181b)
Cards: white/5 (5% opacity white)
Borders: white/10 (10% opacity white)
Text Primary: white (#fff)
Text Secondary: white/60 (60% opacity)
Success: green-500 (#10b981)
Warning: yellow-500 (#eab308)
Error: red-500 (#ef4444)
```

### Spacing System

```css
Mobile Padding: 16px (p-4)
Desktop Padding: 20px (p-5)
Card Gap: 16px (gap-4)
Section Gap: 32px (gap-8)
Card Radius: 12px (rounded-xl)
Button Radius: full (rounded-full)
Input Radius: 8px (rounded-lg)
```

### Typography Scale

```css
Headers: text-2xl font-bold (24px, 700)
Subheaders: text-lg font-semibold (18px, 600)
Body: text-base font-normal (16px, 400)
Small: text-sm (14px)
Tiny: text-xs (12px)
Label: text-xs uppercase tracking-wider
```

### Component Patterns

#### Glass Morphism Card

```css
bg-white/5 backdrop-blur-xl border border-white/10
```

#### Primary Button

```css
bg-gradient-to-r from-violet-600 to-blue-600
hover:shadow-lg hover:shadow-violet-500/25
```

#### Input Field

```css
bg-white/5 border border-white/20
focus:border-violet-500/50 focus:bg-white/10
```

---

## 📱 Mobile-First Considerations

### Touch Targets

- Minimum size: 44x44px
- Spacing between targets: 8px minimum
- Primary actions at thumb reach (bottom)

### Gestures

- Swipe to navigate between children
- Pull to refresh on memory feed
- Long press for context menu
- Pinch to zoom on photos

### Performance

- Lazy load images
- Virtualize long lists
- Debounce search inputs
- Throttle scroll handlers

### Offline Support

- Cache critical UI
- Queue actions when offline
- Show sync status
- Handle conflicts gracefully

---

## 🔌 Integration Points

### 1. Zustand Store (`/lib/stores/useAppStore.ts`)

```typescript
// Navigation state
(currentView, isMenuOpen, navigate());

// Recording state
(isRecording, recordingDuration, startRecording());

// Family state
(children, activeChildId, switchChild());

// Memory state
(memories, addMemory(), deleteMemory());

// Filter state
(searchQuery, selectedTags, dateRange);
```

### 2. Mock Data (`/lib/stores/mockData.ts`)

```typescript
// Sample data structures
(mockChildren, mockMemories, mockMilestones, mockTags);
```

### 3. API Routes (`/app/api/`)

```typescript
// Ready endpoints (mock)
/api/memories - GET, POST
/api/families - GET, POST
/api/analytics/ai-processing - POST
/api/health - GET

// Pending implementation
/api/audio/record - POST
/api/audio/transcribe - POST
/api/media/upload - POST
/api/export - GET
```

---

## 🚀 Implementation Priorities

### Phase 1: Core Functionality (Current)

1. ✅ Fix infinite loop issue
2. ✅ Basic navigation and layout
3. ✅ Capture interface
4. ⬜ Complete dashboard pages
5. ⬜ Settings page

### Phase 2: Enhanced Features (Next)

1. ⬜ Analytics visualizations
2. ⬜ Real audio recording
3. ⬜ Photo/video capture
4. ⬜ Offline support
5. ⬜ Export functionality

### Phase 3: AI & Intelligence

1. ⬜ Voice transcription
2. ⬜ Milestone auto-detection
3. ⬜ Development insights
4. ⬜ Predictive analytics
5. ⬜ Smart recommendations

### Phase 4: Production Ready

1. ⬜ Authentication flow
2. ⬜ Real backend integration
3. ⬜ Push notifications
4. ⬜ Performance optimization
5. ⬜ Security hardening

---

## 📋 Component Templates

### Page Component Template

```tsx
"use client";

import React from "react";
import { useAppStore } from "@/lib/stores/useAppStore";

export default function PageName() {
  // Store selectors
  const { data, actions } = useAppStore();

  return <div className="min-h-screen p-4">{/* Page content */}</div>;
}
```

### Card Component Template

```tsx
interface CardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function Card({ title, value, icon, trend }: CardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
      {/* Card content */}
    </div>
  );
}
```

### Form Component Template

```tsx
interface FormProps {
  onSubmit: (data: FormData) => void;
  initialData?: Partial<FormData>;
}

export function Form({ onSubmit, initialData }: FormProps) {
  const [formData, setFormData] = useState(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

---

## 🧪 Testing Checklist

### Component Testing

- [ ] Renders without errors
- [ ] Handles all props correctly
- [ ] Manages internal state properly
- [ ] Fires callbacks appropriately
- [ ] Handles edge cases
- [ ] Accessible (ARIA, keyboard)
- [ ] Responsive (mobile/desktop)
- [ ] Performance (no unnecessary renders)

### Page Testing

- [ ] Loads data correctly
- [ ] Handles loading states
- [ ] Shows error states
- [ ] Updates on user interaction
- [ ] Navigation works
- [ ] Back button behavior
- [ ] Deep linking support
- [ ] SEO meta tags

### Integration Testing

- [ ] Store updates properly
- [ ] API calls work
- [ ] Optimistic updates
- [ ] Error recovery
- [ ] Offline behavior
- [ ] Sync conflicts
- [ ] Auth flows
- [ ] Data persistence

---

## 📚 Resources

### Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)

### Design References

- [Material Design 3](https://m3.material.io)
- [iOS Human Interface](https://developer.apple.com/design)
- [Tailwind UI](https://tailwindui.com)

### Performance Tools

- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals)

---

_Last Updated: 2025-08-12_
