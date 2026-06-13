"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Database,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Share2,
  ThumbsUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useRequireRole } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdminDashboard } from "@/types";

const REASON_LABELS: Record<string, string> = {
  no_documents: "Thiếu học liệu",
  no_match: "Không khớp tài liệu",
  clarification: "Cần hỏi lại",
  sensitive: "Nội dung nhạy cảm",
  api_error: "Lỗi API",
};

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface StatCardProps {
  title: string;
  value: number | string;
  hint?: string;
  icon: ElementType;
  iconClassName?: string;
}

function StatCard({ title, value, hint, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("rounded-lg bg-muted p-2", iconClassName)}>
          <Icon size={16} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function BarChart({ data }: { data: AdminDashboard["interactions_by_day"] }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  const barAreaHeight = 140;

  return (
    <div className="grid h-56 grid-cols-7 gap-1 sm:gap-2">
      {data.map((item) => {
        const barHeight =
          item.count > 0 ? Math.max(Math.round((item.count / max) * barAreaHeight), 10) : 0;

        return (
          <div key={item.date} className="flex min-w-0 flex-col items-center justify-end gap-1.5">
            <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
              {item.count}
            </span>
            <div
              className="flex w-full flex-col justify-end"
              style={{ height: barAreaHeight }}
            >
              {barHeight > 0 ? (
                <div
                  className="mx-auto w-full max-w-10 rounded-t-md bg-primary shadow-sm"
                  style={{ height: barHeight }}
                />
              ) : (
                <div className="mx-auto h-1 w-full max-w-10 rounded-full bg-muted" />
              )}
            </div>
            <span className="shrink-0 text-center text-[10px] leading-tight text-muted-foreground">
              {formatDateLabel(item.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownList({
  title,
  items,
  emptyLabel = "Chưa có dữ liệu.",
}: {
  title: string;
  items: Record<string, number>;
  emptyLabel?: string;
}) {
  const entries = Object.entries(items);
  const max = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
        {entries.map(([label, count]) => (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="ml-2 shrink-0 font-medium text-foreground">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { user, loading } = useRequireRole("admin");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      api
        .get<AdminDashboard>("/api/v1/admin/dashboard", true)
        .then(setDashboard)
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : "Không tải được dashboard."),
        );
    }
  }, [loading, user]);

  if (loading || !user) {
    return <LoadingState />;
  }

  if (!dashboard) {
    return (
      <PageContainer>
        <StatusMessage variant="error">{error || "Đang tải dashboard..."}</StatusMessage>
      </PageContainer>
    );
  }

  const successRate =
    dashboard.total_interactions > 0
      ? (
          ((dashboard.total_interactions - dashboard.failed_interactions) /
            dashboard.total_interactions) *
          100
        ).toFixed(1)
      : "100.0";

  return (
    <PageContainer maxWidth="full">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutDashboard size={16} />
            <span>Quản trị hệ thống</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng quan chatbot RAG — người dùng, tài liệu, phiên chat và chất lượng phản hồi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/teachers">
              <Users size={14} />
              Quản lý giáo viên
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/students">
              <GraduationCap size={14} />
              Quản lý học sinh
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Giáo viên"
          value={dashboard.teachers.total}
          hint={`${dashboard.teachers.active} hoạt động · ${dashboard.teachers.pending_password} chưa đổi MK`}
          icon={Users}
          iconClassName="text-primary"
        />
        <StatCard
          title="Học sinh"
          value={dashboard.students.total}
          hint={`${dashboard.students.active} hoạt động · ${dashboard.students.pending_password} chưa đổi MK`}
          icon={GraduationCap}
          iconClassName="text-primary"
        />
        <StatCard
          title="Tài liệu RAG"
          value={dashboard.documents_total}
          hint={`${dashboard.rag.total_points} vector chunks trong kho`}
          icon={BookOpen}
          iconClassName="text-primary"
        />
        <StatCard
          title="Phiên chat"
          value={dashboard.chat_sessions_total}
          hint={`${dashboard.chat_messages_total} tin nhắn · ${dashboard.shared_sessions_total} đã chia sẻ`}
          icon={MessageSquare}
          iconClassName="text-primary"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tương tác chatbot"
          value={dashboard.total_interactions}
          hint={`Tỷ lệ thành công ${successRate}%`}
          icon={Activity}
          iconClassName="text-sky-600"
        />
        <StatCard
          title="Fallback / lỗi"
          value={dashboard.failed_interactions}
          hint={`${dashboard.reask_count} re-ask · ${dashboard.clarification_count} cần làm rõ`}
          icon={AlertTriangle}
          iconClassName="text-red-500"
        />
        <StatCard
          title="Phản hồi người dùng"
          value={dashboard.feedback_count}
          hint={
            dashboard.positive_feedback_rate !== null
              ? `${(dashboard.positive_feedback_rate * 100).toFixed(0)}% tích cực`
              : "Chưa có đánh giá"
          }
          icon={ThumbsUp}
          iconClassName="text-green-600"
        />
        <StatCard
          title="Kho vector Qdrant"
          value={dashboard.rag.document_count}
          hint={dashboard.rag.collection_name || "Chưa kết nối"}
          icon={Database}
          iconClassName="text-primary"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Hoạt động chat (7 ngày)</CardTitle>
            <CardDescription>Số lượng tương tác chatbot theo ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={dashboard.interactions_by_day} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Trạng thái hệ thống</CardTitle>
            <CardDescription>RAG pipeline & prompt hiện tại</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">Kho học liệu</span>
              <Badge variant={dashboard.rag.has_documents ? "success" : "warning"}>
                {dashboard.rag.has_documents ? "Đã có dữ liệu" : "Trống"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">Vector chunks</span>
              <span className="text-sm font-semibold text-foreground">{dashboard.rag.total_points}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">Prompt version</span>
              <code className="rounded bg-accent px-2 py-0.5 font-mono text-xs text-accent-foreground">
                {dashboard.prompt_version}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">Session chia sẻ</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                <Share2 size={14} className="text-muted-foreground" />
                {dashboard.shared_sessions_total}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BreakdownList
          title="Fallback theo loại"
          items={Object.fromEntries(
            Object.entries(dashboard.by_fallback_reason).map(([key, value]) => [
              REASON_LABELS[key] ?? key,
              value,
            ]),
          )}
        />
        <BreakdownList
          title="Tài liệu theo môn"
          items={dashboard.documents_by_subject}
          emptyLabel="Chưa có tài liệu được gắn môn."
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Người dùng mới nhất</CardTitle>
          <CardDescription>Giáo viên và học sinh vừa được tạo</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-2">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Username</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recent_users.map((item) => (
                <tr key={item.id} className="border-b border-border-soft last:border-0">
                  <td className="px-6 py-3 font-medium text-foreground">{item.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {item.role === "teacher" ? "Giáo viên" : "Học sinh"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.is_active ? "success" : "outline"}>
                      {item.is_active ? "Hoạt động" : "Vô hiệu"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.created_at)}</td>
                </tr>
              ))}
              {dashboard.recent_users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    Chưa có người dùng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error && (
        <StatusMessage variant="error" className="mt-4">
          {error}
        </StatusMessage>
      )}
    </PageContainer>
  );
}
