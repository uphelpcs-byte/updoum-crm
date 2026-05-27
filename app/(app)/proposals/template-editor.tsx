"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { renderTemplate } from "@/lib/utils";

interface Props {
  mode: "create" | "edit";
  id?: string;
  initial: {
    name: string;
    subject: string;
    body_html: string;
    is_default: boolean;
    attachment_path?: string | null;
  };
}

const SAMPLE_VARS = {
  company_name: "(주)샘플컴퍼니",
  position: "고객상담 매니저",
  to_name: "홍길동",
};

export default function TemplateEditor({ mode, id, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadAttachment(orgId: string): Promise<string | null> {
    if (!file) return form.attachment_path ?? null;
    const supabase = createClient();
    const path = `${orgId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("proposals").upload(path, file, { upsert: true });
    if (error) throw new Error(`첨부 업로드 실패: ${error.message}`);
    return path;
  }

  async function save() {
    setBusy(true); setErr(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr("로그인 필요"); setBusy(false); return; }
    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("id", user.id).single();
    const orgId = profile?.organization_id;
    if (!orgId) { setErr("조직이 없습니다."); setBusy(false); return; }

    try {
      const attachmentPath = await uploadAttachment(orgId);
      if (mode === "create") {
        // 기본 템플릿으로 지정 시 기존 기본 해제
        if (form.is_default) {
          await supabase.from("proposal_templates")
            .update({ is_default: false }).eq("organization_id", orgId).eq("is_default", true);
        }
        const { error } = await supabase.from("proposal_templates").insert({
          organization_id: orgId,
          name: form.name, subject: form.subject, body_html: form.body_html,
          attachment_path: attachmentPath, is_default: form.is_default,
          created_by: user.id,
        });
        if (error) throw new Error(error.message);
      } else {
        if (form.is_default) {
          await supabase.from("proposal_templates")
            .update({ is_default: false })
            .eq("organization_id", orgId).eq("is_default", true).neq("id", id!);
        }
        const { error } = await supabase.from("proposal_templates")
          .update({
            name: form.name, subject: form.subject, body_html: form.body_html,
            attachment_path: attachmentPath, is_default: form.is_default,
          })
          .eq("id", id!);
        if (error) throw new Error(error.message);
      }
      router.push("/proposals");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">템플릿 이름</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">이메일 제목</label>
          <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <label className="label">본문 (HTML)</label>
          <textarea className="input font-mono text-xs" rows={14}
            value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} />
        </div>
        <div>
          <label className="label">제안서 첨부 (PDF 권장)</label>
          <input type="file" accept="application/pdf,.pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {form.attachment_path && !file && (
            <p className="text-xs text-gray-500 mt-1">기존 첨부: {form.attachment_path}</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_default}
            onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
          기본 템플릿으로 지정
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">미리보기 <span className="text-xs text-gray-500 font-normal">(샘플 변수로 치환)</span></h3>
        <div className="text-sm font-medium mb-2">제목: {renderTemplate(form.subject, SAMPLE_VARS)}</div>
        <div className="text-sm border p-4 rounded bg-gray-50 max-h-96 overflow-auto"
          dangerouslySetInnerHTML={{ __html: renderTemplate(form.body_html, SAMPLE_VARS) }} />
      </div>
    </div>
  );
}
