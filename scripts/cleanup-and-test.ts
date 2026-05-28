/**
 * 1. 실패한 가입 시도로 남은 사용자 정리
 * 2. 새 /api/auth/signup 엔드포인트로 E2E 가입 테스트
 */

const APP_URL = "https://updoum-crm23.vercel.app";
const SUPABASE_URL = "https://nrcwitavhypnlyztvwhk.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY3dpdGF2aHlwbmx5enR2d2hrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg2MDY4OSwiZXhwIjoyMDk1NDM2Njg5fQ.mLY13t9a3R5AHaiiTwIrl2DPzSlj-_0XjKkWBstaYAE";

const log = (l: string, d: unknown) => console.log(`\n=== ${l} ===\n${typeof d === "string" ? d : JSON.stringify(d, null, 2)}`);

async function listUsers() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
  return await r.json();
}

async function deleteUser(id: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function deleteOrgsByName(name: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/organizations?name=eq.${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, Prefer: "return=minimal" },
  });
}

async function main() {
  // 1) 기존 jeong930708, jeongin930708 잔여 정리 (테스트 편의)
  const users = await listUsers();
  const targets = (users.users ?? []).filter((u: any) =>
    /jeong(in)?930708|e2e-test|updoumtest/.test(u.email ?? "")
  );
  log("1) Users to clean", targets.map((u: any) => ({ id: u.id, email: u.email })));
  for (const u of targets) await deleteUser(u.id);

  // 잔여 조직도 정리
  await deleteOrgsByName("업도움");
  await deleteOrgsByName("E2E-Test");

  // 2) 신규 가입 시뮬레이션 (실제 사용자 입력값으로)
  const TEST_EMAIL = `jeongin930708+real${Date.now()}@gmail.com`;
  const TEST_PASSWORD = "TestPass1234!";
  const r = await fetch(`${APP_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      fullName: "신정인",
      orgName: "업도움",
    }),
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  log("2) Signup endpoint", {
    status: r.status,
    contentType: r.headers.get("content-type"),
    setCookie: !!r.headers.get("set-cookie"),
    body: json ?? text.slice(0, 500),
  });

  const ok = r.ok && json?.ok;
  console.log(ok ? "✅ Signup OK" : "❌ Signup FAILED");

  // 3) 검증
  if (ok) {
    const allUsers = await listUsers();
    const created = (allUsers.users ?? []).find((u: any) => u.email === TEST_EMAIL);
    if (created) {
      const p = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${created.id}&select=*,organizations(name,daily_send_cap)`,
        { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } }
      );
      log("3) Created profile + org", await p.json());
      // 정리
      await deleteUser(created.id);
      await deleteOrgsByName("업도움");
    }
  }

  return ok;
}

main().then((ok) => {
  console.log("\n" + (ok ? "🎉 PASS" : "💥 FAIL"));
  process.exit(ok ? 0 : 1);
}).catch((e) => { console.error("FATAL:", e); process.exit(1); });
