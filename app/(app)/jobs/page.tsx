import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  jobkorea: "잡코리아", saramin: "사람인", rocketpunch: "로켓펀치",
  worknet: "워크넷", manual: "직접등록", other: "기타",
};
const STATUS_LABEL: Record<string, string> = {
  new: "신규", qualified: "타겟확정", rejected: "제외", archived: "보관",
};
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  qualified: "bg-green-100 text-green-700",
  rejected: "bg-gray-100 text-gray-600",
  archived: "bg-gray-100 text-gray-500",
};

export default async function JobsPage() {
  const supabase = createClient();
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("id, source, company_name, position_title, location, posted_at, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">채용 공고</h1>
        <div className="flex gap-2">
          <WorknetSyncButton />
          <Link href="/jobs/new" className="btn-primary">URL 등록</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">출처</th>
              <th className="px-4 py-3">회사</th>
              <th className="px-4 py-3">포지션</th>
              <th className="px-4 py-3">지역</th>
              <th className="px-4 py-3">등록일</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(jobs ?? []).map((j) => (
              <tr key={j.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{SOURCE_LABEL[j.source] ?? j.source}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  <Link href={`/jobs/${j.id}`} className="text-brand-600 hover:underline">
                    {j.company_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{j.position_title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{j.location ?? "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(j.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLOR[j.status]}`}>{STATUS_LABEL[j.status]}</span>
                </td>
              </tr>
            ))}
            {(!jobs || jobs.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                등록된 공고가 없습니다. <Link href="/jobs/new" className="text-brand-600">첫 공고 등록하기</Link>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorknetSyncButton() {
  return (
    <form action="/api/jobs/worknet" method="post" className="hidden">
      {/* 추후 검색 폼 자리. 일단 placeholder. */}
    </form>
  );
}
