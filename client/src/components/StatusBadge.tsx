import { Badge } from "@/components/ui/badge";
import type { WordStatus } from "@shared/schema";
import { Sparkles, BookOpen, Unlock } from "lucide-react";

interface StatusBadgeProps {
  status: WordStatus;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = {
    new: {
      label: "New",
      variant: "default" as const,
      icon: Sparkles,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    learning: {
      label: "Learning",
      variant: "secondary" as const,
      icon: BookOpen,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    mastered: {
      label: "Unlocked",
      variant: "default" as const,
      icon: Unlock,
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge
      variant="outline"
      className={`${className} ${size === "sm" ? "text-xs px-2 py-0.5" : "px-3 py-1"} font-medium gap-1`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </Badge>
  );
}
