"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
    else router.push(redirect);
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">로그인</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">이메일</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4 text-center">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-brand-600 hover:underline">회원가입</Link>
      </p>
    </div>
  );
}
