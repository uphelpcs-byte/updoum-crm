import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJobUrl } from "@/lib/adapters";

const Body = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "url이 필요합니다." }, { status: 400 }); }
  try {
    const parsed = await parseJobUrl(body.url);
    return NextResponse.json({ ok: true, parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "파싱 실패";
    // 차단 등으로 실패해도 사용자가 수동 입력으로 진행할 수 있도록 200 + 안내
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
