"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

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
    return <div className="p-8 text-zinc-500">Đang tải...</div>;
  }

  if (!user || user.role !== "student") {
    return <div className="p-8 text-zinc-500">Chỉ học sinh mới truy cập trang này.</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">Đổi mật khẩu</h1>
        {user.must_change_password && (
          <p className="mt-2 text-sm text-amber-600">
            Bạn cần đổi mật khẩu trước khi sử dụng chat có lưu lịch sử.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu mới"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            minLength={6}
            required
          />

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Lưu mật khẩu mới
          </button>
        </form>
      </div>
    </div>
  );
}
