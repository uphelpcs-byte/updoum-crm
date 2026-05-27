import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// 서비스 롤 클라이언트: RLS 우회. 웹훅·옵트아웃 등 인증 없는 서버 경로에서만 사용.
// 절대 브라우저 번들에 노출 금지.
export function createServiceClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
