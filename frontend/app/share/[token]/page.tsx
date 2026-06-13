"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye } from "lucide-react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { StatusMessage } from "@/components/ui/StatusMessage";
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
    return (
      <PageContainer maxWidth="lg" className="flex items-center justify-center">
        <StatusMessage variant="error">{error}</StatusMessage>
      </PageContainer>
    );
  }

  if (!session) {
    return <LoadingState />;
  }

  return (
    <PageContainer maxWidth="lg">
      <div className="card mb-4 flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
          <Eye size={18} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text">{session.title}</h1>
          <p className="mt-0.5 text-xs text-text-muted">Session được chia sẻ (chỉ xem, không chat).</p>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        {session.messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}
        {session.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">Session chưa có tin nhắn.</p>
        )}
      </div>
    </PageContainer>
  );
}
