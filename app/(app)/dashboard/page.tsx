import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: jobCount }, { count: companyCount }, { count: sentCount }, { count: repliedCount }] =
    await Promise.all([
      supabase.from("job_postings").select("*", { count: "exact", head: true }),
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase.from("email_messages").select("*", { count: "exact", head: true }).in("status", ["sent", "delivered", "opened", "clicked", "replied"]),
      supabase.from("email_messages").select("*", { count: "exact", head: true }).eq("status", "replied"),
    ]);

  const { data: recent } = await supabase
    .from("email_messages")
    .select("id, to_email, subject, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "수집 공고", value: jobCount ?? 0, href: "/jobs" },
    { label: "타겟 업체", value: companyCount ?? 0, href: "/jobs" },
    { label: "발송 메일", value: sentCount ?? 0, href: "/campaigns" },
    { label: "회신 받음", value: repliedCount ?? 0, href: "/campaigns?status=replied" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/jobs/new" className="btn-primary">공고 등록</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="text-3xl font-bold mt-2">{s.value.toLocaleString()}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">최근 발송</h2>
          <Link href="/campaigns" className="text-sm text-brand-600 hover:underline">전체 보기</Link>
        </div>
        {recent && recent.length > 0 ? (
          <ul className="divide-y">
            {recent.map((m) => (
              <li key={m.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{m.subject}</div>
                  <div className="text-xs text-gray-500">{m.to_email}</div>
                </div>
                <div className="text-xs text-gray-500">{m.status}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            아직 발송 이력이 없습니다. <Link href="/jobs/new" className="text-brand-600">공고를 등록</Link>하고 시작해보세요.
          </div>
        )}
      </div>
    </div>
  );
}
