import type { UITag, TagLabel } from '@/lib/types';

/**
 * Convert a tag label to a UITag object
 */
export const toTag = (label: TagLabel): UITag => ({ 
  id: label, 
  label 
});

/**
 * Convert an array of UITag objects to their label strings
 */
export const toLabels = (tags: UITag[]): TagLabel[] => 
  tags.map(t => t.id as TagLabel);

/**
 * Convert an array of tag labels to UITag objects
 */
export const fromLabels = (labels: TagLabel[]): UITag[] => 
  labels.map(label => ({ id: label, label }));

/**
 * Check if a tag array contains a specific label
 */
export const hasTagLabel = (tags: UITag[], label: TagLabel): boolean =>
  tags.some(t => t.id === label);