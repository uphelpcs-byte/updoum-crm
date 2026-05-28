import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// 통합 회원가입 라우트:
// - admin.createUser(email_confirm: true) 로 이메일 인증 우회
// - signInWithPassword 로 SSR 쿠키 세팅 (이후 인증 상태 유지)
// - 초대토큰 있으면 합류, 없으면 신규 조직 생성 + owner 지정
// Supabase의 "Confirm email" 설정과 무관하게 즉시 로그인 상태가 됩니다.

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  orgName: z.string().optional(),
  inviteToken: z.string().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "유효성 검증 실패" }, { status: 400 });
  }

  const admin = createServiceClient();

  // 1) 사용자 생성 (이메일 자동 confirm)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.fullName },
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "사용자 생성 실패";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const userId = created.user.id;

  // 2) SSR 클라이언트로 로그인 (응답 쿠키에 세션 세팅)
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 500 });
  }

  // 3) 조직 합류 또는 신규 생성
  if (body.inviteToken) {
    const { data: invite } = await admin
      .from("invites")
      .select("*")
      .eq("token", body.inviteToken)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!invite) {
      return NextResponse.json({ error: "유효하지 않거나 만료된 초대입니다." }, { status: 400 });
    }
    if (invite.email.toLowerCase() !== body.email.toLowerCase()) {
      return NextResponse.json({ error: "초대 이메일과 가입 이메일이 다릅니다." }, { status: 400 });
    }
    await admin.from("profiles")
      .update({ organization_id: invite.organization_id, role: invite.role })
      .eq("id", userId);
    await admin.from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return NextResponse.json({ ok: true });
  }

  if (!body.orgName || !body.orgName.trim()) {
    return NextResponse.json({ error: "회사명을 입력해주세요." }, { status: 400 });
  }
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: body.orgName.trim() })
    .select("id")
    .single();
  if (orgErr || !org) {
    return NextResponse.json({ error: orgErr?.message ?? "조직 생성 실패" }, { status: 500 });
  }
  await admin.from("profiles")
    .update({ organization_id: org.id, role: "owner" })
    .eq("id", userId);

  return NextResponse.json({ ok: true, organizationId: org.id });
}
