import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Đang tải...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-1 items-center justify-center gap-2 text-text-muted", className)}>
      <Loader2 size={18} className="animate-spin text-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
