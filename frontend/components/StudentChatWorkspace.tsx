"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link2, Menu, Plus, Share2 } from "lucide-react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatInputBar } from "@/components/ChatInputBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { StudentSessionPanel } from "@/components/student/StudentSessionPanel";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/LoadingState";
import { useRequireRole } from "@/context/AuthContext";
import { useSpeechOutput } from "@/hooks/useSpeechOutput";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { api, ApiError, NetworkError } from "@/lib/api";
import { appOriginUrl } from "@/lib/base-path";
import type { ChatResponse, ChatSessionDetail, ChatSessionItem, ShareLinkInfo } from "@/types";

const AUTO_SPEAK_KEY = "student_auto_speak";

export function StudentChatWorkspace() {
  const { user, loading } = useRequireRole("student");
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareInfo, setShareInfo] = useState<ShareLinkInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [clarificationMessageIds, setClarificationMessageIds] = useState<Set<number>>(new Set());
  const [interactionByMessageId, setInteractionByMessageId] = useState<Record<number, number>>({});
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [offline, setOffline] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_SPEAK_KEY) === "true";
  });
  const lastSpokenMessageIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { supported: ttsSupported, speaking, speakingId, highlightWordIndex, speak, stopSpeaking } =
    useSpeechOutput();

  useEffect(() => {
    localStorage.setItem(AUTO_SPEAK_KEY, String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    const saved = localStorage.getItem("student_sidebar_open");
    if (saved !== null) {
      setSidebarOpen(saved === "true");
    }
  }, []);

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
  }, [activeSession?.messages, chatLoading]);

  const closeMobileSidebar = useCallback(() => {
    setSidebarOpen(false);
    localStorage.setItem("student_sidebar_open", "false");
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("student_sidebar_open", String(next));
      return next;
    });
  }, []);

  const loadSessions = useCallback(async (query?: string) => {
    const path = query?.trim()
      ? `/api/v1/student/sessions?q=${encodeURIComponent(query.trim())}`
      : "/api/v1/student/sessions";
    const data = await api.get<ChatSessionItem[]>(path, true);
    setSessions(data);
  }, []);

  const loadSession = useCallback(async (sessionId: number) => {
    const data = await api.get<ChatSessionDetail>(`/api/v1/student/sessions/${sessionId}`, true);
    setActiveSession(data);
    setShareInfo(
      data.is_shared && data.share_token
        ? {
            share_token: data.share_token,
            share_url: appOriginUrl(`/share/${data.share_token}/`),
            is_shared: true,
          }
        : null,
    );
  }, []);

  useEffect(() => {
    if (!loading && user?.role === "student" && !user.must_change_password) {
      loadSessions().catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được session."),
      );
    }
  }, [loading, user, loadSessions]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await loadSessions(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tìm kiếm thất bại.");
    }
  }

  async function handleCreateSession() {
    setError("");
    setCreatingSession(true);
    try {
      const created = await api.post<ChatSessionItem>(
        "/api/v1/student/sessions",
        { title: "Cuộc trò chuyện mới" },
        true,
      );
      await loadSessions(search);
      await loadSession(created.id);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
        localStorage.setItem("student_sidebar_open", "true");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tạo được session.");
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleSelectSession(sessionId: number) {
    await loadSession(sessionId);
    if (window.innerWidth < 768) {
      closeMobileSidebar();
    }
  }

  async function handleDeleteSession(sessionId: number) {
    if (!confirm("Xóa session này?")) return;
    setError("");
    try {
      await api.delete(`/api/v1/student/sessions/${sessionId}`, true);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setShareInfo(null);
      }
      await loadSessions(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không xóa được session.");
    }
  }

  async function handleShare() {
    if (!activeSession) return;
    setError("");
    try {
      const info = await api.post<ShareLinkInfo>(
        `/api/v1/student/sessions/${activeSession.id}/share`,
        {},
        true,
      );
      setShareInfo(info);
      await navigator.clipboard.writeText(info.share_url);
      alert("Đã bật chia sẻ và copy link vào clipboard.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không chia sẻ được session.");
    }
  }

  async function handleUnshare() {
    if (!activeSession) return;
    setError("");
    try {
      await api.delete<ShareLinkInfo>(
        `/api/v1/student/sessions/${activeSession.id}/share`,
        true,
      );
      setShareInfo(null);
      await loadSession(activeSession.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tắt chia sẻ được.");
    }
  }

  const sendMessage = useCallback(
    async (message: string) => {
      if (!activeSession || !message.trim() || chatLoading) return;

      setError("");
      setLastFailedMessage("");
      setInput("");
      setChatLoading(true);

      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: Date.now(),
                  role: "user",
                  content: message,
                  from_rag: false,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : prev,
      );

      const sessionId = activeSession.id;

      try {
        const response = await api.post<
          ChatResponse & { message: ChatSessionDetail["messages"][number] }
        >(`/api/v1/student/sessions/${sessionId}/chat`, { message }, true);

        if (response.needs_clarification) {
          setClarificationMessageIds((prev) => new Set(prev).add(response.message.id));
        }
        if (response.interaction_id) {
          setInteractionByMessageId((prev) => ({
            ...prev,
            [response.message.id]: response.interaction_id!,
          }));
        }

        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, response.message],
              }
            : prev,
        );
        await loadSessions(search);
      } catch (err) {
        setInput(message);
        setLastFailedMessage(message);
        if (err instanceof NetworkError) {
          setError(err.message);
        } else {
          setError(err instanceof ApiError ? err.message : "Không gửi được tin nhắn.");
        }
        await loadSession(sessionId);
      } finally {
        setChatLoading(false);
      }
    },
    [activeSession, chatLoading, loadSession, loadSessions, search],
  );

  const voice = useVoiceInput({
    onFinalText: (text) => {
      setInput(text);
      if (!chatLoading && activeSession) {
        void sendMessage(text);
      }
    },
    onInterimText: (text) => setInput(text),
  });

  useEffect(() => {
    if (!activeSession) {
      lastSpokenMessageIdRef.current = null;
      return;
    }

    const lastAssistant = [...activeSession.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    lastSpokenMessageIdRef.current = lastAssistant?.id ?? null;
  }, [activeSession?.id]);

  useEffect(() => {
    if (!autoSpeak || !ttsSupported || !activeSession || chatLoading) return;

    const lastMessage = activeSession.messages[activeSession.messages.length - 1];
    if (lastMessage?.role !== "assistant") return;
    if (lastMessage.id === lastSpokenMessageIdRef.current) return;

    lastSpokenMessageIdRef.current = lastMessage.id;
    void speak(lastMessage.content, lastMessage.id);
  }, [activeSession?.messages, autoSpeak, ttsSupported, chatLoading, speak, activeSession]);

  async function handleSendMessage() {
    const message = input.trim();
    if (!message || chatLoading) return;
    await sendMessage(message);
  }

  function handleSpeak(content: string, messageId: number) {
    if (speaking && speakingId === messageId) {
      stopSpeaking();
    } else {
      void speak(content, messageId);
    }
  }

  async function handleRetrySend() {
    if (!lastFailedMessage || chatLoading) return;
    const message = lastFailedMessage;
    setLastFailedMessage("");
    setInput("");
    await sendMessage(message);
  }

  async function handleFeedback(messageId: number, rating: number) {
    const interactionId = interactionByMessageId[messageId];
    if (!interactionId) return;
    try {
      await api.post("/api/v1/chat/feedback", { interaction_id: interactionId, rating }, true);
    } catch {
      // Phản hồi không bắt buộc
    }
  }

  if (loading || !user) {
    return <LoadingState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <Sidebar
        extraContent={
          <StudentSessionPanel
            sessions={sessions}
            activeSession={activeSession}
            search={search}
            creating={creatingSession}
            onSearchChange={setSearch}
            onSearch={handleSearch}
            onCreateSession={() => void handleCreateSession()}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
          />
        }
        mobileOpen={sidebarOpen}
        onMobileClose={closeMobileSidebar}
      />

      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-raised px-4 py-2.5 sm:gap-3 sm:px-5">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-text-strong transition-colors hover:bg-surface-inset md:hidden"
            aria-label="Mở menu"
          >
            <Menu size={18} />
          </button>

          {activeSession ? (
            <>
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                {activeSession.title}
              </h2>
              <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
                {shareInfo?.is_shared ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(shareInfo.share_url)}
                    >
                      <Link2 size={14} />
                      Copy
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleUnshare}>
                      Tắt chia sẻ
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={handleShare}>
                    <Share2 size={14} />
                    Chia sẻ
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted">Chọn hoặc tạo session để bắt đầu chat</p>
          )}
        </div>

        {activeSession ? (
          <>
            {offline && (
              <p className="alert-warning">
                Mạng yếu — em có thể thử gửi lại nếu tin nhắn không đi.
              </p>
            )}
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin sm:px-6 sm:py-5">
              {activeSession.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  clarification={clarificationMessageIds.has(message.id)}
                  messageId={message.id}
                  interactionId={interactionByMessageId[message.id]}
                  speaking={speaking && speakingId === message.id}
                  highlightWordIndex={speakingId === message.id ? highlightWordIndex : null}
                  ttsSupported={ttsSupported}
                  onSpeak={() => handleSpeak(message.content, message.id)}
                  onFeedback={
                    interactionByMessageId[message.id]
                      ? (rating) => handleFeedback(message.id, rating)
                      : undefined
                  }
                />
              ))}
              {chatLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-soft px-4 py-2 sm:gap-3 sm:px-6">
                <p className="text-sm text-red-600">{error}</p>
                {lastFailedMessage && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRetrySend}>
                    Thử lại
                  </Button>
                )}
              </div>
            )}

            <div className="shrink-0 border-t border-border bg-surface-raised px-4 py-3 sm:px-6">
              <ChatInputBar
                value={input}
                onChange={setInput}
                onSubmit={handleSendMessage}
                loading={chatLoading}
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
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-text-muted sm:px-6">
            {error && (
              <p className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-inset">
              <Plus size={24} className="text-text-faint" />
            </div>
            <p className="text-sm">Chưa chọn session nào.</p>
            <Button
              type="button"
              onClick={() => void handleCreateSession()}
              disabled={creatingSession}
            >
              {creatingSession ? "Đang tạo..." : "Tạo session mới"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
