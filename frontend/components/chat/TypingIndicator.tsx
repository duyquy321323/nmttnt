"use client";

import { Loader2 } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <Loader2 size={16} className="animate-spin text-brand" />
      <span>Đang trả lời</span>
      <span className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-text-faint"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
