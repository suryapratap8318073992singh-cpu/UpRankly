import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "uprankly_session";

/**
 * Unified proxy (formerly middleware): Security headers + route protection redirects.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  // Protect /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(url);
      setSecurityHeaders(res);
      return res;
    }
  }

  // Protect /admin (excluding login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      const res = NextResponse.redirect(url);
      setSecurityHeaders(res);
      return res;
    }
  }

  // Redirect authenticated users trying to access auth pages
  if ((pathname === "/auth" || pathname === "/auth/register") && sessionToken) {
    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    setSecurityHeaders(res);
    return res;
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

function setSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/auth",
    "/auth/register",
  ],
};