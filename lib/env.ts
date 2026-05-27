// 환경 변수 로딩 + 검증. 빠진 키는 사용 시점에 친절한 에러로 알림.
const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey: () => required("RESEND_API_KEY"),
  resendFromEmail: () => required("RESEND_FROM_EMAIL"),
  resendWebhookSecret: () => process.env.RESEND_WEBHOOK_SECRET ?? "",
  worknetApiKey: () => process.env.WORKNET_API_KEY ?? "",
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  emailDailyCap: () => Number(process.env.EMAIL_DAILY_CAP ?? 50),
  emailPerCompanyCooldownDays: () =>
    Number(process.env.EMAIL_PER_COMPANY_COOLDOWN_DAYS ?? 30),
};
