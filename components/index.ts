/**
 * Extracted Components Index
 *
 * This file exports all the extracted and modularized components
 * from the Memory Vault UI Reference implementation.
 */

// Capture Components
export { RecordButton } from "./capture/RecordButton";
export type { RecordButtonProps } from "./capture/RecordButton";

export { QuickEntry } from "./capture/QuickEntry";
export type { QuickEntryProps } from "./capture/QuickEntry";

export { ManualEntrySheet } from "./capture/ManualEntrySheet";
export type {
  ManualEntrySheetProps,
  ManualMemoryData,
} from "./capture/ManualEntrySheet";

// Layout Components
export { AppShell } from "./layout/AppShell";
export type { AppShellProps } from "./layout/AppShell";

export { TopBar } from "./layout/TopBar";
export type { TopBarProps } from "./layout/TopBar";

export { SideMenu } from "./layout/SideMenu";
export type { SideMenuProps, NavigationView } from "./layout/SideMenu";

export { ProfileMenu } from "./layout/ProfileMenu";
export type { ProfileMenuProps, ProfileAction } from "./layout/ProfileMenu";

// Dashboard Components
export { MetricCard } from "./dashboard/MetricCard";
export type { MetricCardProps, MetricTrend } from "./dashboard/MetricCard";

export { InsightCard } from "./dashboard/InsightCard";
export type { InsightCardProps, InsightType } from "./dashboard/InsightCard";

export { MilestoneTimeline } from "./dashboard/MilestoneTimeline";
export type {
  MilestoneTimelineProps,
  Milestone,
} from "./dashboard/MilestoneTimeline";

export { ChildCard } from "./dashboard/ChildCard";
export type { ChildCardProps, ChildData } from "./dashboard/ChildCard";

// UI Components
export { BottomSheet } from "./ui/BottomSheet";
export type { BottomSheetProps } from "./ui/BottomSheet";
