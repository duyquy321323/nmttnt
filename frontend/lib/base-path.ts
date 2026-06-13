import { APP_BASE_PATH } from "@/lib/app-paths";

/** Subpath trên cPanel — luôn khớp next.config.ts. */
export function getBasePath(): string {
  return APP_BASE_PATH;
}

export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalized}`;
}

/** URL đầy đủ trên browser (origin + basePath + path). */
export function appOriginUrl(path: string): string {
  if (typeof window === "undefined") {
    return withBasePath(path);
  }
  return `${window.location.origin}${withBasePath(path)}`;
}
