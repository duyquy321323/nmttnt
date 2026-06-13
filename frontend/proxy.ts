import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { APP_BASE_PATH } from "@/lib/app-paths";

/**
 * Redirect / và /login khi thiếu basePath (giống DATN proxy.ts).
 * BASE_PATH hardcode — không đọc env để tránh lệch với next.config trên cPanel.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hasConfiguredBasePath = url.basePath === APP_BASE_PATH;

  if (!hasConfiguredBasePath && url.pathname === "/") {
    url.pathname = `${APP_BASE_PATH}/`;
    return NextResponse.redirect(url);
  }

  if (
    !hasConfiguredBasePath &&
    (url.pathname === "/login" || url.pathname === "/login/")
  ) {
    url.pathname = `${APP_BASE_PATH}/login/`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/login/"],
};
