import * as cheerio from "cheerio";
import { fetchHtml, pickText, type ParsedJob, type SiteAdapter } from "./base";

// 참고: 잡코리아는 약관상 자동 크롤링을 금지합니다.
// 본 어댑터는 "사용자가 직접 등록한 URL 1건"의 메타 정보를 1회 파싱하는 용도로만 사용해야 합니다.
// 봇 차단(Cloudflare 등)에 막히면 사용자가 폼에 수동 입력하도록 안내합니다.
export const jobkoreaAdapter: SiteAdapter = {
  source: "jobkorea",
  matches: (url) => /(^|\.)jobkorea\.co\.kr$/i.test(url.hostname),
  async parse(url) {
    const html = await fetchHtml(url.toString());
    const $ = cheerio.load(html);

    const company =
      pickText($('meta[property="og:site_name"]').attr("content")) ||
      pickText($(".coName, .company a, .tplCo").first().text());
    const title =
      pickText($('meta[property="og:title"]').attr("content")) ||
      pickText($("h3.hd_3, .tit-job, .tit").first().text());
    const desc =
      pickText($('meta[name="description"]').attr("content")) ||
      pickText($(".tbList, .jvIntro").first().text()).slice(0, 1000);

    const job: ParsedJob = {
      source: "jobkorea",
      source_url: url.toString(),
      external_id: url.searchParams.get("Gno") || url.searchParams.get("rno") || null,
      company_name: company || "(잡코리아 공고)",
      position_title: title || "(제목 미상)",
      description: desc || null,
    };
    return job;
  },
};
