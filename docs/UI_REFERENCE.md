# UI Reference - Memory Vault App

This document contains the complete UI implementation that needs to be broken down into components.

## Implementation Status

### ✅ Created Structure

- `/app/(app)/` - Main app routes
  - `layout.tsx` - App layout wrapper
  - `capture/page.tsx` - Main capture screen
  - `overview/page.tsx` - Dashboard overview
  - `memories/page.tsx` - Memories list
  - `children/page.tsx` - Children profiles

### 🔧 Components to Build

#### 1. Layout Components (`/components/layout/`)

- `AppShell.tsx` - Main wrapper with navigation state
- `TopBar.tsx` - Header with menu/profile buttons
- `SideMenu.tsx` - Navigation drawer
- `ProfileMenu.tsx` - User profile dropdown

#### 2. Capture Components (`/components/capture/`)

- `RecordButton.tsx` - Hold-to-record button
- `QuickEntry.tsx` - Text input with plus button
- `ManualEntrySheet.tsx` - Bottom sheet for detailed entry
- `ChildSwitcher.tsx` - Quick child selection

#### 3. Dashboard Components (`/components/dashboard/`)

- `MetricCard.tsx` - Stats display card
- `MemoryCard.tsx` - Memory list item
- `ChildCard.tsx` - Child profile card
- `InsightCard.tsx` - AI insight display
- `MilestoneTimeline.tsx` - Milestone timeline view

#### 4. Shared Components (`/components/ui/`)

- Already have Shadcn components
- Need to add custom components:
  - `BottomSheet.tsx` - Reusable bottom sheet
  - `TagSelector.tsx` - Tag selection grid

### 📝 Key Features to Implement

1. **Recording Flow**
   - Hold-to-record interaction
   - Visual feedback (pulse animation)
   - Timer display
   - Auto-save on release

2. **Navigation**
   - Side menu with sections
   - Active state indication
   - Smooth transitions
   - Mobile-optimized

3. **Manual Entry**
   - Multi-step form
   - Child selection
   - Date/time picker
   - Tag selection
   - Weather/mood context
   - Location input

4. **Dashboard Views**
   - Overview metrics
   - Memory timeline
   - Child profiles
   - Milestones tracking
   - Analytics
   - AI insights
   - Settings
   - Help & support

### 🎨 Design System

#### Colors (Tailwind)

```css
Primary: violet-600 (#8b5cf6) to blue-600 (#3b82f6)
Recording: red-500 (#ef4444) to red-600 (#dc2626)
Background: Black (#000) to zinc-900
Cards: white/5 opacity
Borders: white/10 opacity
```

#### Spacing

- Mobile padding: 16px (p-4)
- Desktop padding: 20px (p-5)
- Card radius: 12px (rounded-xl)
- Button radius: full (rounded-full)

#### Typography

- Headers: text-2xl font-semibold
- Subheaders: text-lg font-medium
- Body: text-base
- Small: text-sm
- Tiny: text-xs

### 🔌 Integration Points

1. **Zustand Store** (`/lib/stores/useAppStore.ts`)
   - Navigation state
   - Recording state
   - Memory operations
   - Child management

2. **Mock Data** (`/lib/stores/mockData.ts`)
   - Children profiles
   - Memory samples
   - Milestones
   - Tags/categories

3. **Future Backend Integration**
   - Replace mock data with API calls
   - Add real recording functionality
   - Connect to Supabase
   - Implement AI processing

### 📱 Mobile-First Considerations

- Bottom navigation for thumb reach
- Large touch targets (min 44px)
- Swipe gestures for navigation
- One-handed operation
- Offline capability

### 🚀 Next Steps

1. Build `AppShell` with navigation
2. Create `RecordButton` component
3. Implement `QuickEntry` input
4. Add `SideMenu` navigation
5. Build `ManualEntrySheet`
6. Create dashboard views
7. Style with Tailwind
8. Test mobile responsiveness
9. Add animations
10. Prepare for backend integration

## Component Templates

### RecordButton Component Structure

```tsx
interface RecordButtonProps {
  onRecordStart?: () => void;
  onRecordEnd?: (duration: number) => void;
}

// Features:
- Touch/mouse events
- Visual states (idle, recording, success)
- Timer display
- Haptic feedback
- Animation (pulse when recording)
```

### QuickEntry Component Structure

```tsx
interface QuickEntryProps {
  onSend: (text: string) => void;
  onPlusClick: () => void;
}

// Features:
- Text input
- Plus button for manual entry
- Send button
- Keyboard handling
- Clear on send
```

### SideMenu Component Structure

```tsx
interface SideMenuProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

// Sections:
- Main (Capture, Overview, Memories)
- Family (Children, Milestones)
- Intelligence (Analytics, AI Insights)
- Settings (Settings, Help)
```

## Notes for Implementation

1. **Use existing Shadcn components** where possible
2. **Keep components pure** - no direct API calls
3. **Use Zustand** for all state management
4. **Mobile-first** responsive design
5. **Accessibility** - ARIA labels, keyboard navigation
6. **Performance** - Lazy load dashboard views
7. **Type safety** - Use TypeScript interfaces
8. **Error boundaries** - Wrap recording components
9. **Loading states** - Skeleton screens
10. **Empty states** - Helpful messages

---

## Full Original Code Reference

The complete monolithic component code has been analyzed and should be broken down according to the structure above. Each component should:

1. Use Tailwind classes instead of inline styles
2. Connect to Zustand store instead of local state
3. Use mock data from `/lib/stores/mockData.ts`
4. Be fully typed with TypeScript
5. Handle loading and error states
6. Be mobile-responsive
7. Follow the design system defined above

Complete React Code for UI
import React, { useState, useEffect, useRef } from 'react';

interface MemoryData {
id: number;
child: string;
title: string;
date: string;
category: string;
tags?: string[];
confidence?: number;
}

interface ChildData {
id: number;
name: string;
age: string;
avatar: string;
totalMemories: number;
milestones: number;
lastEntry: string;
developmentScore: number;
}

interface MilestoneData {
id: number;
child: string;
title: string;
date: string;
category: string;
aiConfidence: number;
verified: boolean;
}

const MemoryVaultApp: React.FC = () => {
const [isRecording, setIsRecording] = useState(false);
const [recordingTime, setRecordingTime] = useState(0);
const [currentView, setCurrentView] = useState<string>('capture');
const [sideMenuOpen, setSideMenuOpen] = useState(false);
const [profileMenuOpen, setProfileMenuOpen] = useState(false);
const [manualPanelOpen, setManualPanelOpen] = useState(false);
const [memoryInput, setMemoryInput] = useState('');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [selectedChild, setSelectedChild] = useState<string>('Emma');
const [notificationsEnabled, setNotificationsEnabled] = useState(true);
const [autoDetection, setAutoDetection] = useState(true);
const [weeklyReports, setWeeklyReports] = useState(true);

const recordingInterval = useRef<NodeJS.Timeout | null>(null);

// Handle recording timer
useEffect(() => {
if (isRecording) {
recordingInterval.current = setInterval(() => {
setRecordingTime(prev => prev + 1);
}, 1000);
} else {
if (recordingInterval.current) {
clearInterval(recordingInterval.current);
}
setRecordingTime(0);
}

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };

}, [isRecording]);

const formatTime = (seconds: number): string => {
const mins = Math.floor(seconds / 60);
const secs = seconds % 60;
return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const startRecording = () => {
setIsRecording(true);
if (navigator.vibrate) {
navigator.vibrate(50);
}
};

const stopRecording = () => {
setIsRecording(false);
};

const navigateTo = (view: string) => {
setCurrentView(view);
setSideMenuOpen(false);
};

const toggleTag = (tag: string) => {
setSelectedTags(prev =>
prev.includes(tag)
? prev.filter(t => t !== tag)
: [...prev, tag]
);
};

const sendMemory = () => {
if (memoryInput.trim()) {
setMemoryInput('');
// Show success message
}
};

// Sample data
const memories: MemoryData[] = [
{ id: 1, child: 'Emma', title: 'First steps!', date: 'Today at 2:30 PM', category: 'milestone', tags: ['milestone', 'physical'], confidence: 96 },
{ id: 2, child: 'Lucas', title: 'Said "mama" clearly', date: 'Yesterday', category: 'language', tags: ['language'], confidence: 88 },
{ id: 3, child: 'Emma', title: 'Playing with blocks', date: '2 days ago', category: 'cognitive', tags: ['cognitive'], confidence: 72 },
{ id: 4, child: 'Lucas', title: 'Shared toy with friend', date: '3 days ago', category: 'social', tags: ['social', 'emotional'], confidence: 85 },
{ id: 5, child: 'Emma', title: 'Drew first circle', date: '4 days ago', category: 'creative', tags: ['creative', 'cognitive'], confidence: 91 },
];

const children: ChildData[] = [
{ id: 1, name: 'Emma', age: '2 years 3 months', avatar: '👧', totalMemories: 142, milestones: 18, lastEntry: '2 hours ago', developmentScore: 94 },
{ id: 2, name: 'Lucas', age: '11 months', avatar: '👦', totalMemories: 105, milestones: 16, lastEntry: 'Yesterday', developmentScore: 88 },
];

const milestones: MilestoneData[] = [
{ id: 1, child: 'Emma', title: 'First steps without support', date: '2025-01-28', category: 'Physical', aiConfidence: 96, verified: true },
{ id: 2, child: 'Lucas', title: 'First word: "mama"', date: '2025-01-27', category: 'Language', aiConfidence: 88, verified: true },
{ id: 3, child: 'Emma', title: 'Counted to 10', date: '2025-01-25', category: 'Cognitive', aiConfidence: 92, verified: false },
{ id: 4, child: 'Lucas', title: 'Clapped hands', date: '2025-01-20', category: 'Physical', aiConfidence: 94, verified: true },
{ id: 5, child: 'Emma', title: 'Used spoon independently', date: '2025-01-18', category: 'Self-care', aiConfidence: 89, verified: true },
];

const tags = [
{ icon: '🎯', label: 'Milestone' },
{ icon: '💬', label: 'Language' },
{ icon: '🧩', label: 'Cognitive' },
{ icon: '🤝', label: 'Social' },
{ icon: '🏃', label: 'Physical' },
{ icon: '😊', label: 'Emotional' },
{ icon: '🎨', label: 'Creative' },
{ icon: '🍽️', label: 'Eating' },
{ icon: '😴', label: 'Sleep' },
];

const insights = [
{ type: 'prediction', icon: '🔮', title: 'Next Milestone Prediction', content: 'Based on Emma\'s progress, she\'s likely to start jumping with both feet within 2-3 weeks.' },
{ type: 'pattern', icon: '📈', title: 'Learning Pattern Detected', content: 'Lucas shows peak cognitive activity between 9-11 AM. Best time for introducing new concepts.' },
{ type: 'recommendation', icon: '💡', title: 'Activity Suggestion', content: 'Emma hasn\'t had outdoor play memories in 5 days. Consider park activities for gross motor development.' },
{ type: 'comparison', icon: '📊', title: 'Peer Comparison', content: 'Lucas is in the 85th percentile for language development among 11-month-olds.' },
];

const faqs = [
{ q: 'How does AI milestone detection work?', a: 'Our AI analyzes your memories using advanced language processing to identify developmental milestones with confidence scores.' },
{ q: 'Is my family data private?', a: 'Yes, all data is encrypted and never shared. You control who has access to your family memories.' },
{ q: 'Can I export my memories?', a: 'Yes, you can export all memories as PDF or JSON format from the Settings page.' },
{ q: 'How accurate is the AI?', a: 'Our AI has 94% accuracy for common milestones, always verified by pediatric development standards.' },
];

const styles = {
container: {
fontFamily: 'system-ui, -apple-system, sans-serif',
background: '#000',
color: '#fff',
height: '100vh',
overflow: 'hidden',
position: 'relative' as const,
},
captureScreen: {
height: '100vh',
display: currentView === 'capture' ? 'flex' : 'none',
flexDirection: 'column' as const,
position: 'relative' as const,
background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
},
topNav: {
position: 'absolute' as const,
top: 0,
left: 0,
right: 0,
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
padding: '20px',
zIndex: 100,
},
menuBtn: {
width: '40px',
height: '40px',
background: 'rgba(255, 255, 255, 0.1)',
border: '1px solid rgba(255, 255, 255, 0.2)',
borderRadius: '50%',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
cursor: 'pointer',
transition: 'all 0.3s',
},
recordContainer: {
flex: 1,
display: 'flex',
flexDirection: 'column' as const,
alignItems: 'center',
justifyContent: 'center',
padding: '20px',
},
recordBtn: {
width: '180px',
height: '180px',
borderRadius: '50%',
background: isRecording
? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
border: '4px solid rgba(255, 255, 255, 0.3)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
cursor: 'pointer',
transition: 'all 0.3s',
boxShadow: isRecording
? '0 0 60px rgba(239, 68, 68, 0.6)'
: '0 0 40px rgba(139, 92, 246, 0.5)',
animation: isRecording ? 'pulse 1.5s infinite' : 'none',
},
recordIcon: {
width: isRecording ? '40px' : '60px',
height: isRecording ? '40px' : '60px',
background: 'white',
borderRadius: isRecording ? '8px' : '50%',
transition: 'all 0.3s',
},
recordText: {
marginTop: '20px',
fontSize: '18px',
color: 'rgba(255, 255, 255, 0.8)',
textAlign: 'center' as const,
},
bottomInput: {
position: 'absolute' as const,
bottom: 0,
left: 0,
right: 0,
background: 'rgba(255, 255, 255, 0.05)',
backdropFilter: 'blur(20px)',
borderTop: '1px solid rgba(255, 255, 255, 0.1)',
padding: '16px',
display: 'flex',
alignItems: 'center',
gap: '12px',
zIndex: 10,
},
inputContainer: {
flex: 1,
position: 'relative' as const,
display: 'flex',
alignItems: 'center',
},
plusBtn: {
position: 'absolute' as const,
left: '12px',
width: '32px',
height: '32px',
background: 'rgba(139, 92, 246, 0.2)',
border: '1px solid rgba(139, 92, 246, 0.4)',
borderRadius: '50%',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
cursor: 'pointer',
zIndex: 2,
},
textInput: {
width: '100%',
padding: '12px 12px 12px 52px',
background: 'rgba(255, 255, 255, 0.05)',
border: '1px solid rgba(255, 255, 255, 0.2)',
borderRadius: '24px',
color: 'white',
fontSize: '16px',
outline: 'none',
},
sendBtn: {
width: '40px',
height: '40px',
background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
border: 'none',
borderRadius: '50%',
color: 'white',
cursor: 'pointer',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
},
overlay: {
position: 'fixed' as const,
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'rgba(0, 0, 0, 0.7)',
display: sideMenuOpen ? 'block' : 'none',
zIndex: 200,
backdropFilter: 'blur(4px)',
},
sideMenu: {
position: 'fixed' as const,
top: 0,
left: sideMenuOpen ? 0 : '-320px',
width: '320px',
height: '100vh',
background: '#141414',
zIndex: 300,
overflowY: 'auto' as const,
transition: 'left 0.3s ease',
boxShadow: '2px 0 20px rgba(0, 0, 0, 0.5)',
},
menuHeader: {
padding: '24px',
borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
},
menuSection: {
padding: '16px 0',
},
menuSectionTitle: {
padding: '8px 24px',
fontSize: '11px',
textTransform: 'uppercase' as const,
letterSpacing: '0.5px',
color: 'rgba(255, 255, 255, 0.4)',
fontWeight: 600,
},
menuItem: {
padding: '14px 24px',
display: 'flex',
alignItems: 'center',
gap: '16px',
cursor: 'pointer',
transition: 'all 0.2s',
color: 'rgba(255, 255, 255, 0.9)',
fontSize: '15px',
},
dashboardView: {
position: 'fixed' as const,
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
padding: '20px',
overflowY: 'auto' as const,
zIndex: 150,
},
viewHeader: {
display: 'flex',
alignItems: 'center',
gap: '16px',
marginBottom: '24px',
paddingBottom: '16px',
borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
},
backBtn: {
width: '40px',
height: '40px',
background: 'rgba(255, 255, 255, 0.1)',
border: '1px solid rgba(255, 255, 255, 0.2)',
borderRadius: '50%',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
cursor: 'pointer',
fontSize: '20px',
},
metricsGrid: {
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
gap: '20px',
marginBottom: '30px',
},
metricCard: {
background: 'rgba(255, 255, 255, 0.05)',
border: '1px solid rgba(255, 255, 255, 0.1)',
borderRadius: '12px',
padding: '24px',
},
card: {
background: 'rgba(255, 255, 255, 0.05)',
border: '1px solid rgba(255, 255, 255, 0.1)',
borderRadius: '12px',
padding: '24px',
marginBottom: '20px',
},
manualPanel: {
position: 'fixed' as const,
bottom: manualPanelOpen ? 0 : '-85vh',
left: 0,
right: 0,
height: '85vh',
background: 'rgba(20, 20, 20, 0.98)',
backdropFilter: 'blur(20px)',
borderTopLeftRadius: '24px',
borderTopRightRadius: '24px',
transition: 'bottom 0.3s ease',
zIndex: 500,
overflowY: 'auto' as const,
boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
},
tagGrid: {
display: 'grid',
gridTemplateColumns: 'repeat(3, 1fr)',
gap: '8px',
},
tagOption: {
padding: '8px 12px',
background: 'rgba(255, 255, 255, 0.05)',
border: '1px solid rgba(255, 255, 255, 0.2)',
borderRadius: '20px',
textAlign: 'center' as const,
cursor: 'pointer',
fontSize: '14px',
},
tagSelected: {
background: 'rgba(139, 92, 246, 0.3)',
borderColor: '#8b5cf6',
},
progressBar: {
width: '100%',
height: '8px',
background: 'rgba(255, 255, 255, 0.1)',
borderRadius: '4px',
overflow: 'hidden',
},
progressFill: {
height: '100%',
background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
borderRadius: '4px',
transition: 'width 0.3s',
},
toggle: {
width: '48px',
height: '24px',
background: 'rgba(255, 255, 255, 0.2)',
borderRadius: '12px',
position: 'relative' as const,
cursor: 'pointer',
transition: 'background 0.3s',
},
toggleActive: {
background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
},
toggleSlider: {
width: '20px',
height: '20px',
background: 'white',
borderRadius: '50%',
position: 'absolute' as const,
top: '2px',
left: '2px',
transition: 'transform 0.3s',
},
toggleSliderActive: {
transform: 'translateX(24px)',
},
};

// Add animation keyframes
useEffect(() => {
const style = document.createElement('style');
style.textContent = `       @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `;
document.head.appendChild(style);
return () => {
document.head.removeChild(style);
};
}, []);

return (
<div style={styles.container}>
{/_ Main Capture Screen _/}
<div style={styles.captureScreen}>
<div style={styles.topNav}>
<div
style={styles.menuBtn}
onClick={() => setSideMenuOpen(!sideMenuOpen)} >
<div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
<span style={{ display: 'block', width: '20px', height: '2px', background: 'white' }} />
<span style={{ display: 'block', width: '20px', height: '2px', background: 'white' }} />
<span style={{ display: 'block', width: '20px', height: '2px', background: 'white' }} />
</div>
</div>
<div
style={styles.menuBtn}
onClick={() => setProfileMenuOpen(!profileMenuOpen)} >
👤
</div>
</div>

        <div style={styles.recordContainer}>
          <div
            style={styles.recordBtn}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          >
            <div style={styles.recordIcon} />
          </div>
          <div style={styles.recordText}>
            {isRecording ? 'Recording...' : 'Hold to record memory'}
          </div>
          {isRecording && (
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#ef4444', marginTop: '20px' }}>
              {formatTime(recordingTime)}
            </div>
          )}
        </div>

        <div style={styles.bottomInput}>
          <div style={styles.inputContainer}>
            <div
              style={styles.plusBtn}
              onClick={() => setManualPanelOpen(true)}
            >
              +
            </div>
            <input
              type="text"
              style={styles.textInput}
              placeholder="Type a memory..."
              value={memoryInput}
              onChange={(e) => setMemoryInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMemory()}
            />
          </div>
          <button style={styles.sendBtn} onClick={sendMemory}>
            →
          </button>
        </div>
      </div>

      {/* Overlay */}
      <div
        style={styles.overlay}
        onClick={() => setSideMenuOpen(false)}
      />

      {/* Side Menu */}
      <div style={styles.sideMenu}>
        <div style={styles.menuHeader}>
          <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>
            MemoryVault AI
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
            Enhanced Intelligence
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuSectionTitle}>Main</div>
          <div style={{...styles.menuItem, ...(currentView === 'capture' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('capture')}>
            <span>🎙️</span>
            <span>Capture</span>
          </div>
          <div style={{...styles.menuItem, ...(currentView === 'overview' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('overview')}>
            <span>📊</span>
            <span>Overview</span>
          </div>
          <div style={{...styles.menuItem, ...(currentView === 'memories' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('memories')}>
            <span>📚</span>
            <span>Memories</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuSectionTitle}>Family</div>
          <div style={{...styles.menuItem, ...(currentView === 'children' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('children')}>
            <span>👶</span>
            <span>Children</span>
          </div>
          <div style={{...styles.menuItem, ...(currentView === 'milestones' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('milestones')}>
            <span>🎯</span>
            <span>Milestones</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuSectionTitle}>Intelligence</div>
          <div style={{...styles.menuItem, ...(currentView === 'analytics' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('analytics')}>
            <span>⚡</span>
            <span>Analytics</span>
          </div>
          <div style={{...styles.menuItem, ...(currentView === 'insights' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('insights')}>
            <span>🧠</span>
            <span>AI Insights</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuSectionTitle}>Settings</div>
          <div style={{...styles.menuItem, ...(currentView === 'settings' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('settings')}>
            <span>⚙️</span>
            <span>Settings</span>
          </div>
          <div style={{...styles.menuItem, ...(currentView === 'help' ? {background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6'} : {})}} onClick={() => navigateTo('help')}>
            <span>❓</span>
            <span>Help & Support</span>
          </div>
        </div>
      </div>

      {/* 1. Overview Dashboard */}
      {currentView === 'overview' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>Overview</div>
          </div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={{ color: '#888', fontSize: '14px' }}>Total Memories</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>247</div>
              <div style={{ color: '#10b981', fontSize: '14px' }}>↑ 12% from last week</div>
            </div>
            <div style={styles.metricCard}>
              <div style={{ color: '#888', fontSize: '14px' }}>Milestones Detected</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>34</div>
              <div style={{ color: '#10b981', fontSize: '14px' }}>↑ 8% from last week</div>
            </div>
            <div style={styles.metricCard}>
              <div style={{ color: '#888', fontSize: '14px' }}>Active Children</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>2</div>
              <div style={{ color: '#888', fontSize: '14px' }}>Emma & Lucas</div>
            </div>
            <div style={styles.metricCard}>
              <div style={{ color: '#888', fontSize: '14px' }}>AI Processing</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>99.7%</div>
              <div style={{ color: '#10b981', fontSize: '14px' }}>✓ Healthy</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <button style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                📸 Add Photo
              </button>
              <button style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                📝 Weekly Report
              </button>
              <button style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                🎯 Review Milestones
              </button>
              <button style={{ padding: '12px', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                📊 Export Data
              </button>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Recent Activity</div>
            {memories.slice(0, 3).map(memory => (
              <div key={memory.id} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{memory.title}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{memory.child} • {memory.date}</div>
                  </div>
                  {memory.confidence && memory.confidence > 80 && (
                    <div style={{ fontSize: '12px', color: '#10b981' }}>✓ AI Verified</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Memories View */}
      {currentView === 'memories' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>All Memories</div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white' }}>
              <option>All Children</option>
              <option>Emma</option>
              <option>Lucas</option>
            </select>
            <select style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white' }}>
              <option>All Categories</option>
              <option>Milestones</option>
              <option>Language</option>
              <option>Physical</option>
              <option>Social</option>
            </select>
            <input
              type="text"
              placeholder="Search memories..."
              style={{ flex: 1, minWidth: '200px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {memories.map(memory => (
              <div key={memory.id} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>{memory.title}</div>
                <div style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>
                  {memory.child} • {memory.date}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {memory.tags?.map(tag => (
                    <span key={tag} style={{
                      padding: '4px 12px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#a78bfa',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
                {memory.confidence && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#888' }}>AI Confidence</div>
                    <div style={{ fontSize: '12px', color: memory.confidence > 80 ? '#10b981' : '#fbbf24' }}>
                      {memory.confidence}%
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Children View */}
      {currentView === 'children' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>Children</div>
          </div>

          <div style={styles.metricsGrid}>
            {children.map(child => (
              <div key={child.id} style={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: child.name === 'Emma' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    {child.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>{child.name}</div>
                    <div style={{ color: '#888', fontSize: '14px' }}>Age: {child.age}</div>
                  </div>
                </div>

                {/* Development Score */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#888' }}>Development Score</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{child.developmentScore}%</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${child.developmentScore}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Total Memories</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{child.totalMemories}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Milestones</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{child.milestones}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Last Entry</div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{child.lastEntry}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Avg/Week</div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>12 memories</div>
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '10px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}>
                  View Timeline →
                </button>
              </div>
            ))}

            {/* Add Child Card */}
            <div style={{ ...styles.card, border: '2px dashed rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}>
                  +
                </div>
                <div style={{ color: '#888' }}>Add Child</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Milestones View */}
      {currentView === 'milestones' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>Milestones</div>
          </div>

          {/* Milestone Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(147, 51, 234, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>34</div>
              <div style={{ fontSize: '12px', color: '#a78bfa' }}>Total Milestones</div>
            </div>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>28</div>
              <div style={{ fontSize: '12px', color: '#4ade80' }}>AI Verified</div>
            </div>
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>6</div>
              <div style={{ fontSize: '12px', color: '#fbbf24' }}>Pending Review</div>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>91%</div>
              <div style={{ fontSize: '12px', color: '#60a5fa' }}>Avg Confidence</div>
            </div>
          </div>

          {/* Timeline View */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Milestone Timeline</div>
            <div style={{ position: 'relative', paddingLeft: '40px' }}>
              {/* Timeline line */}
              <div style={{ position: 'absolute', left: '20px', top: '20px', bottom: '20px', width: '2px', background: 'rgba(139, 92, 246, 0.3)' }} />

              {milestones.map((milestone, index) => (
                <div key={milestone.id} style={{ position: 'relative', marginBottom: '24px' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-25px',
                    top: '8px',
                    width: '12px',
                    height: '12px',
                    background: milestone.verified ? '#10b981' : '#fbbf24',
                    borderRadius: '50%',
                    border: '2px solid #1a1a1a'
                  }} />

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{milestone.title}</div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          {milestone.child} • {milestone.date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          padding: '2px 8px',
                          background: milestone.verified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                          color: milestone.verified ? '#4ade80' : '#fbbf24',
                          borderRadius: '4px',
                          fontSize: '11px',
                          marginBottom: '4px'
                        }}>
                          {milestone.verified ? 'Verified' : 'Pending'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          AI: {milestone.aiConfidence}%
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#a78bfa'
                      }}>
                        {milestone.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Analytics View */}
      {currentView === 'analytics' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>Analytics</div>
          </div>

          {/* Processing Health */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Processing Pipeline Health</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Processing Speed</span>
                  <span>1.2s avg</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '85%' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Token Usage</span>
                  <span>68%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '68%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Error Rate</span>
                  <span>0.3%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '3%', background: '#10b981' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Uptime</span>
                  <span>99.9%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '99.9%', background: '#10b981' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Cost Analysis */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Cost Analysis</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Monthly Cost</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>$47.82</div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>↓ 12% from last month</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Cost per Memory</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>$0.19</div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>↓ 8% optimization</div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '14px', marginBottom: '12px' }}>Cost Breakdown</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
                  <span>AI Processing</span>
                  <span>$32.40 (68%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
                  <span>Storage</span>
                  <span>$8.20 (17%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px' }}>
                  <span>Embeddings</span>
                  <span>$7.22 (15%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Patterns */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Memory Patterns</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌅</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Morning</div>
                <div style={{ fontSize: '12px', color: '#888' }}>32% of memories</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>☀️</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Afternoon</div>
                <div style={{ fontSize: '12px', color: '#888' }}>45% of memories</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌙</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Evening</div>
                <div style={{ fontSize: '12px', color: '#888' }}>23% of memories</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. AI Insights View */}
      {currentView === 'insights' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>AI Insights</div>
          </div>

          {/* Insights Grid */}
          <div style={{ display: 'grid', gap: '20px' }}>
            {insights.map((insight, index) => (
              <div key={index} style={styles.card}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                  <div style={{
                    fontSize: '28px',
                    width: '48px',
                    height: '48px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {insight.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{insight.title}</div>
                    <div style={{ color: '#888', lineHeight: 1.6 }}>{insight.content}</div>
                    <button style={{
                      marginTop: '12px',
                      padding: '6px 16px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      Learn More →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Development Comparisons */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Development Comparisons</div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {['Physical', 'Cognitive', 'Language', 'Social'].map(category => (
                <div key={category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{category} Development</span>
                    <span style={{ fontSize: '14px', color: '#888' }}>vs. peers</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, ...styles.progressBar }}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${75 + Math.random() * 20}%`,
                        background: category === 'Physical' ? 'linear-gradient(90deg, #10b981, #34d399)' :
                                   category === 'Cognitive' ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' :
                                   category === 'Language' ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' :
                                   'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#10b981' }}>+12%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Settings View */}
      {currentView === 'settings' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>Settings</div>
          </div>

          {/* AI Settings */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>AI Processing</div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Automatic Milestone Detection</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>AI analyzes memories for developmental milestones</div>
                </div>
                <div
                  style={{ ...styles.toggle, ...(autoDetection ? styles.toggleActive : {}) }}
                  onClick={() => setAutoDetection(!autoDetection)}
                >
                  <div style={{ ...styles.toggleSlider, ...(autoDetection ? styles.toggleSliderActive : {}) }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Weekly AI Reports</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Receive weekly summaries and insights</div>
                </div>
                <div
                  style={{ ...styles.toggle, ...(weeklyReports ? styles.toggleActive : {}) }}
                  onClick={() => setWeeklyReports(!weeklyReports)}
                >
                  <div style={{ ...styles.toggleSlider, ...(weeklyReports ? styles.toggleSliderActive : {}) }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Smart Suggestions</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Get prompts for memory capture based on patterns</div>
                </div>
                <div
                  style={{ ...styles.toggle, ...styles.toggleActive }}
                >
                  <div style={{ ...styles.toggleSlider, ...styles.toggleSliderActive }} />
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Privacy & Data</div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <button style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>Export All Data</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Download memories as PDF or JSON</div>
              </button>
              <button style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>Family Sharing</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Manage who can view and add memories</div>
              </button>
              <button style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 500 }}>Data Retention</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Configure how long to keep memories</div>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Notifications</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Push Notifications</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Milestone alerts and memory reminders</div>
              </div>
              <div
                style={{ ...styles.toggle, ...(notificationsEnabled ? styles.toggleActive : {}) }}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                <div style={{ ...styles.toggleSlider, ...(notificationsEnabled ? styles.toggleSliderActive : {}) }} />
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div style={{ display: 'grid', gap: '12px' }}>
            <button style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}>
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* 8. Help & Support View */}
      {currentView === 'help' && (
        <div style={styles.dashboardView}>
          <div style={styles.viewHeader}>
            <div style={styles.backBtn} onClick={() => navigateTo('capture')}>
              ←
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600 }}>Help & Support</div>
          </div>

          {/* Quick Help */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Getting Started</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <button style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎥</div>
                <div style={{ fontWeight: 500 }}>Video Tutorial</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>5 min introduction</div>
              </button>
              <button style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📖</div>
                <div style={{ fontWeight: 500 }}>User Guide</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Complete documentation</div>
              </button>
              <button style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💡</div>
                <div style={{ fontWeight: 500 }}>Tips & Tricks</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Pro features</div>
              </button>
            </div>
          </div>

          {/* FAQs */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Frequently Asked Questions</div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {faqs.map((faq, index) => (
                <details key={index} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', cursor: 'pointer' }}>
                  <summary style={{ fontWeight: 500, marginBottom: '8px' }}>{faq.q}</summary>
                  <div style={{ color: '#888', fontSize: '14px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div style={styles.card}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Contact Support</div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <button style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500 }}>Live Chat</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Available 9am-6pm PST</div>
                </div>
              </button>
              <button style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>✉️</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500 }}>Email Support</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>support@memoryvault.ai</div>
                </div>
              </button>
              <button style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🐛</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500 }}>Report a Bug</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Help us improve</div>
                </div>
              </button>
            </div>
          </div>

          {/* App Info */}
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#888', fontSize: '12px' }}>
            <div>MemoryVault AI v1.0.0</div>
            <div>Powered by Enhanced Intelligence</div>
            <div style={{ marginTop: '8px' }}>© 2025 All rights reserved</div>
          </div>
        </div>
      )}

      {/* Manual Entry Panel - Expanded */}
      <div style={styles.manualPanel}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'rgba(20, 20, 20, 0.98)',
          zIndex: 10,
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Add Detailed Memory</h3>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setManualPanelOpen(false)}
          >
            ✕
          </div>
        </div>

        <div style={{ padding: '20px', maxHeight: 'calc(85vh - 60px)', overflowY: 'auto' }}>
          {/* Child Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Child
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['Emma', 'Lucas', 'Both'].map(child => (
                <button
                  key={child}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: selectedChild === child ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: selectedChild === child ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: selectedChild === child ? '#a78bfa' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={() => setSelectedChild(child)}
                >
                  <span style={{ fontSize: '20px' }}>
                    {child === 'Emma' ? '👧' : child === 'Lucas' ? '👦' : '👫'}
                  </span>
                  <span style={{ fontSize: '14px' }}>{child}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Memory Description */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Memory Description
            </div>
            <textarea
              placeholder="What happened? Be as detailed as you'd like..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Date and Time Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              When Did This Happen?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <input
                type="date"
                style={{
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                }}
              />
              <input
                type="time"
                style={{
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                }}
              />
            </div>
            {/* Time of Day Quick Select */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { icon: '🌅', label: 'Morning', time: '6-12' },
                { icon: '☀️', label: 'Afternoon', time: '12-17' },
                { icon: '🌆', label: 'Evening', time: '17-20' },
                { icon: '🌙', label: 'Night', time: '20-6' }
              ].map(period => (
                <button
                  key={period.label}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <div>{period.icon}</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>{period.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Location
            </div>
            <input
              type="text"
              placeholder="Home, Park, Grandma's house, Doctor's office..."
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Weather & Mood */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Context
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <select style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
              }}>
                <option>Weather...</option>
                <option>☀️ Sunny</option>
                <option>⛅ Partly Cloudy</option>
                <option>☁️ Cloudy</option>
                <option>🌧️ Rainy</option>
                <option>⛈️ Stormy</option>
                <option>❄️ Snowy</option>
                <option>🌫️ Foggy</option>
              </select>
              <select style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
              }}>
                <option>Child's Mood...</option>
                <option>😊 Happy</option>
                <option>🤗 Excited</option>
                <option>😌 Calm</option>
                <option>😴 Tired</option>
                <option>😤 Frustrated</option>
                <option>😢 Upset</option>
                <option>🤒 Unwell</option>
                <option>😐 Neutral</option>
              </select>
            </div>
          </div>

          {/* Categories/Tags */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Categories (Select All That Apply)
            </div>
            <div style={styles.tagGrid}>
              {tags.map(tag => (
                <div
                  key={tag.label}
                  style={{
                    ...styles.tagOption,
                    ...(selectedTags.includes(tag.label) ? styles.tagSelected : {})
                  }}
                  onClick={() => toggleTag(tag.label)}
                >
                  {tag.icon} {tag.label}
                </div>
              ))}
            </div>
          </div>

          {/* Who Was There */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Who Was There?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {['Mom', 'Dad', 'Sibling', 'Grandparents', 'Friends', 'Caregiver', 'Other'].map(person => (
                <button
                  key={person}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {person}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add specific names or other people..."
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Parent Insight */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Parent Insight & Reflection
            </div>
            <textarea
              placeholder="What did you notice about your child? Any thoughts on their development, behavior, or emotions? What made this moment special?"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Additional Context */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Additional Context
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Activity Level */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Activity Level
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Low', 'Medium', 'High', 'Very High'].map(level => (
                    <button
                      key={level}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Health Status */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Health Status
                </label>
                <select style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                }}>
                  <option>Healthy</option>
                  <option>Recovering from illness</option>
                  <option>Teething</option>
                  <option>Growth spurt</option>
                  <option>Under the weather</option>
                </select>
              </div>

              {/* Sleep Quality (Previous Night) */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Previous Night's Sleep
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['😴 Great', '😊 Good', '😐 Fair', '😔 Poor'].map(sleep => (
                    <button
                      key={sleep}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {sleep}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal/Snack Context */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Meal/Snack Timing
                </label>
                <select style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                }}>
                  <option>Not applicable</option>
                  <option>Before meal</option>
                  <option>After meal</option>
                  <option>During snack</option>
                  <option>Hungry</option>
                  <option>Just ate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Media Attachments */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Attach Media (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px' }}>📸</span>
                <span style={{ fontSize: '12px' }}>Add Photo</span>
              </button>
              <button style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px' }}>🎥</span>
                <span style={{ fontSize: '12px' }}>Add Video</span>
              </button>
            </div>
          </div>

          {/* Privacy Setting */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Privacy
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
              }}>
                🔒 Private
              </button>
              <button style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#a78bfa',
                cursor: 'pointer',
                fontSize: '12px',
              }}>
                👨‍👩‍👧‍👦 Family
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
          }}>
            Save Memory
          </button>

          {/* Quick Save Option */}
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            Save as Draft
          </button>
        </div>
      </div>
    </div>

);
};

export default MemoryVaultApp;
