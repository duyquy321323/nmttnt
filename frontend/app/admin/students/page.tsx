"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import {
  DataTableViewport,
  MobileDataCard,
  MobileDataList,
  MobileDataRow,
} from "@/components/ui/responsive-data";
import { useRequireRole } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import type { Student } from "@/types";

export default function AdminStudentsPage() {
  const { user, loading } = useRequireRole("admin");
  const [students, setStudents] = useState<Student[]>([]);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStudents() {
    const data = await api.get<Student[]>("/api/v1/admin/students", true);
    setStudents(data);
  }

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      loadStudents().catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được danh sách."),
      );
    }
  }, [loading, user]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post(
        "/api/v1/admin/students",
        { username: username.trim(), full_name: fullName.trim() || null },
        true,
      );
      setUsername("");
      setFullName("");
      setMessage("Đã thêm học sinh. Mật khẩu mặc định lấy từ env (STUDENT_DEFAULT_PASSWORD).");
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thêm được học sinh.");
    }
  }

  async function handleResetPassword(studentId: number) {
    setError("");
    try {
      await api.put(`/api/v1/admin/students/${studentId}`, { reset_password: true }, true);
      setMessage("Đã reset mật khẩu học sinh.");
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không reset được mật khẩu.");
    }
  }

  async function handleDelete(studentId: number) {
    if (!confirm("Xóa học sinh này?")) return;
    setError("");
    try {
      await api.delete(`/api/v1/admin/students/${studentId}`, true);
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không xóa được học sinh.");
    }
  }

  if (loading || !user) {
    return <LoadingState />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý học sinh"
        description="Thêm và quản lý tài khoản học sinh trong hệ thống."
      />

      <form onSubmit={handleCreate} className="card grid gap-4 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <Input
          placeholder="Họ tên (tuỳ chọn)"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Button type="submit" className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
          <UserPlus size={16} />
          Thêm học sinh
        </Button>
      </form>

      {message && <StatusMessage className="mt-4">{message}</StatusMessage>}
      {error && (
        <StatusMessage variant="error" className="mt-4">
          {error}
        </StatusMessage>
      )}

      <DataTableViewport className="mt-8">
        <table className="min-w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="table-row">
                <td className="px-4 py-3 text-text">{student.username}</td>
                <td className="px-4 py-3 text-text-muted">{student.full_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      student.is_active
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-surface-inset text-text-muted border border-border"
                    }`}
                  >
                    {student.is_active ? "Hoạt động" : "Vô hiệu"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleResetPassword(student.id)}>
                      Reset MK
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(student.id)}>
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                  Chưa có học sinh nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableViewport>

      <MobileDataList className="mt-8">
        {students.map((student) => (
          <MobileDataCard key={student.id}>
            <MobileDataRow label="Username">{student.username}</MobileDataRow>
            <MobileDataRow label="Họ tên">{student.full_name ?? "—"}</MobileDataRow>
            <MobileDataRow label="Trạng thái">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  student.is_active
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-border bg-surface-inset text-text-muted"
                }`}
              >
                {student.is_active ? "Hoạt động" : "Vô hiệu"}
              </span>
            </MobileDataRow>
            <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => handleResetPassword(student.id)}>
                Reset MK
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(student.id)}>
                Xóa
              </Button>
            </div>
          </MobileDataCard>
        ))}
        {students.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">Chưa có học sinh nào.</p>
        )}
      </MobileDataList>
    </PageContainer>
  );
}
