import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

const PUBLIC_PATHS = ["/login"];

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
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (!isPublicPath) {
    // Supabase's own session time-box/inactivity controls need the Pro
    // plan, so a hard 1-hour session cap is enforced with this cookie
    // instead: it's set with a matching maxAge at login, so once the
    // browser drops it, the (still technically valid, auto-refreshing)
    // Supabase session is force-signed-out anyway.
    if (!request.cookies.get(ADMIN_SESSION_COOKIE)) {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
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
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
