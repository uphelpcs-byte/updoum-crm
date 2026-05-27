import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// 회원가입 직후 호출. 두 가지 모드:
// 1) inviteToken 있음 → 해당 조직 멤버로 합류
// 2) 없음 → 신규 organization 생성 + 본인을 owner로 지정
export async function POST(req: Request) {
  const { orgName, inviteToken } = (await req.json()) as { orgName?: string; inviteToken?: string };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createServiceClient();

  if (inviteToken) {
    const { data: invite, error } = await admin
      .from("invites")
      .select("*")
      .eq("token", inviteToken)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error || !invite) {
      return NextResponse.json({ error: "유효하지 않거나 만료된 초대입니다." }, { status: 400 });
    }
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: "초대 이메일과 가입 이메일이 일치하지 않습니다." }, { status: 400 });
    }
    await admin.from("profiles")
      .update({ organization_id: invite.organization_id, role: invite.role })
      .eq("id", user.id);
    await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    return NextResponse.json({ ok: true });
  }

  if (!orgName || !orgName.trim()) {
    return NextResponse.json({ error: "회사명을 입력해주세요." }, { status: 400 });
  }
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName.trim() })
    .select("id")
    .single();
  if (orgErr || !org) {
    return NextResponse.json({ error: orgErr?.message ?? "조직 생성 실패" }, { status: 500 });
  }
  await admin.from("profiles")
    .update({ organization_id: org.id, role: "owner" })
    .eq("id", user.id);
  return NextResponse.json({ ok: true, organizationId: org.id });
}
