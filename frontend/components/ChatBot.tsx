"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatInputBar } from "@/components/ChatInputBar";
import { Button } from "@/components/ui/button";
import { useSpeechOutput } from "@/hooks/useSpeechOutput";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { api, NetworkError } from "@/lib/api";
import type { ChatResponse } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  needsClarification?: boolean;
  interactionId?: number;
}

const AUTO_SPEAK_KEY = "chat_auto_speak";

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Mình là chatbot hỗ trợ học tập. Em có thể **gõ** hoặc **bấm micro** để hỏi cô nhé.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_SPEAK_KEY) === "true";
  });
  const lastSpokenRef = useRef<number>(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { supported: ttsSupported, speaking, speakingId, highlightWordIndex, speak, stopSpeaking } =
    useSpeechOutput();

  useEffect(() => {
    localStorage.setItem(AUTO_SPEAK_KEY, String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    const syncOnline = () => setOffline(!navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (message: string) => {
    const text = message.trim();
    if (!text) return;

    setError("");
    setLastFailedMessage("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const response = await api.post<ChatResponse>("/api/v1/chat/chat", { message: text });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          needsClarification: response.needs_clarification,
          interactionId: response.interaction_id,
        },
      ]);
    } catch (err) {
      setInput(text);
      setLastFailedMessage(text);
      if (err instanceof NetworkError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Không gửi được tin nhắn.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const voice = useVoiceInput({
    onFinalText: (text) => {
      setInput(text);
      if (!loading) {
        void sendMessage(text);
      }
    },
    onInterimText: (text) => setInput(text),
  });

  useEffect(() => {
    if (!autoSpeak || !ttsSupported) return;

    const lastIndex = messages.length - 1;
    const last = messages[lastIndex];
    if (
      last?.role === "assistant" &&
      lastIndex > 0 &&
      lastIndex !== lastSpokenRef.current &&
      !loading
    ) {
      lastSpokenRef.current = lastIndex;
      void speak(last.content, lastIndex);
    }
  }, [messages, autoSpeak, ttsSupported, loading, speak]);

  async function handleSubmit() {
    const message = input.trim();
    if (!message || loading) return;
    await sendMessage(message);
  }

  async function handleRetry() {
    if (!lastFailedMessage || loading) return;
    await sendMessage(lastFailedMessage);
  }

  async function handleFeedback(interactionId: number, rating: number) {
    try {
      await api.post("/api/v1/chat/feedback", { interaction_id: interactionId, rating });
    } catch {
      // Phản hồi không bắt buộc
    }
  }

  function handleSpeak(content: string, messageIndex: number) {
    if (speaking && speakingId === messageIndex) {
      stopSpeaking();
    } else {
      void speak(content, messageIndex);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">
      <div className="shrink-0 border-b border-border bg-surface-raised px-4 py-2.5 sm:px-5">
        <p className="text-xs text-text-muted">
          Hỏi đáp học tập — không cần đăng nhập. Học sinh đăng nhập để lưu lịch sử theo session.
        </p>
      </div>

      {offline && (
        <p className="alert-warning">
          Mạng đang yếu hoặc mất kết nối. Tin nhắn có thể gửi chậm — em thử lại sau nhé.
        </p>
      )}

      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin sm:px-6 sm:py-5">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            clarification={message.needsClarification}
            messageId={index}
            interactionId={message.interactionId}
            speaking={speaking && speakingId === index}
            highlightWordIndex={speakingId === index ? highlightWordIndex : null}
            ttsSupported={ttsSupported}
            onSpeak={() => handleSpeak(message.content, index)}
            onFeedback={
              message.interactionId
                ? (rating) => handleFeedback(message.interactionId!, rating)
                : undefined
            }
          />
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-soft px-4 py-2 sm:gap-3 sm:px-6">
          <p className="text-sm text-red-600">{error}</p>
          {lastFailedMessage && (
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              Thử lại
            </Button>
          )}
        </div>
      )}

      <div className="shrink-0 border-t border-border bg-surface-raised px-4 py-3 sm:px-6">
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          loading={loading}
          disabled={offline}
          placeholder="Nhập câu hỏi hoặc bấm micro..."
          voiceSupported={voice.supported}
          voiceListening={voice.listening}
          voiceError={voice.error}
          onVoiceToggle={voice.toggleListening}
          autoSpeak={autoSpeak}
          onAutoSpeakChange={setAutoSpeak}
          autoSpeakSupported={ttsSupported}
        />
      </div>
    </div>
  );
}
