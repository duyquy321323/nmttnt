export type UserRole = "admin" | "teacher" | "student";

export interface AuthUser {
  id: number;
  username: string;
  full_name: string | null;
  role: UserRole;
  must_change_password: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
  must_change_password: boolean;
}

export interface Teacher {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  description: string | null;
  original_filename: string;
  rag_document_id: string;
  material_type: string | null;
  grade: string | null;
  subject: string | null;
  lesson: string | null;
  level: string | null;
  skill: string | null;
  vietnamese_level: string | null;
  region: string | null;
  version: number;
  content_hash: string | null;
  last_indexed_at: string | null;
  uploaded_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialTypeOption {
  value: string;
  label: string;
}

export interface RagMetadataFilter {
  material_type?: string | null;
  grade?: string | null;
  subject?: string | null;
  lesson?: string | null;
  level?: string | null;
  skill?: string | null;
  vietnamese_level?: string | null;
  region?: string | null;
}

export interface ChatResponse {
  answer: string;
  from_rag: boolean;
  sources: string[];
  model?: string;
  metadata_filter?: RagMetadataFilter;
  fallback_reason?: string;
  needs_clarification?: boolean;
  interaction_id?: number;
  score_threshold?: number;
  chunks?: unknown[];
  explanation?: {
    meets_standard: boolean;
    is_exercise: boolean;
    has_steps: boolean;
    has_analogy: boolean;
    has_why: boolean;
    has_practice: boolean;
    has_counterfactual: boolean;
  };
}

export interface ChatSessionItem {
  id: number;
  title: string;
  is_shared: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatSessionMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  from_rag: boolean;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSessionItem {
  messages: ChatSessionMessage[];
}

export interface ShareLinkInfo {
  share_token: string;
  share_url: string;
  is_shared: boolean;
}

export interface Student {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCountStats {
  total: number;
  active: number;
  inactive: number;
  pending_password: number;
}

export interface AdminDashboard {
  teachers: UserCountStats;
  students: UserCountStats;
  documents_total: number;
  chat_sessions_total: number;
  chat_messages_total: number;
  shared_sessions_total: number;
  total_interactions: number;
  failed_interactions: number;
  reask_count: number;
  clarification_count: number;
  feedback_count: number;
  positive_feedback_rate: number | null;
  rag: {
    has_documents: boolean;
    document_count: number;
    total_points: number;
    collection_name: string;
  };
  by_fallback_reason: Record<string, number>;
  by_subject: Record<string, number>;
  documents_by_subject: Record<string, number>;
  interactions_by_day: Array<{ date: string; count: number }>;
  recent_users: Array<{
    id: number;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
  }>;
  prompt_version: string;
}
