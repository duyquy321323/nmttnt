"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/context/AuthContext";

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/login": { title: "Đăng nhập" },
  "/admin": { title: "Dashboard", subtitle: "Quản trị" },
  "/admin/teachers": { title: "Giáo viên", subtitle: "Quản trị" },
  "/admin/students": { title: "Học sinh", subtitle: "Quản trị" },
  "/teacher/documents": { title: "Tài liệu", subtitle: "Giáo viên" },
  "/teacher/analytics": { title: "Giám sát", subtitle: "Giáo viên" },
  "/teacher/change-password": { title: "Đổi mật khẩu", subtitle: "Giáo viên" },
  "/student/change-password": { title: "Đổi mật khẩu", subtitle: "Học sinh" },
  "/": { title: "Chatbot", subtitle: "Hỗ trợ học tập" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSharePage = pathname.startsWith("/share/");
  const isStudentChat = user?.role === "student" && pathname === "/";
  const pageMeta = PAGE_TITLES[pathname] ?? { title: "Edu Chatbot" };

  if (isSharePage) {
    return (
      <div className="flex h-full flex-col bg-surface-raised">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">Edu Chatbot</p>
            <p className="text-[10px] text-text-muted">Session được chia sẻ</p>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
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
    <div className="flex h-full min-h-0 bg-surface-raised">
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobileTopBar
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
