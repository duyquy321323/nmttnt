"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useRequireRole } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import type { Teacher } from "@/types";

export default function AdminTeachersPage() {
  const { user, loading } = useRequireRole("admin");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTeachers() {
    const data = await api.get<Teacher[]>("/api/v1/admin/teachers", true);
    setTeachers(data);
  }

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      loadTeachers().catch((err) =>
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
        "/api/v1/admin/teachers",
        { username: username.trim(), full_name: fullName.trim() || null },
        true,
      );
      setUsername("");
      setFullName("");
      setMessage("Đã thêm giáo viên. Mật khẩu mặc định được lấy từ cấu hình server.");
      await loadTeachers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thêm được giáo viên.");
    }
  }

  async function handleToggleActive(teacher: Teacher) {
    setError("");
    try {
      await api.put(
        `/api/v1/admin/teachers/${teacher.id}`,
        { is_active: !teacher.is_active },
        true,
      );
      await loadTeachers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không cập nhật được giáo viên.");
    }
  }

  async function handleResetPassword(teacherId: number) {
    setError("");
    try {
      await api.put(`/api/v1/admin/teachers/${teacherId}`, { reset_password: true }, true);
      setMessage("Đã reset mật khẩu về mặc định.");
      await loadTeachers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không reset được mật khẩu.");
    }
  }

  async function handleDelete(teacherId: number) {
    if (!confirm("Xóa giáo viên này?")) return;
    setError("");
    try {
      await api.delete(`/api/v1/admin/teachers/${teacherId}`, true);
      await loadTeachers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không xóa được giáo viên.");
    }
  }

  if (loading || !user) {
    return <LoadingState />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý giáo viên"
        description="Thêm, sửa, xóa tài khoản giáo viên. Mật khẩu mặc định do admin cấu hình trong env."
      />

      <form onSubmit={handleCreate} className="card grid gap-4 p-5 md:grid-cols-3">
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
        <Button type="submit">
          <UserPlus size={16} />
          Thêm giáo viên
        </Button>
      </form>

      {message && (
        <StatusMessage className="mt-4">{message}</StatusMessage>
      )}
      {error && (
        <StatusMessage variant="error" className="mt-4">
          {error}
        </StatusMessage>
      )}

      <div className="table-wrap mt-8 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đổi MK lần đầu</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="table-row">
                <td className="px-4 py-3 text-text">{teacher.username}</td>
                <td className="px-4 py-3 text-text-muted">{teacher.full_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      teacher.is_active
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-surface-inset text-text-muted border border-border"
                    }`}
                  >
                    {teacher.is_active ? "Hoạt động" : "Vô hiệu"}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {teacher.must_change_password ? "Chưa" : "Đã đổi"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(teacher)}>
                      {teacher.is_active ? "Vô hiệu hoá" : "Kích hoạt"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleResetPassword(teacher.id)}>
                      Reset MK
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(teacher.id)}>
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  Chưa có giáo viên nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
