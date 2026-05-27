import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// One-click 옵트아웃 (RFC 8058) — 메일 클라이언트가 POST로 호출
export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const admin = createServiceClient();
  const { data: msg } = await admin
    .from("email_messages")
    .select("organization_id, to_email")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!msg) return NextResponse.json({ error: "invalid token" }, { status: 404 });

  await admin.from("unsubscribes")
    .upsert({
      organization_id: msg.organization_id,
      email: msg.to_email.toLowerCase(),
      source: "link",
    }, { onConflict: "organization_id,email" });

  return NextResponse.json({ ok: true });
}
