const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "auth_token";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.") {
    super(message);
    this.name = "NetworkError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
  retry = 0,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = (data as { detail?: string | { msg: string }[] }).detail;
      let message = "Đã xảy ra lỗi.";
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = detail.map((item) => item.msg).join(", ");
      }

      if (response.status >= 500 && retry < MAX_RETRIES) {
        await delay(800 * (retry + 1));
        return request<T>(path, options, auth, retry + 1);
      }

      throw new ApiError(message, response.status);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const isAbort = error instanceof DOMException && error.name === "AbortError";
    const isNetwork =
      error instanceof TypeError ||
      isAbort ||
      (typeof navigator !== "undefined" && !navigator.onLine);

    if (isNetwork && retry < MAX_RETRIES) {
      await delay(800 * (retry + 1));
      return request<T>(path, options, auth, retry + 1);
    }

    if (isNetwork) {
      throw new NetworkError(
        isAbort
          ? "Máy chủ phản hồi quá lâu. Em thử gửi lại sau vài giây nhé."
          : undefined,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(path: string, auth = false) => request<T>(path, { method: "GET" }, auth),
  post: <T>(path: string, body: unknown, auth = false) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, auth),
  put: <T>(path: string, body: unknown, auth = false) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }, auth),
  delete: <T>(path: string, auth = false) =>
    request<T>(path, { method: "DELETE" }, auth),
  postForm: <T>(path: string, formData: FormData, auth = false) =>
    request<T>(path, { method: "POST", body: formData }, auth),
  putForm: <T>(path: string, formData: FormData, auth = false) =>
    request<T>(path, { method: "PUT", body: formData }, auth),
};

export { API_URL };
