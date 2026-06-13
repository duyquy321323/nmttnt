"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";

export default function StudentChangePasswordPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      await api.post(
        "/api/v1/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        true,
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đổi mật khẩu thành công.");
      await refreshUser();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không đổi được mật khẩu.");
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!user || user.role !== "student") {
    return (
      <PageContainer maxWidth="md">
        <p className="text-sm text-text-muted">Chỉ học sinh mới truy cập trang này.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md" className="flex items-center justify-center">
      <div className="card w-full p-5 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <KeyRound size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">Đổi mật khẩu</h1>
            <p className="text-xs text-text-muted">Học sinh</p>
          </div>
        </div>

        {user.must_change_password && (
          <div className="alert-info mb-6">
            Bạn cần đổi mật khẩu trước khi sử dụng chat có lưu lịch sử.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Mật khẩu hiện tại" htmlFor="current-password">
            <Input
              id="current-password"
              type="password"
              placeholder="Mật khẩu hiện tại"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Mật khẩu mới" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
            />
          </FormField>
          <FormField label="Xác nhận mật khẩu mới" htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </FormField>

          {message && <StatusMessage>{message}</StatusMessage>}
          {error && <StatusMessage variant="error">{error}</StatusMessage>}

          <Button type="submit" className="w-full py-3">
            Lưu mật khẩu mới
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
