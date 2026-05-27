"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

// 흐름:
// 1) 사용자가 채용 공고 URL을 붙여넣고 "메타 추출"
// 2) 추출된 정보를 폼에 채워주고 사용자가 보정
// 3) 저장 시 job_postings + companies upsert
export default function NewJobPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: "", position_title: "", location: "",
    employment_type: "", experience: "", description: "",
    contact_email: "", contact_name: "",
    source: "manual" as "manual" | "jobkorea" | "saramin" | "rocketpunch" | "other",
  });

  async function extract() {
    if (!url) return;
    setExtracting(true); setErr(null);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (body.ok && body.parsed) {
        setForm((f) => ({
          ...f,
          company_name: body.parsed.company_name || f.company_name,
          position_title: body.parsed.position_title || f.position_title,
          location: body.parsed.location || f.location,
          employment_type: body.parsed.employment_type || f.employment_type,
          experience: body.parsed.experience || f.experience,
          description: body.parsed.description || f.description,
          source: body.parsed.source,
        }));
      } else if (body.error) {
        setErr(`자동 추출 실패: ${body.error}. 아래 폼에 직접 입력해주세요.`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "추출 실패");
    } finally { setExtracting(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name || !form.position_title) {
      setErr("회사명과 포지션은 필수입니다."); return;
    }
    setSaving(true); setErr(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("id", user!.id).single();
    const orgId = profile?.organization_id;
    if (!orgId) { setErr("조직이 없습니다."); setSaving(false); return; }

    // 1) companies upsert (이름 기준)
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .upsert(
        {
          organization_id: orgId,
          name: form.company_name,
          contact_email: form.contact_email || null,
          contact_name: form.contact_name || null,
          created_by: user!.id,
        },
        { onConflict: "organization_id,name" }
      )
      .select("id")
      .single();
    if (cErr || !company) { setErr(cErr?.message ?? "업체 저장 실패"); setSaving(false); return; }

    // 2) job_postings insert
    const { error: jErr } = await supabase.from("job_postings").insert({
      organization_id: orgId,
      source: form.source,
      source_url: url || null,
      company_id: company.id,
      company_name: form.company_name,
      position_title: form.position_title,
      location: form.location || null,
      employment_type: form.employment_type || null,
      experience: form.experience || null,
      description: form.description || null,
      status: "new",
      created_by: user!.id,
    });
    setSaving(false);
    if (jErr) { setErr(jErr.message); return; }
    router.push("/jobs");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">공고 등록</h1>

      <div className="card p-5 space-y-3">
        <label className="label">채용 공고 URL (선택)</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="url"
            placeholder="https://www.jobkorea.co.kr/Recruit/GI_Read/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="button" onClick={extract} disabled={!url || extracting} className="btn-secondary">
            {extracting ? "추출 중…" : "메타 추출"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          잡코리아/사람인/로켓펀치 URL을 붙여넣으면 회사명·포지션을 자동 채워줍니다.
          차단되면 수동 입력하세요.
        </p>
      </div>

      <form onSubmit={save} className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">회사명 *</label>
            <input className="input" required value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div>
            <label className="label">포지션 *</label>
            <input className="input" required value={form.position_title}
              onChange={(e) => setForm({ ...form, position_title: e.target.value })} />
          </div>
          <div>
            <label className="label">지역</label>
            <input className="input" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className="label">고용 형태</label>
            <input className="input" value={form.employment_type}
              onChange={(e) => setForm({ ...form, employment_type: e.target.value })} />
          </div>
          <div>
            <label className="label">담당자 이름</label>
            <input className="input" value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div>
            <label className="label">담당자 이메일 (콜드메일 대상)</label>
            <input className="input" type="email" value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">공고 설명</label>
          <textarea className="input" rows={5} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">취소</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "저장 중…" : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
