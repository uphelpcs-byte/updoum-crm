import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "../template-editor";

const DEFAULT_BODY = `<p>안녕하세요, {{company_name}} {{to_name}}님.</p>

<p><strong>업도움</strong>입니다. {{position}} 채용 공고를 보고 연락드립니다.</p>

<p>업도움은 스타트업·이커머스 50여 곳의 CS 외주를 운영해온 전문 팀으로,
직접 채용보다 <strong>30~50% 비용 절감</strong>과 <strong>2주 내 인입</strong>이 가능합니다.</p>

<ul>
  <li>채널톡·카카오톡·이메일 멀티채널 응대</li>
  <li>월 1,000건 기준 70만원~ (트래픽별 합리적 산정)</li>
  <li>주말·야간 옵션 가능</li>
</ul>

<p>첨부드린 제안서를 한 번 검토 부탁드리며, 짧은 미팅을 요청드려도 될까요?</p>

<p>감사합니다.<br/>업도움 드림</p>`;

export default async function NewProposalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">새 제안서 템플릿</h1>
      <TemplateEditor
        mode="create"
        initial={{
          name: "기본 콜드메일",
          subject: "{{company_name}} {{position}} 관련 — CS 외주 제안 드립니다",
          body_html: DEFAULT_BODY,
          is_default: true,
        }}
      />
    </div>
  );
}
