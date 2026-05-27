import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// 서버 컴포넌트/서버 액션/라우트 핸들러에서 사용.
// auth.uid()가 살아 있어 RLS가 정상 동작합니다.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // 서버 컴포넌트에서 호출되는 경우 set이 무시될 수 있음 — 미들웨어가 갱신
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* 위와 동일 */
        }
      },
    },
  });
}
