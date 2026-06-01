"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path ? "text-blue-600 font-semibold" : "text-zinc-600 hover:text-zinc-900";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-zinc-900">
          Edu Chatbot
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className={isActive("/")}>
            Chatbot
          </Link>

          {!user && (
            <Link href="/login" className={isActive("/login")}>
              Đăng nhập
            </Link>
          )}

          {user?.role === "admin" && (
            <>
              <Link href="/admin/teachers" className={isActive("/admin/teachers")}>
                Giáo viên
              </Link>
              <Link href="/admin/students" className={isActive("/admin/students")}>
                Học sinh
              </Link>
            </>
          )}

          {user?.role === "student" && (
            <Link
              href="/student/change-password"
              className={isActive("/student/change-password")}
            >
              Đổi mật khẩu
            </Link>
          )}

          {user?.role === "teacher" && (
            <>
              <Link href="/teacher/documents" className={isActive("/teacher/documents")}>
                Quản lý tài liệu
              </Link>
              <Link href="/teacher/analytics" className={isActive("/teacher/analytics")}>
                Giám sát
              </Link>
              <Link
                href="/teacher/change-password"
                className={isActive("/teacher/change-password")}
              >
                Đổi mật khẩu
              </Link>
            </>
          )}

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">
                {user.full_name ?? user.username} ({user.role})
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
