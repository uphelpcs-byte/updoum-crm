import * as cheerio from "cheerio";
import { fetchHtml, pickText, type ParsedJob, type SiteAdapter } from "./base";

// 사람인 — 약관 동일. 사용자 직접 등록 URL 1건 파싱 용도.
export const saraminAdapter: SiteAdapter = {
  source: "saramin",
  matches: (url) => /(^|\.)saramin\.co\.kr$/i.test(url.hostname),
  async parse(url) {
    const html = await fetchHtml(url.toString());
    const $ = cheerio.load(html);

    const company =
      pickText($('meta[property="og:site_name"]').attr("content")) ||
      pickText($(".company_name, .corp_name a").first().text());
    const title =
      pickText($('meta[property="og:title"]').attr("content")) ||
      pickText($(".tit_job, h1.tit_job").first().text());
    const location = pickText($('.work_place, .recruit_summary .work_place').first().text());
    const desc =
      pickText($('meta[name="description"]').attr("content")) ||
      pickText($(".job_summary, .user_content").first().text()).slice(0, 1000);

    return {
      source: "saramin",
      source_url: url.toString(),
      external_id: url.searchParams.get("rec_idx") || null,
      company_name: company || "(사람인 공고)",
      position_title: title || "(제목 미상)",
      location: location || null,
      description: desc || null,
    };
  },
};
