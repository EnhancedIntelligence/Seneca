/**
 * API Response Adapters
 *
 * The mock API returns domain types (Child, Memory) with mixed casing
 * These adapters convert API responses to UI types
 */

import type { UIChild, UIMemory, UITag } from "@/lib/types";

/**
 * Convert API Child response to UIChild
 * API returns domain Child type, not DB format
 */
export function apiChildToUi(child: any): UIChild {
  // Calculate age from birthDate if present
  const calculateAge = (birthDate?: string | Date) => {
    if (!birthDate) return null;

    try {
      const birth = new Date(birthDate);
      const now = new Date();

      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();

      if (months < 0) {
        years -= 1;
        months += 12;
      }

      if (now.getDate() < birth.getDate()) {
        months -= 1;
        if (months < 0) {
          years -= 1;
          months += 12;
        }
      }

      return { years, months };
    } catch {
      return null;
    }
  };

  // Generate initials
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") ||
    name[0]?.toUpperCase() ||
    "?";

  // Generate gradient
  const getGradient = (id: string, name: string) => {
    const gradients = [
      "bg-gradient-to-r from-pink-500 to-rose-500",
      "bg-gradient-to-r from-blue-500 to-cyan-500",
      "bg-gradient-to-r from-purple-500 to-indigo-500",
      "bg-gradient-to-r from-green-500 to-emerald-500",
      "bg-gradient-to-r from-yellow-500 to-orange-500",
    ];
    const hash = Math.abs(
      Array.from(id + name).reduce((a, c) => a + c.charCodeAt(0), 0),
    );
    return gradients[hash % gradients.length];
  };

  return {
    id: child.id,
    familyId: child.familyId || child.family_id || null,
    name: child.name,
    avatarUrl:
      child.avatarUrl ||
      child.profileImageUrl ||
      child.profile_image_url ||
      null,
    birthDate: child.birthDate || child.birth_date || null,
    age: calculateAge(child.birthDate || child.birth_date),
    initials: getInitials(child.name),
    emoji: child.emoji || "👶",
    gradient: child.gradient || getGradient(child.id, child.name),
    createdAt: child.createdAt || child.created_at || new Date().toISOString(),
    updatedAt: child.updatedAt || child.updated_at || new Date().toISOString(),
  };
}

/**
 * Convert API Memory response to UIMemory
 */
export function apiMemoryToUi(memory: any): UIMemory {
  // Ensure tags are UITag objects
  const normalizeTags = (tags: any): UITag[] => {
    if (!tags) return [];
    if (!Array.isArray(tags)) return [];

    return tags
      .map((tag) => {
        if (typeof tag === "string") {
          return { id: tag, label: tag };
        }
        if (tag && typeof tag === "object") {
          return {
            id: tag.id || tag.label || "",
            label: tag.label || tag.id || "",
          };
        }
        return { id: "", label: "" };
      })
      .filter((t) => t.id && t.label);
  };

  // Derive type from category or media
  const deriveType = () => {
    const category = (memory.category || "").toLowerCase();
    if (memory.videoUrls?.length > 0 || memory.video_urls?.length > 0)
      return "video";
    if (memory.imageUrls?.length > 0 || memory.image_urls?.length > 0)
      return "photo";
    if (["audio", "voice", "recording"].includes(category)) return "voice";
    if (["event", "milestone"].includes(category)) return "event";
    return "text";
  };

  // Helper to check if value is defined
  const has = <T>(v: T | null | undefined): v is T =>
    v !== null && v !== undefined;

  return {
    id: memory.id,
    childId: memory.childId || memory.child_id || null,
    familyId: memory.familyId || memory.family_id || null,
    createdBy: memory.createdBy || memory.created_by || "system",
    title: memory.title || null,
    content: memory.content || memory.description || "",
    timestamp:
      memory.timestamp ||
      memory.memoryDate ||
      memory.memory_date ||
      memory.createdAt ||
      memory.created_at ||
      new Date().toISOString(),
    type: deriveType(),
    tags: normalizeTags(memory.tags),
    category: memory.category || null,
    needsReview: memory.needsReview ?? memory.needs_review ?? false,
    processingStatus:
      memory.processingStatus || memory.processing_status || "pending",
    // Required media fields
    imageUrls: memory.imageUrls || memory.image_urls || [],
    videoUrls: memory.videoUrls || memory.video_urls || [],
    // Optional fields - preserve false/0 values
    ...(has(memory.locationName)
      ? { locationName: memory.locationName }
      : has(memory.location_name)
        ? { locationName: memory.location_name }
        : {}),
    ...(has(memory.locationLat)
      ? { locationLat: memory.locationLat }
      : has(memory.location_lat)
        ? { locationLat: memory.location_lat }
        : {}),
    ...(has(memory.locationLng)
      ? { locationLng: memory.locationLng }
      : has(memory.location_lng)
        ? { locationLng: memory.location_lng }
        : {}),
    ...(has(memory.milestoneDetected)
      ? { milestoneDetected: memory.milestoneDetected }
      : has(memory.milestone_detected)
        ? { milestoneDetected: memory.milestone_detected }
        : {}),
    ...(has(memory.milestoneType)
      ? { milestoneType: memory.milestoneType }
      : has(memory.milestone_type)
        ? { milestoneType: memory.milestone_type }
        : {}),
    ...(has(memory.milestoneConfidence)
      ? { milestoneConfidence: memory.milestoneConfidence }
      : has(memory.milestone_confidence)
        ? { milestoneConfidence: memory.milestone_confidence }
        : {}),
    ...(has(memory.memoryDate)
      ? { memoryDate: memory.memoryDate }
      : has(memory.memory_date)
        ? { memoryDate: memory.memory_date }
        : {}),
  };
}

/**
 * Convert API responses to UI types
 */
export const apiAdapters = {
  child: apiChildToUi,
  memory: apiMemoryToUi,
  children: (children: any[]) => children.map(apiChildToUi),
  memories: (memories: any[]) => memories.map(apiMemoryToUi),
};
