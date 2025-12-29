import { BookOpen, Users, FileText, Search } from "lucide-react";

interface EmptyStateProps {
  type: "children" | "sessions" | "words" | "search";
  title: string;
  description: string;
}

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const icons = {
    children: Users,
    sessions: FileText,
    words: BookOpen,
    search: Search,
  };

  const Icon = icons[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" data-testid={`empty-state-${type}`}>
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2 text-center">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs">{description}</p>
    </div>
  );
}
