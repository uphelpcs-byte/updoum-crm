/**
 * End-to-end signup flow test.
 *
 * 1. Admin-deletes any existing test user
 * 2. Signs up via Supabase REST (gets session token)
 * 3. Calls /api/auth/bootstrap with that session cookie
 * 4. Verifies organization + profile created in DB
 *
 * 실행: npx tsx scripts/test-signup.ts
 */

const APP_URL = process.env.APP_URL || "https://updoum-crm23.vercel.app";
const SUPABASE_URL = "https://nrcwitavhypnlyztvwhk.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2ODksImV4cCI6MjA5NTQzNjY4OX0.XL9j9LzQeAKecSvej_JP0V1TUfbxycn-uHGzLCX221Q";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MDY4OSwiZXhwIjoyMDk1NDM2Njg5fQ.mLY13t9a3R5AHaiiTwIrl2DPzSlj-_0XjKkWBstaYAE";

const TEST_EMAIL = `e2e-test-${Date.now()}@updoumtest.dev`;
const TEST_PASSWORD = "TestPassword12345!";
const TEST_ORG = `E2E-Test-Org-${Date.now()}`;

function log(label: string, data: unknown) {
  console.log(`\n=== ${label} ===`);
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

async function main() {
  log("Config", { APP_URL, TEST_EMAIL, TEST_ORG });

  // 1. 회원가입 (supabase REST)
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "apikey": ANON_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      data: { full_name: "E2E Test User" },
    }),
  });
  const signupJson: any = await signupRes.json();
  log("1) Supabase signup", { status: signupRes.status, body: signupJson });
  if (!signupRes.ok) {
    console.error("❌ Supabase signup failed");
    process.exit(1);
  }
  const accessToken: string | undefined = signupJson.access_token;
  const refreshToken: string | undefined = signupJson.refresh_token;
  const userId: string | undefined = signupJson.user?.id ?? signupJson.id;
  if (!accessToken) {
    console.warn("⚠️ No access_token in signup response — email confirmation might be ON. Trying signInWithPassword...");
    const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": ANON_KEY, "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const signInJson: any = await signInRes.json();
    log("1b) Sign-in fallback", { status: signInRes.status, body: signInJson });
    if (!signInRes.ok) process.exit(1);
    Object.assign(signupJson, signInJson);
  }

  const at = signupJson.access_token;
  const rt = signupJson.refresh_token;
  if (!at) { console.error("❌ Still no access token"); process.exit(1); }

  // 2. /api/auth/bootstrap 호출 (Supabase SSR 쿠키 형식으로 인증)
  // @supabase/ssr 는 sb-<projectref>-auth-token 쿠키를 base64 JSON으로 읽음
  const projectRef = "nrcwitavhypnlyztvwhk";
  const cookieValue = encodeURIComponent(JSON.stringify([at, rt, null, null, null]));
  const cookieHeader = `sb-${projectRef}-auth-token=${cookieValue}`;

  const bootRes = await fetch(`${APP_URL}/api/auth/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": cookieHeader,
    },
    body: JSON.stringify({ orgName: TEST_ORG }),
  });
  const bootText = await bootRes.text();
  let bootJson: any = null;
  try { bootJson = JSON.parse(bootText); } catch { /* HTML 응답 */ }
  log("2) Bootstrap call", {
    status: bootRes.status,
    contentType: bootRes.headers.get("content-type"),
    body: bootJson ?? bootText.slice(0, 500),
  });

  if (!bootRes.ok || !bootJson?.ok) {
    console.error("❌ Bootstrap failed");
  } else {
    console.log("✅ Bootstrap OK");
  }

  // 3. DB 검증 (service role로 직접 조회)
  if (userId) {
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    });
    log("3) Profile in DB", await profileRes.json());

    const orgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?name=eq.${encodeURIComponent(TEST_ORG)}&select=*`,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } }
    );
    log("4) Organization in DB", await orgRes.json());

    // 클린업: 테스트 user 삭제 (cascade로 profile/org도 같이 정리됨)
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    });
    log("5) Cleanup test user", { status: delRes.status });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
