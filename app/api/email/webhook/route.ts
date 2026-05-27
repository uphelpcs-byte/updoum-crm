import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";

// Resend Webhooks: delivered, opened, clicked, bounced, complained
// 서명 검증: Svix 호환. resend의 webhook secret으로 검증.
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = env.resendWebhookSecret();

  if (secret) {
    const id = req.headers.get("svix-id") ?? "";
    const ts = req.headers.get("svix-timestamp") ?? "";
    const sig = req.headers.get("svix-signature") ?? "";
    const signedPayload = `${id}.${ts}.${raw}`;
    const key = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const keyBuf = Buffer.from(key, "base64");
    const expected = crypto.createHmac("sha256", keyBuf).update(signedPayload).digest("base64");
    const ok = sig.split(" ").some((s) => s.split(",")[1] === expected);
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const eventType: string = body.type ?? "";   // 예: "email.delivered"
  const providerMessageId: string | undefined = body.data?.email_id;
  if (!providerMessageId) return NextResponse.json({ ok: true });

  const admin = createServiceClient();
  const { data: msg } = await admin
    .from("email_messages")
    .select("id, organization_id, to_email")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (!msg) return NextResponse.json({ ok: true });

  // 이벤트 적재
  await admin.from("email_events").insert({
    message_id: msg.id,
    event_type: eventType,
    payload: body,
  });

  // 상태 업데이트
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  switch (eventType) {
    case "email.delivered":
      patch.status = "delivered"; patch.delivered_at = now; break;
    case "email.opened":
      patch.status = "opened"; patch.first_opened_at = now; break;
    case "email.clicked":
      patch.status = "clicked"; break;
    case "email.bounced":
      patch.status = "bounced"; patch.failed_at = now; patch.failure_reason = "bounced"; break;
    case "email.complained":
      patch.status = "complained"; patch.failed_at = now;
      // 신고는 영구 수신거부
      await admin.from("unsubscribes")
        .upsert({
          organization_id: msg.organization_id,
          email: msg.to_email.toLowerCase(),
          source: "complaint",
        }, { onConflict: "organization_id,email" });
      break;
  }
  if (Object.keys(patch).length > 0) {
    await admin.from("email_messages").update(patch).eq("id", msg.id);
  }
  return NextResponse.json({ ok: true });
}
