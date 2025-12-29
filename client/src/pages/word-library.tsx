import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { WordCard } from "@/components/WordCard";
import { WordFilters } from "@/components/WordFilters";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingSpinner";
import type { Child, Word, WordStatus } from "@shared/schema";

export default function WordLibrary() {
  const params = useParams<{ id: string }>();
  const childId = params.id;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WordStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "frequent" | "alphabetical">("newest");

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const { data: words, isLoading } = useQuery<Word[]>({
    queryKey: ["/api/children", childId, "words"],
    enabled: !!childId,
  });

  const filteredWords = useMemo(() => {
    if (!words) return [];

    let result = [...words];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((w) => w.word.toLowerCase().includes(searchLower));
    }

    if (statusFilter !== "all") {
      result = result.filter((w) => w.status === statusFilter);
    }

    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime());
        break;
      case "frequent":
        result.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
        break;
      case "alphabetical":
        result.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }

    return result;
  }, [words, search, statusFilter, sortBy]);

  if (isLoading) {
    return <LoadingScreen message="Loading word library..." />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title="Your Child's Word Library"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-4">
        <WordFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredWords.length} {filteredWords.length === 1 ? "word" : "words"}</span>
          <span>Total: {words?.length || 0}</span>
        </div>

        {filteredWords.length > 0 ? (
          <div className="space-y-2" data-testid="word-library-list">
            {filteredWords.map((word) => (
              <WordCard key={word.id} word={word} />
            ))}
          </div>
        ) : (
          <EmptyState
            type={search ? "search" : "words"}
            title={search ? "No words found" : "No words yet"}
            description={
              search
                ? "Try a different search term."
                : "Words will appear here after uploading reading sessions."
            }
          />
        )}
      </main>
    </div>
  );
}
