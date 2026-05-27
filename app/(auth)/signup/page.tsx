"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

// 회원가입 흐름:
// - 초대 토큰(?invite=xxx) 있으면 해당 조직에 합류
// - 없으면 신규 조직 + 본인을 owner로 생성 (첫 가입자 = 대표)
export default function SignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const inviteToken = search.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) { setErr(error.message); setLoading(false); return; }
    if (!data.user) { setErr("가입에 실패했습니다."); setLoading(false); return; }

    // 조직 생성/합류는 서버 라우트에서 처리 (RLS 우회 필요)
    const res = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgName, inviteToken }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(body.error ?? "조직 생성 실패"); return; }
    router.push("/dashboard");
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">
        {inviteToken ? "초대받은 조직에 합류" : "신규 조직 만들기"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">이름</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="label">이메일</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label className="label">비밀번호 (8자 이상)</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
        {!inviteToken && (
          <div>
            <label className="label">회사명</label>
            <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="예: 업도움" />
            <p className="text-xs text-gray-500 mt-1">첫 가입자는 자동으로 대표(owner) 권한이 부여됩니다.</p>
          </div>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "가입 중…" : "가입하기"}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4 text-center">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">로그인</Link>
      </p>
    </div>
  );
}
