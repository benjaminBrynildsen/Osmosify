import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatBlockProps {
  value: number | string;
  label: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatBlock({ value, label, icon: Icon, className = "" }: StatBlockProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-3xl font-bold text-foreground" data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
}

export function StatsGrid({ children }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {children}
    </div>
  );
}
