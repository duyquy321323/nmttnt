"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: Array<"admin" | "teacher" | "student" | "guest">;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Chatbot", icon: MessageSquare, roles: ["guest", "student"] },
  { href: "/login", label: "Đăng nhập", icon: LogIn, roles: ["guest"] },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/admin/teachers", label: "Giáo viên", icon: Users, roles: ["admin"] },
  { href: "/admin/students", label: "Học sinh", icon: GraduationCap, roles: ["admin"] },
  { href: "/teacher/documents", label: "Tài liệu", icon: FileText, roles: ["teacher"] },
  { href: "/teacher/analytics", label: "Giám sát", icon: BarChart3, roles: ["teacher"] },
  { href: "/teacher/change-password", label: "Đổi mật khẩu", icon: KeyRound, roles: ["teacher"] },
  { href: "/student/change-password", label: "Đổi mật khẩu", icon: KeyRound, roles: ["student"] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị",
  teacher: "Giáo viên",
  student: "Học sinh",
};

interface SidebarProps {
  /** Nội dung thêm (vd. danh sách session học sinh) — nằm dưới nav, trên footer */
  extraContent?: React.ReactNode;
  /** Drawer mobile: đang mở */
  mobileOpen?: boolean;
  /** Drawer mobile: đóng sidebar */
  onMobileClose?: () => void;
}

export function Sidebar({ extraContent, mobileOpen = true, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = user?.role ?? "guest";
  const isMobileDrawer = onMobileClose !== undefined;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles?.includes(role));

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {isMobileDrawer && mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onMobileClose}
          className="session-overlay fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        className={cn(
          "flex h-full w-[min(18rem,85vw)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:w-52",
          isMobileDrawer &&
            "fixed inset-y-0 left-0 z-50 shadow-xl transition-transform duration-300 ease-out md:relative md:translate-x-0 md:shadow-none",
          isMobileDrawer && !mobileOpen && "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white select-none">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-text">Edu Chatbot</p>
            <p className="text-[10px] leading-tight text-text-muted">Hỗ trợ học tập RAG</p>
          </div>
          {isMobileDrawer && (
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-lg p-1.5 text-text-muted hover:bg-sidebar-hover md:hidden"
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className={cn("flex shrink-0 flex-col py-2", !extraContent && "flex-1")}>
          {visibleItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (isMobileDrawer && onMobileClose) onMobileClose();
              }}
              className={cn(
                "nav-item",
                isActive(href) ? "nav-item-active" : "nav-item-inactive",
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {extraContent && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-sidebar-border">
            {extraContent}
          </div>
        )}

        {user && (
          <div className="shrink-0 border-t border-sidebar-border p-4">
            <p className="truncate text-xs font-medium text-text-strong">
              {user.full_name ?? user.username}
            </p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
            <Button type="button" variant="outline" onClick={logout} className="mt-3 w-full">
              <LogOut size={14} />
              Đăng xuất
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
