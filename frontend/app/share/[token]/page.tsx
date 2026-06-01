"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { MarkdownMessage } from "@/components/MarkdownMessage";
import { api, ApiError } from "@/lib/api";
import type { ChatSessionDetail } from "@/types";

export default function ShareSessionPage() {
  const params = useParams<{ token: string }>();
  const [session, setSession] = useState<ChatSessionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.token) return;
    api
      .get<ChatSessionDetail>(`/api/v1/share/${params.token}`)
      .then(setSession)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Không tải được session."),
      );
  }, [params.token]);

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-red-600">{error}</div>;
  }

  if (!session) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-500">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">{session.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Session được chia sẻ (chỉ xem, không chat).
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {session.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {message.role === "assistant" ? (
                <MarkdownMessage content={message.content} />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
