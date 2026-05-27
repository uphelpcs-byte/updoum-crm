import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// 보호 라우트: /dashboard, /jobs, /proposals, /campaigns, /settings
// API 라우트는 redirect 하지 않음 (각 route handler가 401 JSON으로 응답)
const PUBLIC_PATHS = ["/login", "/signup", "/unsubscribe"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // API 라우트는 미들웨어가 인증 redirect를 하지 않음.
  // → 프론트 fetch 응답이 HTML이 되지 않고 항상 JSON
  if (path.startsWith("/api/")) {
    // 그래도 쿠키 갱신을 위해 supabase 클라이언트는 한 번 호출
    const supabase = createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: "", ...options }),
      },
    });
    await supabase.auth.getUser();
    return res;
  }

  const supabase = createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      get: (name) => req.cookies.get(name)?.value,
      set: (name, value, options) => res.cookies.set({ name, value, ...options }),
      remove: (name, options) => res.cookies.set({ name, value: "", ...options }),
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)"],
};
