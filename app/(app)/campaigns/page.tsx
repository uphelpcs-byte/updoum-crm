import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  sending: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-blue-100 text-blue-700",
  opened: "bg-green-100 text-green-700",
  clicked: "bg-green-100 text-green-700",
  replied: "bg-emerald-100 text-emerald-700",
  bounced: "bg-red-100 text-red-700",
  complained: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  blocked: "bg-gray-200 text-gray-600",
};

export default async function CampaignsPage({
  searchParams,
}: { searchParams: { status?: string } }) {
  const supabase = createClient();
  let q = supabase
    .from("email_messages")
    .select("id, to_email, to_name, subject, status, sent_at, created_at, job_posting_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (searchParams.status) q = q.eq("status", searchParams.status);

  const { data: msgs } = await q;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">발송 이력</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/campaigns" className="text-gray-600 hover:underline">전체</Link>
          <Link href="/campaigns?status=opened" className="text-gray-600 hover:underline">열람</Link>
          <Link href="/campaigns?status=replied" className="text-gray-600 hover:underline">회신</Link>
          <Link href="/campaigns?status=bounced" className="text-gray-600 hover:underline">바운스</Link>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">수신자</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">발송시각</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(msgs ?? []).map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{m.to_name ?? "-"}</div>
                  <div className="text-xs text-gray-500">{m.to_email}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {m.job_posting_id ? (
                    <Link href={`/jobs/${m.job_posting_id}`} className="text-brand-600 hover:underline">{m.subject}</Link>
                  ) : m.subject}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(m.sent_at ?? m.created_at)}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLOR[m.status] ?? ""}`}>{m.status}</span></td>
              </tr>
            ))}
            {(!msgs || msgs.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">발송 이력이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
