# Extracted Components Library

This directory contains reusable React components extracted from the Memory Vault UI Reference implementation. All components are self-contained, properly typed with TypeScript, and include comprehensive JSDoc documentation.

## Component Structure

```
extracted-components/
├── capture/              # Memory capture components
│   ├── RecordButton.tsx      # Hold-to-record voice button
│   ├── QuickEntry.tsx        # Text input with quick actions
│   └── ManualEntrySheet.tsx  # Detailed memory entry form
├── layout/              # Application layout components
│   ├── AppShell.tsx         # Main app wrapper with navigation
│   ├── TopBar.tsx           # Header navigation bar
│   ├── SideMenu.tsx         # Navigation drawer menu
│   └── ProfileMenu.tsx      # User profile dropdown
├── dashboard/           # Dashboard and display components
│   ├── MetricCard.tsx       # Statistics display card
│   ├── InsightCard.tsx      # AI insights display
│   ├── MilestoneTimeline.tsx # Milestone timeline view
│   └── ChildCard.tsx        # Child profile card
├── ui/                  # Generic UI components
│   └── BottomSheet.tsx      # Reusable bottom sheet
└── index.ts            # Main export file
```

## Component Categories

### 📹 Capture Components

#### RecordButton
- **Purpose**: Voice recording with visual feedback
- **Features**: Hold-to-record, timer display, haptic feedback
- **Usage**: Main capture screen for voice memories

#### QuickEntry
- **Purpose**: Quick text memory input
- **Features**: Inline text input, character count, send button
- **Usage**: Bottom of capture screen for text entries

#### ManualEntrySheet
- **Purpose**: Comprehensive memory entry form
- **Features**: Multi-field form, child selection, tags, location, mood tracking
- **Usage**: Detailed memory creation with metadata

### 🎨 Layout Components

#### AppShell
- **Purpose**: Main application wrapper
- **Features**: Navigation state management, background effects
- **Usage**: Root layout component for the entire app

#### TopBar
- **Purpose**: Header navigation
- **Features**: Menu toggle, profile button, notifications
- **Usage**: Consistent header across all views

#### SideMenu
- **Purpose**: Navigation drawer
- **Features**: Organized menu sections, active state indication
- **Usage**: Main navigation between app sections

#### ProfileMenu
- **Purpose**: User account menu
- **Features**: Profile actions, settings, logout
- **Usage**: Dropdown from profile button

### 📊 Dashboard Components

#### MetricCard
- **Purpose**: Display statistics and metrics
- **Features**: Trends, progress bars, multiple variants
- **Usage**: Dashboard overview, analytics displays

#### InsightCard
- **Purpose**: AI-generated insights display
- **Features**: Different insight types, confidence scores
- **Usage**: AI insights section, recommendations

#### MilestoneTimeline
- **Purpose**: Developmental milestone tracking
- **Features**: Timeline view, verification status, AI confidence
- **Usage**: Milestone tracking and history

#### ChildCard
- **Purpose**: Child profile display
- **Features**: Development score, stats, recent activity
- **Usage**: Children overview, profile management

### 🧩 UI Components

#### BottomSheet
- **Purpose**: Reusable bottom drawer
- **Features**: Gesture support, customizable height, smooth animations
- **Usage**: Forms, menus, or any sliding panel content

## Usage Examples

### Basic Import
```tsx
import { RecordButton, QuickEntry, AppShell } from '@/extracted-components'
```

### RecordButton Example
```tsx
<RecordButton
  onRecordStart={() => console.log('Recording started')}
  onRecordEnd={(duration) => console.log(`Recorded for ${duration} seconds`)}
  size="lg"
/>
```

### AppShell Example
```tsx
<AppShell
  topBar={<TopBar onMenuClick={toggleMenu} />}
  sideMenu={<SideMenu currentView={view} onNavigate={setView} />}
  bottomNav={<QuickEntry onSend={handleSend} onPlusClick={openManualEntry} />}
>
  <MainContent />
</AppShell>
```

### MetricCard Example
```tsx
<MetricCard
  title="Total Memories"
  value={247}
  trend={{ value: 12, direction: 'up', label: 'from last week' }}
  icon={BookOpen}
  variant="default"
/>
```

## Design Patterns

### Consistent Styling
- All components use Tailwind CSS classes
- Dark theme optimized with glass morphism effects
- Consistent spacing and border radius patterns
- Responsive design with mobile-first approach

### TypeScript Support
- Full TypeScript typing for all props
- Exported interfaces for external use
- JSDoc comments for IDE support

### Accessibility
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

### Performance
- Memoization where appropriate
- Lazy loading support
- Optimized re-renders
- Efficient event handlers

## Integration Notes

### Dependencies
- React 18+
- Tailwind CSS
- Lucide React icons
- `@/lib/utils` for cn() utility

### State Management
- Components are stateless where possible
- Controlled components with callbacks
- Compatible with any state management solution

### Customization
- All components accept className props
- Variant props for different styles
- Flexible content slots
- Theme-aware styling

## Best Practices

1. **Import only what you need** - Use named imports for tree-shaking
2. **Provide callbacks** - All interactive components use callback props
3. **Handle loading states** - Components support loading/disabled states
4. **Accessibility first** - Always include proper ARIA attributes
5. **Responsive by default** - Components work on all screen sizes

## Future Enhancements

- [ ] Add animation variants
- [ ] Create compound components
- [ ] Add more color themes
- [ ] Build Storybook documentation
- [ ] Add unit tests
- [ ] Create usage playground

## Contributing

When adding new components:
1. Follow existing patterns and conventions
2. Include comprehensive TypeScript types
3. Add JSDoc documentation
4. Ensure mobile responsiveness
5. Test accessibility features
6. Update this README