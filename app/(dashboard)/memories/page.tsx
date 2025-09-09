"use client";

import { devLog } from "@/lib/client-debug";

/**
 * Memories List View
 * Browse and search all memories
 */

import { useState, useEffect, useMemo } from "react";
import { MemoryCard } from "@/components/memory/MemoryCard";
import {
  useFilteredMemories,
  useFilters,
  useFamily,
} from "@/lib/stores/useAppStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Tag,
  ChevronDown,
  SortAsc,
  Clock,
  TrendingUp,
  Star,
} from "lucide-react";
import { tagOptions } from "@/lib/stores/mockData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

type SortOption = "recent" | "oldest" | "milestone" | "confidence";

export default function MemoriesPage() {
  const memories = useFilteredMemories();
  const { searchQuery, setSearchQuery, selectedTags, toggleTag, clearFilters } =
    useFilters();
  const { children, activeChildId, switchChild } = useFamily();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const isLoading = false; // Will add real loading when API is connected

  const activeChild = children.find((c) => c.id === activeChildId);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Sort memories
  const sortedMemories = useMemo(() => {
    const sorted = [...memories];

    switch (sortBy) {
      case "oldest":
        sorted.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        break;
      case "milestone":
        sorted.sort((a, b) => {
          const aMilestone = a.tags.some((t) => t.label === "milestone")
            ? 1
            : 0;
          const bMilestone = b.tags.some((t) => t.label === "milestone")
            ? 1
            : 0;
          return bMilestone - aMilestone;
        });
        break;
      case "confidence":
        // Mock confidence score based on processing status and tags
        sorted.sort((a, b) => {
          const aScore = a.processingStatus === "completed" ? 1 : 0.5;
          const bScore = b.processingStatus === "completed" ? 1 : 0.5;
          return bScore - aScore;
        });
        break;
      case "recent":
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        break;
    }

    return sorted;
  }, [memories, sortBy]);

  // Paginate memories
  const paginatedMemories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedMemories.slice(startIndex, endIndex);
  }, [sortedMemories, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedMemories.length / itemsPerPage);

  const hasFilters = searchQuery || selectedTags.length > 0 || activeChildId;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Memory Timeline
        </h1>
        <p className="text-gray-400 mt-1">
          {memories.length} memories captured
          {activeChild && ` for ${activeChild.name}`}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar and Sort */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search memories..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>

          {/* Sort Selector */}
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
              <SortAsc className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="recent">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Most Recent
                </div>
              </SelectItem>
              <SelectItem value="oldest">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 rotate-180" />
                  Oldest First
                </div>
              </SelectItem>
              <SelectItem value="milestone">
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  Milestones First
                </div>
              </SelectItem>
              <SelectItem value="confidence">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI Confidence
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Child Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10"
              >
                {activeChild ? (
                  <>
                    <span className="mr-1">{activeChild.emoji}</span>
                    {activeChild.name}
                  </>
                ) : (
                  "All Children"
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10">
              <DropdownMenuLabel>Select Child</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => switchChild("")}>
                All Children
              </DropdownMenuItem>
              {children.map((child) => (
                <DropdownMenuItem
                  key={child.id}
                  onClick={() => switchChild(child.id)}
                >
                  <span className="mr-2">{child.emoji}</span>
                  {child.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tag Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10"
              >
                <Tag className="w-4 h-4 mr-2" />
                Tags ({selectedTags.length})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10">
              <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {tagOptions.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.value}
                  checked={selectedTags.includes(tag.value)}
                  onCheckedChange={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-400"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => {
              const tagOption = tagOptions.find((t) => t.value === tag);
              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tagOption?.label || tag}
                  <span className="ml-1">×</span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Memories List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading state
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : sortedMemories.length === 0 ? (
          // Empty state
          <Card className="bg-white/5 border-white/10 p-8 text-center">
            <div className="text-gray-400">
              {hasFilters ? (
                <>
                  <p className="text-lg mb-2">No memories found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">No memories yet</p>
                  <p className="text-sm">
                    Start capturing moments to see them here
                  </p>
                </>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* Memory List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onCardClick={() => {
                    // TODO: Add memory detail view
                    devLog("Memory clicked:", memory.id);
                  }}
                />
              ))}
            </div>

            {/* Memory count and pagination info */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, sortedMemories.length)} of{" "}
                {sortedMemories.length} memories
              </span>
            </div>
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="bg-white/5 border-white/10"
          >
            Previous
          </Button>

          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={i}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={
                    pageNum === currentPage
                      ? "bg-gradient-to-r from-violet-600 to-blue-600"
                      : "bg-white/5 border-white/10"
                  }
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="bg-white/5 border-white/10"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
