import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import { renderTemplate } from "@/lib/utils";
import { resend } from "@/lib/email/resend";
import { applyAdSubject, appendComplianceFooter, unsubscribeUrl } from "@/lib/email/render";

const Body = z.object({
  templateId: z.string().uuid(),
  jobPostingId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  toEmail: z.string().email(),
  toName: z.string().optional().default(""),
  vars: z.record(z.string()).optional().default({}),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, full_name, email")
    .eq("id", user.id).single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: "조직이 없습니다." }, { status: 400 });
  }
  const orgId = profile.organization_id;

  let parsed: z.infer<typeof Body>;
  try { parsed = Body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "유효성 검증 실패" }, { status: 400 }); }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, daily_send_cap, per_company_cooldown_days")
    .eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "조직 정보 없음" }, { status: 500 });

  const admin = createServiceClient();   // 안전장치 검증은 RLS 우회로 더 정확하게

  // 1) 수신거부 이력 검사
  const { data: unsub } = await admin
    .from("unsubscribes")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", parsed.toEmail.toLowerCase())
    .maybeSingle();
  if (unsub) {
    return NextResponse.json({ error: "이 주소는 수신거부 처리되었습니다." }, { status: 422 });
  }

  // 2) 일일 발송 캡 (조직 단위)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count: todayCount } = await admin
    .from("email_messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", today.toISOString());
  if ((todayCount ?? 0) >= (org.daily_send_cap ?? env.emailDailyCap())) {
    return NextResponse.json({
      error: `일일 발송 한도 초과 (${org.daily_send_cap}건). 내일 다시 시도해주세요.`,
    }, { status: 429 });
  }

  // 3) 동일 업체 쿨다운 (per_company_cooldown_days)
  if (parsed.companyId) {
    const cooldownDays = org.per_company_cooldown_days ?? env.emailPerCompanyCooldownDays();
    const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("email_messages")
      .select("id, created_at")
      .eq("organization_id", orgId)
      .eq("company_id", parsed.companyId)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      return NextResponse.json({
        error: `동일 업체에 ${cooldownDays}일 내 발송 이력이 있습니다. 쿨다운 종료 후 재시도해주세요.`,
      }, { status: 422 });
    }
  }

  // 4) 템플릿 로드
  const { data: tpl } = await supabase
    .from("proposal_templates")
    .select("id, subject, body_html, attachment_path")
    .eq("id", parsed.templateId)
    .single();
  if (!tpl) return NextResponse.json({ error: "템플릿 없음" }, { status: 404 });

  // 5) 본문 렌더링 + (광고) 제목 + 컴플라이언스 푸터
  const renderedSubject = applyAdSubject(renderTemplate(tpl.subject, parsed.vars));
  const renderedBody = renderTemplate(tpl.body_html, parsed.vars);

  // 6) email_messages 사전 생성 (토큰 발급용)
  const { data: msgRow, error: insErr } = await admin
    .from("email_messages")
    .insert({
      organization_id: orgId,
      company_id: parsed.companyId ?? null,
      job_posting_id: parsed.jobPostingId ?? null,
      template_id: tpl.id,
      to_email: parsed.toEmail,
      to_name: parsed.toName || null,
      from_email: env.resendFromEmail(),
      from_name: org.name,
      subject: renderedSubject,
      body_html: renderedBody, // 푸터 삽입 전 본문. 푸터 포함본은 발송 후 갱신
      attachment_path: tpl.attachment_path,
      status: "queued",
      created_by: user.id,
    })
    .select("id, unsubscribe_token")
    .single();
  if (insErr || !msgRow) {
    return NextResponse.json({ error: insErr?.message ?? "메시지 생성 실패" }, { status: 500 });
  }

  // 7) 옵트아웃 링크 삽입한 최종 본문
  const finalBody = appendComplianceFooter(renderedBody, {
    senderName: org.name,
    unsubscribeUrl: unsubscribeUrl(msgRow.unsubscribe_token),
  });

  // 8) 첨부 로드 (있으면)
  let attachments: { filename: string; content: string }[] | undefined;
  if (tpl.attachment_path) {
    const { data: file } = await admin.storage.from("proposals").download(tpl.attachment_path);
    if (file) {
      const ab = await file.arrayBuffer();
      const filename = tpl.attachment_path.split("/").pop() ?? "proposal.pdf";
      attachments = [{ filename, content: Buffer.from(ab).toString("base64") }];
    }
  }

  // 9) Resend 발송
  try {
    const sent = await resend().emails.send({
      from: env.resendFromEmail(),
      to: parsed.toEmail,
      subject: renderedSubject,
      html: finalBody,
      attachments,
      headers: {
        // 메일 클라이언트 옵트아웃 표준 헤더 (RFC 8058)
        "List-Unsubscribe": `<${unsubscribeUrl(msgRow.unsubscribe_token)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (sent.error) throw new Error(sent.error.message);

    await admin.from("email_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: sent.data?.id ?? null,
        body_html: finalBody,
      })
      .eq("id", msgRow.id);

    if (parsed.companyId) {
      await admin.from("companies")
        .update({ status: "contacted", last_contacted_at: new Date().toISOString() })
        .eq("id", parsed.companyId);
    }

    return NextResponse.json({ ok: true, messageId: msgRow.id, providerMessageId: sent.data?.id });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "발송 실패";
    await admin.from("email_messages")
      .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: reason })
      .eq("id", msgRow.id);
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
