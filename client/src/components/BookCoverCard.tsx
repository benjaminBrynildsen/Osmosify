import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Star, Lock, Sparkles, Users } from "lucide-react";
import type { Book } from "@shared/schema";

interface BookCoverCardProps {
  book: Book;
  readinessPercent: number;
  masteredCount: number;
  totalCount: number;
  onClick: () => void;
}

const COVER_CACHE: Record<string, string | null> = {};

async function fetchCoverUrl(title: string, author?: string): Promise<string | null> {
  const cacheKey = `${title}-${author || ""}`;
  if (cacheKey in COVER_CACHE) {
    return COVER_CACHE[cacheKey];
  }
  
  try {
    const params = new URLSearchParams({ title });
    if (author) params.append("author", author);
    
    const response = await fetch(`/api/open-library/cover?${params}`);
    if (response.ok) {
      const data = await response.json();
      COVER_CACHE[cacheKey] = data.coverUrl;
      return data.coverUrl;
    }
  } catch (error) {
    console.error("Error fetching cover:", error);
  }
  
  COVER_CACHE[cacheKey] = null;
  return null;
}

export function BookCoverCard({
  book,
  readinessPercent,
  masteredCount,
  totalCount,
  onClick,
}: BookCoverCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(
    book.coverImageUrl || book.customCoverUrl || null
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!coverUrl && !imageError) {
      fetchCoverUrl(book.title, book.author || undefined).then(url => {
        if (url) setCoverUrl(url);
      });
    }
  }, [book.title, book.author, coverUrl, imageError]);

  const isReady = readinessPercent >= 90;
  const isAlmostReady = readinessPercent >= 70;
  const wordsToUnlock = totalCount - masteredCount;

  const getStatusColor = () => {
    if (isReady) return "bg-green-500";
    if (isAlmostReady) return "bg-amber-500";
    return "bg-primary";
  };

  const getCardBorder = () => {
    if (isReady) return "ring-2 ring-green-500 ring-offset-2 ring-offset-background";
    if (isAlmostReady) return "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background";
    return "";
  };

  return (
    <Card
      className={`cursor-pointer hover-elevate active-elevate-2 overflow-visible ${getCardBorder()}`}
      onClick={onClick}
      data-testid={`card-book-cover-${book.id}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-md bg-muted">
        {coverUrl && !imageError ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-center text-muted-foreground line-clamp-2">
              {book.title}
            </p>
          </div>
        )}
        
        {isReady && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white gap-1">
              <Star className="h-3 w-3" />
              Ready
            </Badge>
          </div>
        )}
        
        {!isReady && wordsToUnlock > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center gap-1 text-white text-xs">
              <Lock className="h-3 w-3" />
              <span>Unlock {wordsToUnlock} words</span>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 leading-tight mb-1" title={book.title}>
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {book.author}
          </p>
        )}
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{readinessPercent}% ready</span>
            <span className="text-muted-foreground">{masteredCount}/{totalCount}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getStatusColor()}`}
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 mt-2">
          {book.gradeLevel && (
            <Badge variant="outline" className="text-xs">
              {book.gradeLevel}
            </Badge>
          )}
          {book.unlockCount >= 1000 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              {book.unlockCount >= 1000000
                ? `${(book.unlockCount / 1000000).toFixed(1)}M`
                : `${(book.unlockCount / 1000).toFixed(0)}K`}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
