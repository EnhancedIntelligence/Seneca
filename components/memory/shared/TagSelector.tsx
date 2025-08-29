"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Tag, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  familyId: string;
  maxTags?: number;
  className?: string;
  suggestions?: string[];
}

// Common memory tag suggestions for AI-assisted tagging
const DEFAULT_TAG_SUGGESTIONS = [
  // Milestones
  "first-steps",
  "first-words",
  "first-food",
  "first-day",
  "milestone",

  // Activities
  "playing",
  "learning",
  "reading",
  "cooking",
  "crafts",
  "outdoor",
  "sports",

  // Emotions & Moods
  "happy",
  "excited",
  "proud",
  "silly",
  "curious",
  "calm",
  "adventurous",

  // Family & Social
  "family-time",
  "siblings",
  "grandparents",
  "friends",
  "playdate",

  // Occasions
  "birthday",
  "holiday",
  "vacation",
  "celebration",
  "special-occasion",

  // Development
  "growth",
  "independence",
  "creativity",
  "problem-solving",
  "social-skills",

  // Daily Life
  "bedtime",
  "mealtime",
  "bath-time",
  "morning-routine",
  "evening-routine",
];

export function TagSelector({
  value = [],
  onChange,
  familyId,
  maxTags = 20,
  className,
  suggestions = DEFAULT_TAG_SUGGESTIONS,
}: TagSelectorProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [familyTags, setFamilyTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load popular tags from family's previous memories
  useEffect(() => {
    const loadFamilyTags = async () => {
      try {
        // This would typically fetch from your API
        // For now, we'll use a mock implementation
        const mockFamilyTags = [
          "park-visit",
          "bedtime-stories",
          "garden-time",
          "art-project",
          "music-time",
          "dance-party",
          "baking",
          "nature-walk",
        ];
        setFamilyTags(mockFamilyTags);
      } catch (error) {
        console.error("Failed to load family tags:", error);
      }
    };

    loadFamilyTags();
  }, [familyId]);

  // Filter suggestions based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = inputValue.toLowerCase().trim();

    // Combine all suggestion sources
    const allSuggestions = [
      ...familyTags, // Family-specific tags first
      ...suggestions, // Default suggestions
    ];

    // Filter and deduplicate
    const filtered = [...new Set(allSuggestions)]
      .filter(
        (tag) => tag.toLowerCase().includes(query) && !value.includes(tag),
      )
      .slice(0, 8); // Limit suggestions

    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [inputValue, suggestions, familyTags, value]);

  // Add a tag
  const addTag = useCallback(
    (tag: string) => {
      const cleanTag = tag.trim().toLowerCase().replace(/\s+/g, "-");

      // Validation
      if (!cleanTag) return;

      if (cleanTag.length > 50) {
        toast({
          title: "Tag too long",
          description: "Tags must be 50 characters or less.",
          variant: "destructive",
        });
        return;
      }

      if (value.includes(cleanTag)) {
        toast({
          title: "Tag already added",
          description: `"${cleanTag}" is already in your tag list.`,
          variant: "destructive",
        });
        return;
      }

      if (value.length >= maxTags) {
        toast({
          title: "Too many tags",
          description: `Maximum ${maxTags} tags allowed.`,
          variant: "destructive",
        });
        return;
      }

      // Add tag and clear input
      onChange([...value, cleanTag]);
      setInputValue("");
      setShowSuggestions(false);

      // Focus back on input for easy addition of more tags
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      toast({
        title: "Tag added",
        description: `Added "${cleanTag}" to your memory.`,
      });
    },
    [value, onChange, maxTags, toast],
  );

  // Remove a tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));

      toast({
        title: "Tag removed",
        description: `Removed "${tagToRemove}" from your memory.`,
      });
    },
    [value, onChange, toast],
  );

  // Handle input key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        // Remove last tag when backspacing on empty input
        const lastTag = value[value.length - 1];
        removeTag(lastTag);
      }
    },
    [inputValue, addTag, value, removeTag],
  );

  // Select suggestion
  const selectSuggestion = useCallback(
    (suggestion: string) => {
      addTag(suggestion);
    },
    [addTag],
  );

  // Generate AI-powered tag suggestions based on content
  const generateAITags = useCallback(async () => {
    // This would typically call your AI API to analyze the memory content
    // For now, we'll provide some smart suggestions
    const aiSuggestions = [
      "ai-suggested",
      "special-moment",
      "memorable",
      "growth-milestone",
    ].filter((tag) => !value.includes(tag));

    if (aiSuggestions.length === 0) {
      toast({
        title: "No new suggestions",
        description: "AI couldn't find any new relevant tags.",
      });
      return;
    }

    // Add first AI suggestion automatically
    if (aiSuggestions.length > 0) {
      addTag(aiSuggestions[0]);
    }
  }, [value, addTag, toast]);

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Current Tags Display */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="px-2 py-1 text-xs group cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeTag(tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
                <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Badge>
            ))}
          </div>
        )}

        {/* Tag Input */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="text"
                placeholder={
                  value.length === 0
                    ? "Add tags to organize your memory..."
                    : "Add another tag..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() =>
                  inputValue &&
                  setShowSuggestions(filteredSuggestions.length > 0)
                }
                className="pr-10"
              />
              {inputValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputValue("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputValue.trim() && addTag(inputValue)}
              disabled={!inputValue.trim() || value.length >= maxTags}
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateAITags}
              disabled={value.length >= maxTags}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>

          {/* Tag Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 z-10 mt-1 border shadow-lg">
              <CardContent className="p-0">
                <div className="max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion}-${index}`}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none border-b border-border last:border-b-0 flex items-center gap-2"
                    >
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {suggestion}
                      {familyTags.includes(suggestion) && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          family
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Popular Family Tags */}
        {familyTags.length > 0 && value.length < maxTags && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Popular in your family:
            </p>
            <div className="flex flex-wrap gap-1">
              {familyTags
                .filter((tag) => !value.includes(tag))
                .slice(0, 8)
                .map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                    className="h-6 px-2 text-xs border-dashed"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Tag Count and Tips */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {value.length}/{maxTags} tags
          </span>
          <span>
            Press Enter to add • Backspace to remove • Click tags to delete
          </span>
        </div>

        {value.length > 0 && (
          <div className="p-3 bg-muted/30 rounded-lg border-l-2 border-primary">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Pro tip:</strong> Good tags help you find memories
              later and enable better AI insights. Try using specific tags like
              "first-steps" rather than generic ones like "walking".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
