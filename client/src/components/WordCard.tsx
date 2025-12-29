import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ChevronDown, ChevronUp, Calendar, Hash, Target } from "lucide-react";
import type { Word } from "@shared/schema";
import { format } from "date-fns";

interface WordCardProps {
  word: Word;
}

export function WordCard({ word }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      onClick={() => setExpanded(!expanded)}
      data-testid={`card-word-${word.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold text-foreground truncate" data-testid={`text-word-${word.id}`}>
              {word.word}
            </span>
            <StatusBadge status={word.status} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {word.totalOccurrences}x
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">First seen</p>
                <p className="font-medium">{format(new Date(word.firstSeen), "MMM d, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Last seen</p>
                <p className="font-medium">{format(new Date(word.lastSeen), "MMM d, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Sessions</p>
                <p className="font-medium">{word.sessionsSeenCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Unlock progress</p>
                <p className="font-medium">{word.masteryCorrectCount}/10</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
