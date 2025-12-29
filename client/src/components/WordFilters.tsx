import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { WordStatus } from "@shared/schema";

interface WordFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: WordStatus | "all";
  onStatusFilterChange: (value: WordStatus | "all") => void;
  sortBy: "newest" | "oldest" | "frequent" | "alphabetical";
  onSortByChange: (value: "newest" | "oldest" | "frequent" | "alphabetical") => void;
}

export function WordFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
}: WordFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search words..."
          className="pl-9 pr-9"
          data-testid="input-search-words"
        />
        {search && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange("")}
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => onStatusFilterChange("all")}
            data-testid="button-filter-all"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "new" ? "default" : "outline"}
            onClick={() => onStatusFilterChange("new")}
            data-testid="button-filter-new"
          >
            New
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "learning" ? "default" : "outline"}
            onClick={() => onStatusFilterChange("learning")}
            data-testid="button-filter-learning"
          >
            Learning
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "mastered" ? "default" : "outline"}
            onClick={() => onStatusFilterChange("mastered")}
            data-testid="button-filter-mastered"
          >
            Mastered
          </Button>
        </div>

        <div className="flex-1" />

        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as typeof sortBy)}>
          <SelectTrigger className="w-36" data-testid="select-sort">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="frequent">Most Frequent</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
