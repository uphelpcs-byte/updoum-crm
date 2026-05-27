// 환경 변수 로딩. NEXT_PUBLIC_* 값은 어차피 클라이언트 번들에 노출되는 공개 값이므로
// Vercel 환경변수 설정이 꼬일 경우를 대비해 fallback을 코드에 직접 둡니다.
// 서버 전용 시크릿(SERVICE_ROLE, RESEND_API_KEY 등)은 fallback 없이 환경변수에서만 읽습니다.

const SUPABASE_URL_FALLBACK = "https://nrcwitavhypnlyztvwhk.supabase.co";
const SUPABASE_ANON_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2ODksImV4cCI6MjA5NTQzNjY4OX0.XL9j9LzQeAKecSvej_JP0V1TUfbxycn-uHGzLCX221Q";
const APP_URL_FALLBACK = "https://updoum-crm23.vercel.app";

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

const optional = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

export const env = {
  // 공개 키 — fallback 적용
  supabaseUrl: () => optional("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL_FALLBACK),
  supabaseAnonKey: () => optional("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY_FALLBACK),
  appUrl: () => optional("NEXT_PUBLIC_APP_URL", APP_URL_FALLBACK),

  // 시크릿 — 환경변수에서만 읽음 (서버 전용)
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey: () => required("RESEND_API_KEY"),
  resendFromEmail: () => required("RESEND_FROM_EMAIL"),

  // 선택값
  resendWebhookSecret: () => process.env.RESEND_WEBHOOK_SECRET ?? "",
  worknetApiKey: () => process.env.WORKNET_API_KEY ?? "",
  emailDailyCap: () => Number(process.env.EMAIL_DAILY_CAP ?? 50),
  emailPerCompanyCooldownDays: () =>
    Number(process.env.EMAIL_PER_COMPANY_COOLDOWN_DAYS ?? 30),
};
