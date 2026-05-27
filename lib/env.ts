// 환경 변수 로딩.
// 키가 이미 채팅 등에 노출되어 Vercel 환경변수 설정이 꼬이는 케이스가 있어,
// MVP 단계에서는 fallback을 코드에 직접 두어 무조건 동작하게 합니다.
// 실서비스 전환 시: 새 Supabase/Resend 키를 발급받아 환경변수로 옮기고 fallback 제거.

const SUPABASE_URL_FALLBACK = "https://nrcwitavhypnlyztvwhk.supabase.co";
const SUPABASE_ANON_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2ODksImV4cCI6MjA5NTQzNjY4OX0.XL9j9LzQeAKecSvej_JP0V1TUfbxycn-uHGzLCX221Q";
const SUPABASE_SERVICE_ROLE_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MDY4OSwiZXhwIjoyMDk1NDM2Njg5fQ.mLY13t9a3R5AHaiiTwIrl2DPzSlj-_0XjKkWBstaYAE";
const APP_URL_FALLBACK = "https://updoum-crm23.vercel.app";
const RESEND_API_KEY_FALLBACK = "re_dummy_setup_later";
const RESEND_FROM_EMAIL_FALLBACK = "업도움 <onboarding@resend.dev>";

const optional = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

export const env = {
  // 공개값 (클라이언트 번들에 포함)
  supabaseUrl: () => optional("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL_FALLBACK),
  supabaseAnonKey: () => optional("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY_FALLBACK),
  appUrl: () => optional("NEXT_PUBLIC_APP_URL", APP_URL_FALLBACK),

  // 서버 전용 (fallback 있어도 클라이언트에는 안 노출됨 — 서버에서만 import)
  supabaseServiceRoleKey: () =>
    optional("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY_FALLBACK),
  resendApiKey: () => optional("RESEND_API_KEY", RESEND_API_KEY_FALLBACK),
  resendFromEmail: () => optional("RESEND_FROM_EMAIL", RESEND_FROM_EMAIL_FALLBACK),

  // 선택값
  resendWebhookSecret: () => process.env.RESEND_WEBHOOK_SECRET ?? "",
  worknetApiKey: () => process.env.WORKNET_API_KEY ?? "",
  emailDailyCap: () => Number(process.env.EMAIL_DAILY_CAP ?? 50),
  emailPerCompanyCooldownDays: () =>
    Number(process.env.EMAIL_PER_COMPANY_COOLDOWN_DAYS ?? 30),
};
