"use client";

import { Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface VoiceMicButtonProps {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}

export function VoiceMicButton({
  listening,
  disabled,
  onClick,
  title = "Nói câu hỏi",
}: VoiceMicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={listening ? "Dừng ghi âm" : "Bắt đầu nói"}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50",
        listening
          ? "border-red-300 bg-red-50 text-red-600"
          : "border-border bg-surface text-text-strong hover:bg-surface-inset",
      )}
    >
      {listening && (
        <span className="absolute inset-0 animate-ping rounded-xl border border-red-300 opacity-40" />
      )}
      {listening ? <MicOff size={18} className="relative" /> : <Mic size={18} className="relative" />}
    </button>
  );
}
