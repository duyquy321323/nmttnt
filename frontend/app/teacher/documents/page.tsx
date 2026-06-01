"use client";

import { FormEvent, useEffect, useState } from "react";

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
    if (!file) {
      setError("Vui lòng chọn file.");
      return;
    }

    setError("");
    setMessage("");
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
    return <div className="p-8 text-zinc-500">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Quản lý tài liệu</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Gắn metadata theo loại học liệu để RAG lọc đúng phạm vi (lớp, môn, bài, mức độ...).
      </p>

      <form
        onSubmit={handleUpload}
        className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <input
            placeholder="Tiêu đề tài liệu"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            required
          />
          <input
            placeholder="Mô tả (tuỳ chọn)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm"
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Công bằng (Fairness)</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Gắn metadata phù hợp để chatbot hỗ trợ đúng trình độ, không thiên vị vùng miền hay
            trình độ tiếng Việt. Ví dụ địa phương: dùng loại &quot;Ví dụ địa phương&quot; + vùng/văn
            hóa; từ vựng khó: thêm trình độ tiếng Việt.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-800">Metadata RAG</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <select
              value={metadata.material_type}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, material_type: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Loại học liệu</option>
              {materialTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Lớp (vd: 3)"
              value={metadata.grade}
              onChange={(event) => setMetadata((prev) => ({ ...prev, grade: event.target.value }))}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Môn (vd: Toán)"
              value={metadata.subject}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, subject: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Bài (vd: 5)"
              value={metadata.lesson}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, lesson: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Mức độ (cơ bản / nâng cao)"
              value={metadata.level}
              onChange={(event) => setMetadata((prev) => ({ ...prev, level: event.target.value }))}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Kỹ năng"
              value={metadata.skill}
              onChange={(event) => setMetadata((prev) => ({ ...prev, skill: event.target.value }))}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Trình độ tiếng Việt"
              value={metadata.vietnamese_level}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, vietnamese_level: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Vùng / văn hóa"
              value={metadata.region}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, region: event.target.value }))
              }
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <input
          type="file"
          accept=".txt,.docx,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm"
          required
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tải lên & reindex
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
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
              <tr key={document.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{document.title}</td>
                <td className="px-4 py-3">{document.original_filename}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{metadataSummary(document)}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  v{document.version}
                  {document.last_indexed_at && (
                    <span className="block text-zinc-400">
                      {new Date(document.last_indexed_at).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{document.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleReplace(document)}
                      className="rounded-lg border px-3 py-1 hover:bg-zinc-50"
                    >
                      Thay file
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(document.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Chưa có tài liệu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
