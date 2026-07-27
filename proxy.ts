import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAttendeeRoute = pathname.startsWith("/attendee");
  const isProtectedRoute = isAdminRoute || isAttendeeRoute;
  const isLoginRoute = pathname === "/login" || pathname === "/admin/login";

  if (isProtectedRoute && !isLoginRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (isAdminRoute) {
      url.searchParams.set("role", "admin");
    }
    return NextResponse.redirect(url);
  }

  if (user) {
    const isAdmin = user.role === "admin";

    if (isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin/dashboard" : "/attendee/forms";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && !isLoginRoute && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/attendee/forms";
      return NextResponse.redirect(url);
    }

    if (isAttendeeRoute && isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*", "/attendee/:path*", "/login"],
};
