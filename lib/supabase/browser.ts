"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// 정밀 타입이 필요해지면 `supabase gen types typescript`로 생성한 후
// createBrowserClient<Database>(...) 형태로 재타입하세요.
export function createClient() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
}
