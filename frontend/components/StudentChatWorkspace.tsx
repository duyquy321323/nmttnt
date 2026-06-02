"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { MarkdownMessage } from "@/components/MarkdownMessage";
import { useRequireRole } from "@/context/AuthContext";
import { api, ApiError, NetworkError } from "@/lib/api";
import type { ChatResponse, ChatSessionDetail, ChatSessionItem, ShareLinkInfo } from "@/types";

const SIDEBAR_WIDTH = 300;
const MENU_RAIL_WIDTH = 56;

function MenuToggleIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-5 w-5 flex-col items-center justify-center">
      <span
        className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
          open ? "translate-y-0 rotate-45" : "-translate-y-1.5"
        }`}
      />
      <span
        className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
          open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
        }`}
      />
      <span
        className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
          open ? "translate-y-0 -rotate-45" : "translate-y-1.5"
        }`}
      />
    </span>
  );
}

export function StudentChatWorkspace() {
  const { user, loading } = useRequireRole("student");
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareInfo, setShareInfo] = useState<ShareLinkInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clarificationMessageIds, setClarificationMessageIds] = useState<Set<number>>(new Set());
  const [interactionByMessageId, setInteractionByMessageId] = useState<Record<number, number>>({});
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [offline, setOffline] = useState(false);

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
            share_url: `${window.location.origin}/share/${data.share_token}`,
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
    try {
      const created = await api.post<ChatSessionItem>(
        "/api/v1/student/sessions",
        { title: "Cuộc trò chuyện mới" },
        true,
      );
      await loadSessions(search);
      await loadSession(created.id);
      setSidebarOpen(true);
      localStorage.setItem("student_sidebar_open", "true");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tạo được session.");
    }
  }

  async function handleSelectSession(sessionId: number) {
    await loadSession(sessionId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
      localStorage.setItem("student_sidebar_open", "false");
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

  async function sendMessage(message: string) {
    if (!activeSession || !message.trim() || chatLoading) return;

    setError("");
    setLastFailedMessage("");
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

    try {
      const response = await api.post<
        ChatResponse & { message: ChatSessionDetail["messages"][number] }
      >(`/api/v1/student/sessions/${activeSession.id}/chat`, { message }, true);

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
      await loadSession(activeSession.id);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || chatLoading) return;
    setInput("");
    await sendMessage(message);
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
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Đang tải...</div>;
  }

  const sidebarPanel = (
    <div
      className="flex h-full flex-col border-r border-zinc-200 bg-zinc-50"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="border-b border-zinc-200 px-4 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Session của tôi</h2>
      </div>

      <div className="border-b border-zinc-200 p-4">
        <button
          type="button"
          onClick={handleCreateSession}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-transform hover:bg-blue-700 active:scale-[0.98]"
        >
          + Session mới
        </button>
        <form onSubmit={handleSearch} className="mt-3 flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm session..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-100">
            Tìm
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sessions.map((session, index) => (
          <div
            key={session.id}
            style={{ animationDelay: `${index * 40}ms` }}
            className={`session-item-enter mb-2 rounded-lg border p-3 transition-colors duration-200 ${
              activeSession?.id === session.id
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <button
              type="button"
              onClick={() => handleSelectSession(session.id)}
              className="w-full text-left"
            >
              <p className="truncate text-sm font-medium text-zinc-900">{session.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{session.message_count} tin nhắn</p>
            </button>
            <button
              type="button"
              onClick={() => handleDeleteSession(session.id)}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              Xóa
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="p-4 text-center text-sm text-zinc-500">Chưa có session nào.</p>
        )}
      </div>
    </div>
  );

  const sidebarStateClass = sidebarOpen ? "is-open" : "is-closed";

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu session"
          onClick={toggleSidebar}
          className="session-overlay fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar mobile — trượt đè lên chat */}
      <div
        className={`session-sidebar-mobile fixed z-30 md:hidden ${sidebarStateClass}`}
        style={{
          top: 65,
          left: MENU_RAIL_WIDTH,
          height: "calc(100vh - 65px)",
          width: SIDEBAR_WIDTH,
          pointerEvents: sidebarOpen ? "auto" : "none",
        }}
      >
        <div className="h-full shadow-xl">{sidebarPanel}</div>
      </div>

      <div
        className={`session-sidebar-grid h-[calc(100vh-65px)] w-full min-h-0 overflow-hidden bg-white ${sidebarStateClass}`}
      >
        {/* Menu rail — luôn sát trái body */}
        <div className="relative z-30 flex flex-col items-center border-r border-zinc-200 bg-white pt-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-2.5 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label={sidebarOpen ? "Đóng sidebar session" : "Mở sidebar session"}
          >
            <MenuToggleIcon open={sidebarOpen} />
          </button>
        </div>

        {/* Sidebar desktop — cột grid co/giãn + trượt nội dung */}
        <div className="hidden min-w-0 overflow-hidden md:block">
          <div className={`session-sidebar-slide ${sidebarStateClass}`} style={{ width: SIDEBAR_WIDTH }}>
            {sidebarPanel}
          </div>
        </div>

        {/* Chat — full phần còn lại của body */}
        <section className="flex min-w-0 flex-1 min-h-0 flex-col bg-white">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3">
          {activeSession ? (
            <>
              <h2 className="min-w-0 flex-1 truncate font-semibold text-zinc-900">
                {activeSession.title}
              </h2>
              <div className="flex shrink-0 gap-2">
                {shareInfo?.is_shared ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(shareInfo.share_url)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      onClick={handleUnshare}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
                    >
                      Tắt chia sẻ
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
                  >
                    Chia sẻ
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Chọn hoặc tạo session để bắt đầu chat</p>
          )}
        </div>

        {activeSession ? (
          <>
            {offline && (
              <p className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-800">
                Mạng yếu — em có thể thử gửi lại nếu tin nhắn không đi.
              </p>
            )}
            <div className="mx-auto w-full max-w-4xl flex-1 min-h-0 space-y-4 overflow-y-auto px-5 py-4">
              {activeSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : clarificationMessageIds.has(message.id)
                          ? "border border-amber-200 bg-amber-50 text-amber-950"
                          : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      message.content
                    )}
                    {message.role === "assistant" && interactionByMessageId[message.id] && (
                      <div className="mt-2 flex gap-2 border-t border-zinc-200/60 pt-2">
                        <button
                          type="button"
                          onClick={() => handleFeedback(message.id, 1)}
                          className="text-xs text-zinc-500 hover:text-green-600"
                        >
                          Hữu ích
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(message.id, -1)}
                          className="text-xs text-zinc-500 hover:text-red-600"
                        >
                          Chưa rõ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && <p className="text-sm text-zinc-500">Đang trả lời...</p>}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-zinc-200 px-5 py-4">
              <div className="mx-auto flex w-full max-w-4xl gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Nhập câu hỏi..."
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  Gửi
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-zinc-500">
            <p>Chưa chọn session nào.</p>
            <button
              type="button"
              onClick={handleCreateSession}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Tạo session mới
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 border-t border-zinc-200 px-5 py-2">
            <p className="text-sm text-red-600">{error}</p>
            {lastFailedMessage && (
              <button
                type="button"
                onClick={handleRetrySend}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50"
              >
                Thử lại
              </button>
            )}
          </div>
        )}
        </section>
      </div>
    </>
  );
}
