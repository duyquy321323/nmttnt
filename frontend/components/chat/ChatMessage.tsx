"use client";

import { Bot, User } from "lucide-react";

import { MarkdownMessage } from "@/components/MarkdownMessage";
import { SpeakButton } from "@/components/SpeakButton";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  clarification?: boolean;
  messageId?: string | number;
  interactionId?: number;
  speaking?: boolean;
  highlightWordIndex?: number | null;
  ttsSupported?: boolean;
  onSpeak?: () => void;
  onFeedback?: (rating: number) => void;
}

export function ChatMessage({
  role,
  content,
  clarification,
  messageId,
  interactionId,
  speaking,
  highlightWordIndex,
  ttsSupported,
  onSpeak,
  onFeedback,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-inset text-text-muted">
          <Bot size={14} />
        </div>
      )}

      <div
        className={cn(
          isUser
            ? "bubble-user"
            : clarification
              ? "bubble-clarification"
              : "bubble-bot",
        )}
      >
        {isUser ? (
          content
        ) : (
          <MarkdownMessage
            content={content}
            activeWordIndex={speaking ? (highlightWordIndex ?? null) : null}
          />
        )}
        {!isUser && (ttsSupported || interactionId) && (
          <div className="mt-2 flex flex-wrap gap-3 border-t border-border/60 pt-2">
            {ttsSupported && onSpeak && (
              <SpeakButton active={speaking} onClick={onSpeak} />
            )}
            {interactionId && onFeedback && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(1)}
                  className="text-xs text-text-faint transition-colors hover:text-green-600"
                >
                  Hữu ích
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(-1)}
                  className="text-xs text-text-faint transition-colors hover:text-red-600"
                >
                  Chưa rõ
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <User size={14} />
        </div>
      )}
    </div>
  );
}
