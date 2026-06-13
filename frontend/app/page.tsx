"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ChatBot } from "@/components/ChatBot";
import { StudentChatWorkspace } from "@/components/StudentChatWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    if (user.role === "student" && user.must_change_password) {
      router.replace("/student/change-password");
      return;
    }
    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }
    if (user.role === "teacher") {
      router.replace(
        user.must_change_password ? "/teacher/change-password" : "/teacher/documents",
      );
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingState />;
  }

  if (user?.role === "student" && !user.must_change_password) {
    return <StudentChatWorkspace />;
  }

  if (user?.role === "admin" || user?.role === "teacher") {
    return <LoadingState label="Đang chuyển hướng..." />;
  }

  return <ChatBot />;
}
