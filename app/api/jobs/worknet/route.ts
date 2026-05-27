import { NextResponse } from "next/server";
import { z } from "zod";
import { searchWorknet } from "@/lib/adapters/worknet";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  keyword: z.string().min(1),
  pageSize: z.number().min(1).max(100).optional(),
});

// 워크넷 키워드 검색 → 결과를 job_postings에 upsert (현재 사용자 조직)
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: "조직이 없습니다." }, { status: 400 });
  }

  let body;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "keyword 필요" }, { status: 400 }); }

  try {
    const items = await searchWorknet({ keyword: body.keyword, pageSize: body.pageSize ?? 30 });
    let inserted = 0;
    for (const it of items) {
      const { error } = await supabase.from("job_postings").upsert(
        {
          organization_id: profile.organization_id,
          source: it.source,
          source_url: it.source_url || null,
          external_id: it.external_id ?? null,
          company_name: it.company_name,
          position_title: it.position_title,
          location: it.location ?? null,
          employment_type: it.employment_type ?? null,
          experience: it.experience ?? null,
          posted_at: it.posted_at ?? null,
          expires_at: it.expires_at ?? null,
          status: "new",
          created_by: user.id,
        },
        { onConflict: "organization_id,source,source_url", ignoreDuplicates: true }
      );
      if (!error) inserted++;
    }
    return NextResponse.json({ ok: true, fetched: items.length, inserted });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "워크넷 호출 실패" }, { status: 500 });
  }
}
