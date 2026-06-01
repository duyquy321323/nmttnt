"use client";

import { useEffect, useState } from "react";

import { useRequireRole } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";

interface AnalyticsReport {
  total_interactions: number;
  failed_count: number;
  reask_count: number;
  clarification_count: number;
  feedback_count: number;
  positive_feedback_rate: number | null;
  by_fallback_reason: Record<string, number>;
  by_subject: Record<string, number>;
  by_lesson: Record<string, number>;
  prompt_version: string;
  recent_failures: Array<{
    id: number;
    question: string;
    fallback_reason: string | null;
    subject: string | null;
    lesson: string | null;
    grade: string | null;
    is_reask: boolean;
    needs_clarification: boolean;
    created_at: string;
  }>;
}

const REASON_LABELS: Record<string, string> = {
  no_documents: "Thiếu học liệu",
  no_match: "Không tìm thấy trong tài liệu",
  clarification: "Cần hỏi lại",
  sensitive: "Nội dung nhạy cảm",
  api_error: "Lỗi API",
};

export default function TeacherAnalyticsPage() {
  const { user, loading } = useRequireRole("teacher");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user?.role === "teacher" && !user.must_change_password) {
      api
        .get<AnalyticsReport>("/api/v1/teacher/analytics", true)
        .then(setReport)
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : "Không tải được báo cáo."),
        );
    }
  }, [loading, user]);

  if (loading || !user) {
    return <div className="p-8 text-zinc-500">Đang tải...</div>;
  }

  if (!report) {
    return <div className="p-8 text-red-600">{error || "Đang tải báo cáo..."}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Robustness — Giám sát chatbot</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Log câu hỏi thất bại, re-ask, hỏi lại và đánh giá giáo viên. Prompt version:{" "}
        <code className="rounded bg-zinc-100 px-1">{report.prompt_version}</code>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Tổng tương tác", report.total_interactions],
          ["Thất bại / fallback", report.failed_count],
          ["Hỏi lại (re-ask)", report.reask_count],
          ["Cần làm rõ", report.clarification_count],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Theo loại fallback</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(report.by_fallback_reason).map(([key, count]) => (
              <li key={key} className="flex justify-between">
                <span>{REASON_LABELS[key] ?? key}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
            {Object.keys(report.by_fallback_reason).length === 0 && (
              <li className="text-zinc-500">Chưa có dữ liệu.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Lỗi theo môn</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(report.by_subject).map(([subject, count]) => (
              <li key={subject} className="flex justify-between">
                <span>{subject}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
            {Object.keys(report.by_subject).length === 0 && (
              <li className="text-zinc-500">Chưa có dữ liệu.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Câu hỏi</th>
              <th className="px-4 py-3">Lý do</th>
              <th className="px-4 py-3">Môn / Bài</th>
              <th className="px-4 py-3">Re-ask</th>
            </tr>
          </thead>
          <tbody>
            {report.recent_failures.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100">
                <td className="max-w-xs truncate px-4 py-3">{row.question}</td>
                <td className="px-4 py-3">
                  {REASON_LABELS[row.fallback_reason ?? ""] ?? row.fallback_reason}
                </td>
                <td className="px-4 py-3">
                  {[row.subject, row.lesson ? `bài ${row.lesson}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-4 py-3">{row.is_reask ? "Có" : "—"}</td>
              </tr>
            ))}
            {report.recent_failures.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Chưa có log thất bại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
