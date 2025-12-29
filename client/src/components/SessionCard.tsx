import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, FileText, ChevronRight } from "lucide-react";
import type { ReadingSession } from "@shared/schema";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface SessionCardProps {
  session: ReadingSession;
}

export function SessionCard({ session }: SessionCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className="group hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={() => setLocation(`/session/${session.id}`)}
      data-testid={`card-session-${session.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate" data-testid={`text-session-title-${session.id}`}>
                {session.bookTitle || "Reading Session"}
              </h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {session.newWordsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {session.newWordsCount} new words
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {session.totalWordsCount} total
                </Badge>
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
