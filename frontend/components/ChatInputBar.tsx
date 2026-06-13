"use client";

import { FormEvent, KeyboardEvent } from "react";
import { Mic, Send } from "lucide-react";

import { VoiceMicButton } from "@/components/VoiceMicButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  voiceSupported?: boolean;
  voiceListening?: boolean;
  voiceError?: string;
  onVoiceToggle?: () => void;
  autoSpeak?: boolean;
  onAutoSpeakChange?: (enabled: boolean) => void;
  autoSpeakSupported?: boolean;
}

export function ChatInputBar({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  placeholder = "Nhập câu hỏi...",
  voiceSupported,
  voiceListening,
  voiceError,
  onVoiceToggle,
  autoSpeak,
  onAutoSpeakChange,
  autoSpeakSupported,
}: ChatInputBarProps) {
  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!value.trim() || loading || disabled) return;
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div>
      {(voiceSupported || autoSpeakSupported) && (
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          {voiceSupported && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-light px-2.5 py-0.5 font-medium text-brand-text">
              <Mic size={12} />
              Nói câu hỏi bằng giọng
            </span>
          )}
          {autoSpeakSupported && onAutoSpeakChange && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-speak"
                checked={autoSpeak ?? false}
                onCheckedChange={(checked) => onAutoSpeakChange(checked === true)}
              />
              <Label htmlFor="auto-speak" className="cursor-pointer text-xs font-normal text-text-muted">
                Tự đọc câu trả lời
              </Label>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {voiceSupported && onVoiceToggle && (
          <VoiceMicButton
            listening={voiceListening ?? false}
            disabled={loading || disabled}
            onClick={onVoiceToggle}
          />
        )}
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voiceListening ? "Đang nghe em nói..." : placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "min-h-[44px] max-h-32 min-w-0 flex-1 resize-none py-3",
            disabled && "opacity-60",
          )}
        />
        <Button
          type="submit"
          disabled={loading || disabled || !value.trim()}
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="Gửi tin nhắn"
        >
          <Send size={16} />
        </Button>
      </form>

      {voiceError && <p className="mt-2 text-xs text-amber-700">{voiceError}</p>}
    </div>
  );
}
