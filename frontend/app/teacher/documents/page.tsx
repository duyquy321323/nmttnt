"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { DocumentItem, MaterialTypeOption } from "@/types";

const EMPTY_METADATA = {
  material_type: "",
  grade: "",
  subject: "",
  lesson: "",
  level: "",
  skill: "",
  vietnamese_level: "",
  region: "",
};

function metadataSummary(document: DocumentItem): string {
  const parts = [
    document.material_type,
    document.grade ? `Lớp ${document.grade}` : null,
    document.subject,
    document.lesson ? `Bài ${document.lesson}` : null,
    document.level,
    document.skill,
    document.vietnamese_level,
    document.region,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default function TeacherDocumentsPage() {
  const { user, loading } = useRequireRole("teacher");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialTypeOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState(EMPTY_METADATA);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDocuments() {
    const data = await api.get<DocumentItem[]>("/api/v1/teacher/documents", true);
    setDocuments(data);
  }

  async function loadMaterialTypes() {
    const data = await api.get<MaterialTypeOption[]>(
      "/api/v1/teacher/documents/material-types",
      true,
    );
    setMaterialTypes(data);
  }

  useEffect(() => {
    if (!loading && user?.role === "teacher" && !user.must_change_password) {
      Promise.all([loadDocuments(), loadMaterialTypes()]).catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được tài liệu."),
      );
    }
  }, [loading, user]);

  function appendMetadata(formData: FormData) {
    Object.entries(metadata).forEach(([key, value]) => {
      if (value.trim()) {
        formData.append(key, value.trim());
      }
    });
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file || uploading) {
      if (!file) setError("Vui lòng chọn file.");
      return;
    }

    setError("");
    setMessage("");
    setUploading(true);
    const formData = new FormData();
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());
    appendMetadata(formData);
    formData.append("file", file);

    try {
      await api.postForm("/api/v1/teacher/documents", formData, true);
      setTitle("");
      setDescription("");
      setMetadata(EMPTY_METADATA);
      setFile(null);
      setMessage("Đã thêm tài liệu, gắn metadata và reindex vào kho RAG.");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải lên được tài liệu.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: number) {
    if (!confirm("Xóa tài liệu này khỏi hệ thống và kho RAG?")) return;
    setError("");
    try {
      await api.delete(`/api/v1/teacher/documents/${documentId}`, true);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không xóa được tài liệu.");
    }
  }

  async function handleReplace(doc: DocumentItem) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.docx,.pdf";
    input.onchange = async () => {
      const selected = input.files?.[0];
      if (!selected) return;

      const formData = new FormData();
      formData.append("file", selected);
      setError("");
      try {
        await api.putForm(`/api/v1/teacher/documents/${doc.id}`, formData, true);
        setMessage(`Đã cập nhật file "${doc.title}" và reindex RAG.`);
        await loadDocuments();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không cập nhật được tài liệu.");
      }
    };
    input.click();
  }

  if (loading || !user) {
    return <LoadingState />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Quản lý tài liệu"
        description="Gắn metadata theo loại học liệu để RAG lọc đúng phạm vi (lớp, môn, bài, mức độ...)."
      />

      <form onSubmit={handleUpload} className="card space-y-5 p-4 sm:p-6" aria-busy={uploading}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Tiêu đề tài liệu" htmlFor="doc-title">
            <Input
              id="doc-title"
              placeholder="Nhập tiêu đề..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={uploading}
            />
          </FormField>
          <FormField label="Mô tả" htmlFor="doc-desc" hint="Tuỳ chọn">
            <Input
              id="doc-desc"
              placeholder="Mô tả ngắn về tài liệu..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Công bằng (Fairness)</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Gắn metadata phù hợp để chatbot hỗ trợ đúng trình độ, không thiên vị vùng miền hay
            trình độ tiếng Việt. Ví dụ địa phương: dùng loại &quot;Ví dụ địa phương&quot; + vùng/văn
            hóa; từ vựng khó: thêm trình độ tiếng Việt.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="section-heading mb-3">Metadata RAG</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Loại học liệu">
              <Select
                value={metadata.material_type || undefined}
                onValueChange={(value) =>
                  setMetadata((prev) => ({ ...prev, material_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại..." />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Lớp">
              <Input
                placeholder="vd: 3"
                value={metadata.grade}
                onChange={(event) => setMetadata((prev) => ({ ...prev, grade: event.target.value }))}
              />
            </FormField>
            <FormField label="Môn">
              <Input
                placeholder="vd: Toán"
                value={metadata.subject}
                onChange={(event) =>
                  setMetadata((prev) => ({ ...prev, subject: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Bài">
              <Input
                placeholder="vd: 5"
                value={metadata.lesson}
                onChange={(event) =>
                  setMetadata((prev) => ({ ...prev, lesson: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Mức độ">
              <Input
                placeholder="cơ bản / nâng cao"
                value={metadata.level}
                onChange={(event) => setMetadata((prev) => ({ ...prev, level: event.target.value }))}
              />
            </FormField>
            <FormField label="Kỹ năng">
              <Input
                placeholder="vd: giải toán"
                value={metadata.skill}
                onChange={(event) => setMetadata((prev) => ({ ...prev, skill: event.target.value }))}
              />
            </FormField>
            <FormField label="Trình độ tiếng Việt">
              <Input
                placeholder="vd: trung bình"
                value={metadata.vietnamese_level}
                onChange={(event) =>
                  setMetadata((prev) => ({ ...prev, vietnamese_level: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Vùng / văn hóa">
              <Input
                placeholder="vd: Tây Nguyên"
                value={metadata.region}
                onChange={(event) =>
                  setMetadata((prev) => ({ ...prev, region: event.target.value }))
                }
              />
            </FormField>
          </div>
        </div>

        <FormField label="File tài liệu" htmlFor="doc-file" hint="Hỗ trợ .txt, .docx, .pdf">
            <Input
              id="doc-file"
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              disabled={uploading}
            />
        </FormField>
        <Button type="submit" className="w-full sm:w-auto" disabled={uploading}>
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? "Đang tải lên & reindex..." : "Tải lên & reindex"}
        </Button>
        {uploading && (
          <StatusMessage className="flex items-center gap-2">
            <Loader2 size={16} className="shrink-0 animate-spin text-brand" />
            <span>
              Đang xử lý tài liệu (embed + Qdrant). Vui lòng đợi, không bấm lại nút tải.
            </span>
          </StatusMessage>
        )}
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
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Metadata</th>
              <th className="px-4 py-3">Phiên bản</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id} className="table-row">
                <td className="px-4 py-3 font-medium text-text">{document.title}</td>
                <td className="px-4 py-3 text-text-muted">{document.original_filename}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{metadataSummary(document)}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  v{document.version}
                  {document.last_indexed_at && (
                    <span className="block text-text-faint">
                      {new Date(document.last_indexed_at).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted">{document.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleReplace(document)}>
                      Thay file
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(document.id)}>
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  Chưa có tài liệu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTableViewport>

      <MobileDataList className="mt-8">
        {documents.map((document) => (
          <MobileDataCard key={document.id}>
            <MobileDataRow label="Tiêu đề">
              <span className="font-medium">{document.title}</span>
            </MobileDataRow>
            <MobileDataRow label="File">{document.original_filename}</MobileDataRow>
            <MobileDataRow label="Metadata">
              <span className="text-xs text-text-muted">{metadataSummary(document)}</span>
            </MobileDataRow>
            <MobileDataRow label="Phiên bản">
              v{document.version}
              {document.last_indexed_at && (
                <span className="block text-xs text-text-faint">
                  {new Date(document.last_indexed_at).toLocaleDateString("vi-VN")}
                </span>
              )}
            </MobileDataRow>
            {document.description && (
              <MobileDataRow label="Mô tả">{document.description}</MobileDataRow>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => handleReplace(document)}>
                Thay file
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(document.id)}>
                Xóa
              </Button>
            </div>
          </MobileDataCard>
        ))}
        {documents.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">Chưa có tài liệu nào.</p>
        )}
      </MobileDataList>
    </PageContainer>
  );
}
