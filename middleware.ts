import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/signup", "/unsubscribe"];

function makeClient(req: NextRequest, res: NextResponse) {
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // API 라우트는 redirect하지 않음 — 각 핸들러가 JSON 401로 응답하도록 둠
  // 이래야 프론트의 fetch().json() 이 HTML을 파싱하다 SyntaxError를 내지 않음
  if (path.startsWith("/api/")) {
    const supabase = makeClient(req, res);
    await supabase.auth.getUser(); // 쿠키 갱신만
    return res;
  }

  const supabase = makeClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
