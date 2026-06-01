"use client";

import { FormEvent, useEffect, useState } from "react";

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
    return <div className="p-8 text-zinc-500">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Quản lý học sinh</h1>

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
          Thêm học sinh
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
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{student.username}</td>
                <td className="px-4 py-3">{student.full_name ?? "—"}</td>
                <td className="px-4 py-3">{student.is_active ? "Hoạt động" : "Vô hiệu"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(student.id)}
                      className="rounded-lg border px-3 py-1 hover:bg-zinc-50"
                    >
                      Reset MK
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(student.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
