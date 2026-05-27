import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function ProposalsPage() {
  const supabase = createClient();
  const { data: templates } = await supabase
    .from("proposal_templates")
    .select("id, name, subject, is_default, updated_at")
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">제안서 템플릿</h1>
        <Link href="/proposals/new" className="btn-primary">+ 새 템플릿</Link>
      </div>

      <div className="card">
        {templates && templates.length > 0 ? (
          <ul className="divide-y">
            {templates.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <Link href={`/proposals/${t.id}`} className="font-medium text-brand-600 hover:underline">
                    {t.name} {t.is_default && <span className="badge bg-brand-50 text-brand-700 ml-2">기본</span>}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">제목: {t.subject}</div>
                </div>
                <div className="text-xs text-gray-500">수정: {formatDate(t.updated_at)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            아직 템플릿이 없습니다. <Link href="/proposals/new" className="text-brand-600">첫 템플릿 만들기</Link>
          </div>
        )}
      </div>

      <div className="card p-5 text-xs text-gray-600">
        <p className="font-semibold mb-2">사용 가능한 변수</p>
        <ul className="space-y-1 font-mono">
          <li><code>{"{{company_name}}"}</code> — 수신 업체명</li>
          <li><code>{"{{position}}"}</code> — 채용 포지션 명</li>
          <li><code>{"{{to_name}}"}</code> — 담당자 이름</li>
        </ul>
      </div>
    </div>
  );
}
