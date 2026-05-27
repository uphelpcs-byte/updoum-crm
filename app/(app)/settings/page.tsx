import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) redirect("/signup");

  const { data: org } = await supabase
    .from("organizations")
    .select("name, daily_send_cap, per_company_cooldown_days")
    .eq("id", profile.organization_id)
    .single();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">조직 정보</h2>
        <dl className="text-sm space-y-2">
          <div className="flex"><dt className="w-40 text-gray-500">회사명</dt><dd>{org?.name}</dd></div>
          <div className="flex"><dt className="w-40 text-gray-500">내 권한</dt><dd>{profile?.role}</dd></div>
          <div className="flex"><dt className="w-40 text-gray-500">일일 발송 한도</dt><dd>{org?.daily_send_cap}건</dd></div>
          <div className="flex"><dt className="w-40 text-gray-500">동일 업체 쿨다운</dt><dd>{org?.per_company_cooldown_days}일</dd></div>
        </dl>
      </section>

      <section className="card p-5 text-sm space-y-3">
        <h2 className="font-semibold">발송 안전장치 안내</h2>
        <ul className="list-disc pl-5 text-gray-700 space-y-1">
          <li>모든 메일 제목에 <strong>(광고)</strong>가 자동으로 표기됩니다 (정보통신망법 제50조 ④항)</li>
          <li>본문 하단에 발신자 정보와 무료 수신거부 링크가 자동 삽입됩니다 (제50조 ⑤항)</li>
          <li>수신거부 이력이 있는 주소로의 발송이 자동 차단됩니다</li>
          <li>동일 업체에 쿨다운 기간 내 재발송이 차단됩니다</li>
          <li>일일 발송 한도를 초과하면 다음 날까지 발송이 거부됩니다</li>
          <li>Resend 웹훅으로 열람·바운스·신고 이벤트가 실시간 수집됩니다</li>
        </ul>
      </section>

      <section className="card p-5 text-sm space-y-2">
        <h2 className="font-semibold">직원 초대 (TODO)</h2>
        <p className="text-gray-500">초대 토큰을 생성해 직원에게 가입 링크를 전달할 수 있습니다. 다음 버전에서 추가.</p>
      </section>
    </div>
  );
}
