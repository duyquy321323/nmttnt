"use client";

import { FormEvent, useEffect, useState } from "react";

import { MarkdownMessage } from "@/components/MarkdownMessage";
import { api, NetworkError } from "@/lib/api";
import type { ChatResponse } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  needsClarification?: boolean;
  interactionId?: number;
}

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Mình là chatbot hỗ trợ học tập. Bạn có thể hỏi mình về nội dung tài liệu đã được giáo viên tải lên.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState("");

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

  async function sendMessage(message: string) {
    setError("");
    setLastFailedMessage("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await api.post<ChatResponse>("/api/v1/chat/chat", { message });
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
      setInput(message);
      setLastFailedMessage(message);
      if (err instanceof NetworkError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Không gửi được tin nhắn.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    await sendMessage(message);
  }

  async function handleRetry() {
    if (!lastFailedMessage || loading) return;
    setInput("");
    await sendMessage(lastFailedMessage);
  }

  async function handleFeedback(interactionId: number, rating: number) {
    try {
      await api.post("/api/v1/chat/feedback", { interaction_id: interactionId, rating });
    } catch {
      // Phản hồi không bắt buộc
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {offline && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Mạng đang yếu hoặc mất kết nối. Tin nhắn có thể gửi chậm — em thử lại sau nhé.
        </p>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-6" style={{ minHeight: "420px" }}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.needsClarification
                    ? "border border-amber-200 bg-amber-50 text-amber-950"
                    : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {message.role === "assistant" ? (
                <MarkdownMessage content={message.content} />
              ) : (
                message.content
              )}
              {message.role === "assistant" && message.interactionId && (
                <div className="mt-2 flex gap-2 border-t border-zinc-200/60 pt-2">
                  <button
                    type="button"
                    onClick={() => handleFeedback(message.interactionId!, 1)}
                    className="text-xs text-zinc-500 hover:text-green-600"
                  >
                    Hữu ích
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(message.interactionId!, -1)}
                    className="text-xs text-zinc-500 hover:text-red-600"
                  >
                    Chưa rõ
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-zinc-500">Đang trả lời...</div>}
      </div>

      {error && (
        <div className="flex items-center gap-3 px-6 pb-2">
          <p className="text-sm text-red-600">{error}</p>
          {lastFailedMessage && (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-zinc-200 p-4">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || offline}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Gửi
          </button>
        </div>
      </form>
    </div>
  );
}
