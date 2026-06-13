"use client";

import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpeakButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}

export function SpeakButton({
  active,
  disabled,
  onClick,
  label = "Nghe cô đọc",
}: SpeakButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 text-xs transition-colors hover:underline",
        active ? "text-brand" : "text-text-faint hover:text-brand",
      )}
    >
      {active ? <VolumeX size={12} /> : <Volume2 size={12} />}
      {active ? "Đang đọc..." : label}
    </button>
  );
}
