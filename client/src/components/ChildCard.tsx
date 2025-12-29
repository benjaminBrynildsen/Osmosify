import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, ChevronRight, Settings } from "lucide-react";
import type { Child } from "@shared/schema";
import { useLocation } from "wouter";

interface ChildCardProps {
  child: Child;
  wordCount?: number;
  onSettings?: () => void;
}

export function ChildCard({ child, wordCount = 0, onSettings }: ChildCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className="group hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={() => setLocation(`/child/${child.id}`)}
      data-testid={`card-child-${child.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-foreground" data-testid={`text-child-name-${child.id}`}>
                {child.name}
              </h3>
              {child.gradeLevel && (
                <Badge variant="secondary" className="w-fit text-xs">
                  {child.gradeLevel}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span data-testid={`text-word-count-${child.id}`}>{wordCount} words learned</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onSettings && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettings();
                }}
                data-testid={`button-settings-${child.id}`}
                aria-label="Child settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
