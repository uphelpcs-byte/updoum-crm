import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import SendEmailPanel from "./send-panel";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase
    .from("job_postings")
    .select("*, companies(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!job) notFound();

  const company = (job as any).companies;
  const { data: templates } = await supabase
    .from("proposal_templates")
    .select("id, name, subject, body_html, attachment_path, is_default")
    .order("is_default", { ascending: false });

  const { data: history } = await supabase
    .from("email_messages")
    .select("id, to_email, subject, status, sent_at, created_at")
    .eq("job_posting_id", job.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-gray-500 hover:underline">← 공고 목록</Link>
        <h1 className="text-2xl font-bold mt-2">{job.position_title}</h1>
        <p className="text-gray-600">{job.company_name}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">공고 정보</h2>
          <dl className="text-sm space-y-2">
            <Row label="출처" value={job.source} />
            <Row label="지역" value={job.location ?? "-"} />
            <Row label="고용형태" value={job.employment_type ?? "-"} />
            <Row label="경력" value={job.experience ?? "-"} />
            <Row label="등록일" value={formatDate(job.created_at)} />
            {job.source_url && (
              <Row label="원본"
                value={<a href={job.source_url} target="_blank" rel="noreferrer"
                  className="text-brand-600 hover:underline">링크</a>} />
            )}
          </dl>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">업체 연락처</h2>
          {company ? (
            <dl className="text-sm space-y-2">
              <Row label="업체명" value={company.name} />
              <Row label="담당자" value={company.contact_name ?? "-"} />
              <Row label="이메일" value={company.contact_email ?? "-"} />
              <Row label="전화" value={company.contact_phone ?? "-"} />
              <Row label="상태" value={company.status} />
            </dl>
          ) : (
            <p className="text-sm text-gray-500">연결된 업체 정보가 없습니다.</p>
          )}
        </div>
      </div>

      {job.description && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">공고 본문</h2>
          <p className="text-sm whitespace-pre-wrap text-gray-700">{job.description}</p>
        </div>
      )}

      <SendEmailPanel
        job={{
          id: job.id,
          company_name: job.company_name,
          position_title: job.position_title,
          company_id: job.company_id,
          contact_email: company?.contact_email ?? "",
          contact_name: company?.contact_name ?? "",
        }}
        templates={templates ?? []}
      />

      <div className="card">
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold">발송 이력</h2>
        </div>
        {history && history.length > 0 ? (
          <ul className="divide-y">
            {history.map((m) => (
              <li key={m.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{m.subject}</div>
                  <div className="text-xs text-gray-500">{m.to_email} · {formatDate(m.created_at)}</div>
                </div>
                <span className="badge bg-gray-100 text-gray-700">{m.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-gray-500 text-center">아직 발송 이력이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex">
      <dt className="w-24 text-gray-500">{label}</dt>
      <dd className="flex-1 text-gray-900">{value}</dd>
    </div>
  );
}
