"use client";

import { FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatSessionDetail, ChatSessionItem } from "@/types";

interface StudentSessionPanelProps {
  sessions: ChatSessionItem[];
  activeSession: ChatSessionDetail | null;
  search: string;
  creating?: boolean;
  onSearchChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onCreateSession: () => void;
  onSelectSession: (sessionId: number) => void;
  onDeleteSession: (sessionId: number) => void;
}

export function StudentSessionPanel({
  sessions,
  activeSession,
  search,
  creating = false,
  onSearchChange,
  onSearch,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
}: StudentSessionPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-sidebar-border p-3">
        <h2 className="section-heading mb-2">Session của tôi</h2>
        <Button type="button" onClick={onCreateSession} disabled={creating} className="w-full">
          <Plus size={16} />
          {creating ? "Đang tạo..." : "Session mới"}
        </Button>
        <form onSubmit={onSearch} className="mt-2 flex gap-2">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm session..."
            className="flex-1 py-2 text-xs"
          />
          <Button type="submit" variant="outline" size="sm" className="shrink-0">
            Tìm
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {sessions.map((session, index) => (
          <div
            key={session.id}
            style={{ animationDelay: `${index * 40}ms` }}
            className={cn(
              "session-item-enter card mb-2 p-2.5 transition-all",
              activeSession?.id === session.id
                ? "border-brand ring-1 ring-brand/30 bg-brand-light"
                : "hover:border-brand-border",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectSession(session.id)}
              className="w-full text-left"
            >
              <p className="truncate text-xs font-medium text-text">{session.title}</p>
              <p className="mt-0.5 text-[10px] text-text-muted">{session.message_count} tin nhắn</p>
            </button>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => onDeleteSession(session.id)}
              className="mt-1.5 h-auto p-0 text-[10px] text-destructive hover:no-underline"
            >
              Xóa
            </Button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="py-4 text-center text-xs text-text-muted">Chưa có session.</p>
        )}
      </div>
    </div>
  );
}
