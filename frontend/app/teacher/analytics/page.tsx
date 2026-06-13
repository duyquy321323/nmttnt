"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, MessageSquare, RefreshCw, ThumbsUp } from "lucide-react";

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

const STAT_CARDS = [
  { key: "total", label: "Tổng tương tác", icon: MessageSquare, color: "text-brand" },
  { key: "failed", label: "Thất bại / fallback", icon: AlertTriangle, color: "text-red-500" },
  { key: "reask", label: "Hỏi lại (re-ask)", icon: RefreshCw, color: "text-amber-500" },
  { key: "clarification", label: "Cần làm rõ", icon: Activity, color: "text-sky-500" },
] as const;

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
    return <LoadingState />;
  }

  if (!report) {
    return (
      <PageContainer>
        <StatusMessage variant="error">{error || "Đang tải báo cáo..."}</StatusMessage>
      </PageContainer>
    );
  }

  const statValues: Record<string, number> = {
    total: report.total_interactions,
    failed: report.failed_count,
    reask: report.reask_count,
    clarification: report.clarification_count,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Giám sát chatbot"
        description={
          <>
            Log câu hỏi thất bại, re-ask, hỏi lại và đánh giá. Prompt version:{" "}
            <code className="rounded bg-surface-inset px-1.5 py-0.5 font-mono text-xs text-brand-text">
              {report.prompt_version}
            </code>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="card p-4">
            <div className="flex items-center gap-2">
              <Icon size={16} className={color} />
              <p className="text-xs text-text-muted">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-text">{statValues[key]}</p>
          </div>
        ))}
      </div>

      {report.positive_feedback_rate !== null && (
        <div className="card mt-4 flex items-center gap-3 p-4">
          <ThumbsUp size={18} className="text-green-500" />
          <div>
            <p className="text-xs text-text-muted">Tỷ lệ phản hồi tích cực</p>
            <p className="text-lg font-semibold text-text">
              {(report.positive_feedback_rate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-heading">Theo loại fallback</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(report.by_fallback_reason).map(([key, count]) => (
              <li key={key} className="flex justify-between border-b border-border-soft py-2 last:border-0">
                <span className="text-text-muted">{REASON_LABELS[key] ?? key}</span>
                <span className="font-medium text-text">{count}</span>
              </li>
            ))}
            {Object.keys(report.by_fallback_reason).length === 0 && (
              <li className="text-text-muted">Chưa có dữ liệu.</li>
            )}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="section-heading">Lỗi theo môn</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(report.by_subject).map(([subject, count]) => (
              <li key={subject} className="flex justify-between border-b border-border-soft py-2 last:border-0">
                <span className="text-text-muted">{subject}</span>
                <span className="font-medium text-text">{count}</span>
              </li>
            ))}
            {Object.keys(report.by_subject).length === 0 && (
              <li className="text-text-muted">Chưa có dữ liệu.</li>
            )}
          </ul>
        </div>
      </div>

      <DataTableViewport className="mt-8">
        <table className="min-w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Câu hỏi</th>
              <th className="px-4 py-3">Lý do</th>
              <th className="px-4 py-3">Môn / Bài</th>
              <th className="px-4 py-3">Re-ask</th>
            </tr>
          </thead>
          <tbody>
            {report.recent_failures.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="max-w-xs truncate px-4 py-3 text-text">{row.question}</td>
                <td className="px-4 py-3 text-text-muted">
                  {REASON_LABELS[row.fallback_reason ?? ""] ?? row.fallback_reason}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {[row.subject, row.lesson ? `bài ${row.lesson}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-text-muted">{row.is_reask ? "Có" : "—"}</td>
              </tr>
            ))}
            {report.recent_failures.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                  Chưa có log thất bại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableViewport>

      <MobileDataList className="mt-8">
        {report.recent_failures.map((row) => (
          <MobileDataCard key={row.id}>
            <MobileDataRow label="Câu hỏi">
              <span className="break-words">{row.question}</span>
            </MobileDataRow>
            <MobileDataRow label="Lý do">
              {REASON_LABELS[row.fallback_reason ?? ""] ?? row.fallback_reason ?? "—"}
            </MobileDataRow>
            <MobileDataRow label="Môn / Bài">
              {[row.subject, row.lesson ? `bài ${row.lesson}` : null]
                .filter(Boolean)
                .join(" · ") || "—"}
            </MobileDataRow>
            <MobileDataRow label="Re-ask">{row.is_reask ? "Có" : "—"}</MobileDataRow>
          </MobileDataCard>
        ))}
        {report.recent_failures.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">Chưa có log thất bại.</p>
        )}
      </MobileDataList>

      {error && (
        <StatusMessage variant="error" className="mt-4">
          {error}
        </StatusMessage>
      )}
    </PageContainer>
  );
}
