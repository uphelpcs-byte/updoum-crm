"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { renderTemplate } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  attachment_path: string | null;
  is_default: boolean;
}

interface JobLite {
  id: string;
  company_id: string | null;
  company_name: string;
  position_title: string;
  contact_email: string;
  contact_name: string;
}

export default function SendEmailPanel({
  job, templates,
}: { job: JobLite; templates: Template[] }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const tpl = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  const [toEmail, setToEmail] = useState(job.contact_email);
  const [toName, setToName] = useState(job.contact_name);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const previewSubject = tpl
    ? renderTemplate(tpl.subject, {
        company_name: job.company_name, position: job.position_title, to_name: toName,
      })
    : "";
  const previewBody = tpl
    ? renderTemplate(tpl.body_html, {
        company_name: job.company_name, position: job.position_title, to_name: toName,
      })
    : "";

  async function send() {
    if (!tpl) { setMsg("템플릿을 선택해주세요."); return; }
    if (!toEmail) { setMsg("수신 이메일이 필요합니다."); return; }
    setSending(true); setMsg(null);
    const res = await fetch("/api/email/send", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: tpl.id,
        jobPostingId: job.id,
        companyId: job.company_id,
        toEmail, toName,
        vars: {
          company_name: job.company_name,
          position: job.position_title,
          to_name: toName,
        },
      }),
    });
    const body = await res.json();
    setSending(false);
    if (!res.ok) { setMsg(`발송 실패: ${body.error ?? res.status}`); return; }
    setMsg(`✅ 발송 완료 (메시지 ID: ${body.messageId})`);
    router.refresh();
  }

  if (templates.length === 0) {
    return (
      <div className="card p-5 text-sm text-gray-600">
        <p className="font-semibold mb-2">콜드메일 발송</p>
        먼저 <a href="/proposals" className="text-brand-600 underline">제안서 템플릿</a>을 만들어주세요.
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold">콜드메일 발송</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">템플릿</label>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_default ? "(기본)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">수신자 이름</label>
          <input className="input" value={toName} onChange={(e) => setToName(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">수신자 이메일 *</label>
          <input className="input" type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <p className="text-xs text-gray-500">미리보기 (전송 직전 시스템이 (광고) 표기와 옵트아웃 링크를 자동 삽입합니다)</p>
        <div className="text-sm font-medium">제목: {previewSubject}</div>
        <div className="text-xs text-gray-700 bg-gray-50 border p-3 rounded max-h-60 overflow-auto"
          dangerouslySetInnerHTML={{ __html: previewBody }} />
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      <div className="flex justify-end">
        <button onClick={send} disabled={sending} className="btn-primary">
          {sending ? "발송 중…" : "발송"}
        </button>
      </div>

      <div className="text-xs text-gray-500 border-t pt-3">
        ⚠️ 본 시스템은 정보통신망법을 준수합니다. 동일 업체 30일 이내 재발송 차단,
        수신거부 이력 자동 차단, 일일 발송 상한 적용.
      </div>
    </div>
  );
}
