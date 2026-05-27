import { env } from "@/lib/env";
import type { ParsedJob } from "./base";

// 워크넷 채용정보 OpenAPI (공공데이터포털)
// 신청: https://www.data.go.kr/data/15123399/openapi.do
// 응답은 XML — 키워드(예: "CS", "고객센터", "콜센터")로 검색해 가져옵니다.
const ENDPOINT = "https://openapi.work.go.kr/opi/opi/opia/wantedApi.do";

export interface WorknetSearchOptions {
  keyword: string;       // 예: "CS", "고객센터"
  pageSize?: number;     // 기본 30
  pageNum?: number;      // 기본 1
}

export async function searchWorknet(opts: WorknetSearchOptions): Promise<ParsedJob[]> {
  const key = env.worknetApiKey();
  if (!key) throw new Error("WORKNET_API_KEY가 설정되어 있지 않습니다.");

  const params = new URLSearchParams({
    authKey: key,
    callTp: "L",
    returnType: "XML",
    startPage: String(opts.pageNum ?? 1),
    display: String(opts.pageSize ?? 30),
    keyword: opts.keyword,
  });
  const res = await fetch(`${ENDPOINT}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`worknet api ${res.status}`);
  const xml = await res.text();
  return parseWorknetXml(xml);
}

// 외부 의존 없이 가벼운 XML 파싱 (필드 평탄해서 정규식으로 충분)
function parseWorknetXml(xml: string): ParsedJob[] {
  const items: ParsedJob[] = [];
  const blocks = xml.match(/<wanted>[\s\S]*?<\/wanted>/g) ?? [];
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
  };
  for (const b of blocks) {
    const wantedAuthNo = pick(b, "wantedAuthNo");
    const company = pick(b, "company");
    const title = pick(b, "title");
    const region = pick(b, "region");
    const empType = pick(b, "empType");
    const career = pick(b, "career");
    const startDate = pick(b, "regDt");
    const closeDate = pick(b, "closeDt");
    const detailUrl = pick(b, "wantedInfoUrl");
    items.push({
      source: "worknet",
      source_url: detailUrl,
      external_id: wantedAuthNo,
      company_name: company || "(미상)",
      position_title: title || "(제목 미상)",
      location: region || null,
      employment_type: empType || null,
      experience: career || null,
      posted_at: startDate || null,
      expires_at: closeDate || null,
    });
  }
  return items;
}
