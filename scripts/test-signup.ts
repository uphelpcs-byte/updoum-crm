/**
 * End-to-end signup flow test
 * 실행: npx tsx scripts/test-signup.ts
 */

const APP_URL = process.env.APP_URL || "https://updoum-crm23.vercel.app";
const SUPABASE_URL = "https://nrcwitavhypnlyztvwhk.supabase.co";
const PROJECT_REF = "nrcwitavhypnlyztvwhk";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2ODksImV4cCI6MjA5NTQzNjY4OX0.XL9j9LzQeAKecSvej_JP0V1TUfbxycn-uHGzLCX221Q";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MDY4OSwiZXhwIjoyMDk1NDM2Njg5fQ.mLY13t9a3R5AHaiiTwIrl2DPzSlj-_0XjKkWBstaYAE";

const ts = Date.now();
const TEST_EMAIL = `jeongin930708+e2e${ts}@gmail.com`;
const TEST_PASSWORD = "TestPassword12345!";
const TEST_ORG = `E2E-Test-${ts}`;

function log(label: string, data: unknown) {
  console.log(`\n=== ${label} ===`);
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

async function safeFetch(url: string, init: RequestInit) {
  const r = await fetch(url, init);
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, ok: r.ok, headers: Object.fromEntries(r.headers), json, text };
}

/**
 * @supabase/ssr v0.10+ 가 기대하는 세션 쿠키 포맷:
 * cookie value = "base64-" + base64(JSON.stringify(session))
 * 쿠키 너무 길면 .0, .1 chunked로 분할 (3180 byte 단위)
 */
function buildSessionCookies(session: any): string[] {
  const json = JSON.stringify(session);
  const encoded = "base64-" + Buffer.from(json).toString("base64");
  const cookieName = `sb-${PROJECT_REF}-auth-token`;

  const CHUNK_SIZE = 3180;
  if (encoded.length <= CHUNK_SIZE) {
    return [`${cookieName}=${encoded}`];
  }
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
    chunks.push(`${cookieName}.${chunks.length}=${encoded.slice(i, i + CHUNK_SIZE)}`);
  }
  return chunks;
}

async function run() {
  log("Config", { APP_URL, TEST_EMAIL, TEST_ORG });

  // 1) Admin createUser
  const c = await safeFetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true,
      user_metadata: { full_name: "E2E Test User" },
    }),
  });
  log("1) Admin createUser", { status: c.status, ok: c.ok });
  if (!c.ok) { log("err", c.json ?? c.text); return false; }
  const userId: string = c.json.id;

  // 2) Sign-in
  const s = await safeFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  log("2) Sign-in", { status: s.status, hasToken: !!s.json?.access_token });
  if (!s.ok) { await cleanup(userId); return false; }
  const session = s.json;  // 전체 세션 객체

  // 3) Bootstrap with proper SSR session cookie
  const cookies = buildSessionCookies(session);
  const cookieHeader = cookies.join("; ");
  log("3) Cookie header (preview)", cookieHeader.slice(0, 200) + "...");

  const b = await safeFetch(`${APP_URL}/api/auth/bootstrap`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ orgName: TEST_ORG }),
  });
  log("4) Bootstrap", {
    status: b.status,
    contentType: b.headers["content-type"],
    body: b.json ?? b.text.slice(0, 500),
  });
  const bootOk = b.ok && b.json?.ok;
  console.log(bootOk ? "✅ Bootstrap OK" : "❌ Bootstrap FAILED");

  // 4) DB 검증
  const p = await safeFetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*,organizations(name,daily_send_cap)`,
    { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } }
  );
  log("5) Profile + Org in DB", p.json);

  await cleanup(userId);
  return bootOk;
}

async function cleanup(userId: string) {
  await safeFetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
}

run().then((ok) => {
  console.log("\n" + (ok ? "🎉 ALL PASS" : "💥 FAIL"));
  process.exit(ok ? 0 : 1);
}).catch((e) => { console.error("FATAL:", e); process.exit(1); });
