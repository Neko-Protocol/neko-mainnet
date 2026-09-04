import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ADMIN_SESSION_COOKIE,
  deleteAdminSession,
  isAdminSessionValid,
} from "@/lib/admin-session";

const PUBLIC_PATHS = ["/login"];

function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  if (reason) loginUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user) {
    if (isPublicPath) return response;
    return redirectToLogin(request);
  }

  if (!isPublicPath) {
    // Supabase's own session time-box/inactivity controls need the Pro
    // plan, so a hard 1-hour session cap is enforced instead by checking
    // this cookie's id against admin_sessions.expires_at (the actual
    // source of truth — the cookie itself carries no data an attacker with
    // write access to it could forge into a valid, unexpired session). The
    // underlying Supabase session, which would otherwise keep silently
    // auto-refreshing forever, is force-signed-out once it's past the cap.
    const sessionId = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await isAdminSessionValid(sessionId))) {
      await deleteAdminSession(sessionId);
      await supabase.auth.signOut();
      return redirectToLogin(request, "session_expired");
    }

    const email = user.email?.toLowerCase();
    const admin = getSupabaseAdmin();
    const { data: allowed } =
      email && admin
        ? await admin
            .from("admin_emails")
            .select("email")
            .eq("email", email)
            .eq("is_active", true)
            .maybeSingle()
        : { data: null };

    if (!allowed) {
      // Revokes the DB-backed session too, not just the Supabase one: a
      // revoked admin's session row would otherwise sit there reading as
      // "valid" until it naturally expires, if anything ever checked
      // isAdminSessionValid() without also re-checking admin_emails.
      await deleteAdminSession(sessionId);
      await supabase.auth.signOut();
      return redirectToLogin(request);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
