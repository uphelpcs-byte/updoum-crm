import * as cheerio from "cheerio";
import { fetchHtml, pickText, type ParsedJob, type SiteAdapter } from "./base";

// 알 수 없는 사이트는 OpenGraph 메타로 최선 추측. 실패해도 사용자가 수동 보완 가능.
export const genericAdapter: SiteAdapter = {
  source: "other",
  matches: () => true,
  async parse(url) {
    let html = "";
    try { html = await fetchHtml(url.toString()); } catch { /* 차단/실패해도 빈 결과로 진행 */ }
    const $ = cheerio.load(html || "<html></html>");
    const title =
      pickText($('meta[property="og:title"]').attr("content")) ||
      pickText($("title").first().text());
    const site =
      pickText($('meta[property="og:site_name"]').attr("content")) ||
      url.hostname;
    const desc = pickText($('meta[name="description"]').attr("content"));
    return {
      source: "other",
      source_url: url.toString(),
      company_name: site,
      position_title: title || "(제목 미상)",
      description: desc || null,
    };
  },
};
