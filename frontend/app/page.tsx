"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ChatBot } from "@/components/ChatBot";
import { StudentChatWorkspace } from "@/components/StudentChatWorkspace";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === "student" && user.must_change_password) {
      router.replace("/student/change-password");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Đang tải...</div>;
  }

  if (user?.role === "student" && !user.must_change_password) {
    return <StudentChatWorkspace />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">Chatbot học tập</h1>
        <p className="mt-2 text-zinc-600">
          Hỏi đáp ngay mà không cần đăng nhập. Học sinh đăng nhập để lưu lịch sử chat theo session.
        </p>
      </div>
      <ChatBot />
    </div>
  );
}
