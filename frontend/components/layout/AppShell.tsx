"use client";

import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSharePage = pathname.startsWith("/share/");
  const isStudentChat = user?.role === "student" && pathname === "/";

  if (isSharePage) {
    return (
      <div className="flex h-full flex-col bg-surface-raised">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <BookOpen size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Edu Chatbot</p>
            <p className="text-[10px] text-text-muted">Session được chia sẻ</p>
          </div>
        </header>
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  if (isStudentChat) {
    return (
      <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-surface-raised">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-surface-raised">
      <Sidebar />
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
