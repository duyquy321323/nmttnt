"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/PageContainer";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return (
      <PageContainer maxWidth="md" className="flex items-center justify-center">
        <div className="card w-full p-5 text-center sm:p-8">
          <p className="text-sm text-text-muted">
            Bạn đã đăng nhập.{" "}
            <Link href="/" className="text-brand underline underline-offset-2 hover:text-brand-hover">
              Về trang chủ
            </Link>
          </p>
        </div>
      </PageContainer>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer maxWidth="md" className="flex items-center justify-center">
      <div className="card w-full p-5 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <LogIn size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">Đăng nhập</h1>
            <p className="text-xs text-text-muted">Admin · Giáo viên · Học sinh</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-text-muted">
          Khách (guest) có thể dùng chatbot mà không cần đăng nhập.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Tên đăng nhập" htmlFor="username">
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </FormField>

          <FormField label="Mật khẩu" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </FormField>

          {error && <StatusMessage variant="error">{error}</StatusMessage>}

          <Button type="submit" disabled={submitting} className="w-full py-3">
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
