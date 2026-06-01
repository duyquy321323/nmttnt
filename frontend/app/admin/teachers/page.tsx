"use client";

import { FormEvent, useEffect, useState } from "react";

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
    return <div className="p-8 text-zinc-500">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Quản lý giáo viên</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Thêm, sửa, xóa tài khoản giáo viên. Mật khẩu mặc định do admin cấu hình trong env.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-6 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 md:grid-cols-3"
      >
        <input
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-xl border border-zinc-300 px-4 py-3 text-sm"
          required
        />
        <input
          placeholder="Họ tên (tuỳ chọn)"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="rounded-xl border border-zinc-300 px-4 py-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Thêm giáo viên
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
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
              <tr key={teacher.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{teacher.username}</td>
                <td className="px-4 py-3">{teacher.full_name ?? "—"}</td>
                <td className="px-4 py-3">
                  {teacher.is_active ? "Hoạt động" : "Vô hiệu"}
                </td>
                <td className="px-4 py-3">
                  {teacher.must_change_password ? "Chưa" : "Đã đổi"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(teacher)}
                      className="rounded-lg border px-3 py-1 hover:bg-zinc-50"
                    >
                      {teacher.is_active ? "Vô hiệu hoá" : "Kích hoạt"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(teacher.id)}
                      className="rounded-lg border px-3 py-1 hover:bg-zinc-50"
                    >
                      Reset MK
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(teacher.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Chưa có giáo viên nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
