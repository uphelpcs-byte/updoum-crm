import * as cheerio from "cheerio";
import { fetchHtml, pickText, type ParsedJob, type SiteAdapter } from "./base";

export const rocketpunchAdapter: SiteAdapter = {
  source: "rocketpunch",
  matches: (url) => /(^|\.)rocketpunch\.com$/i.test(url.hostname),
  async parse(url) {
    const html = await fetchHtml(url.toString());
    const $ = cheerio.load(html);

    const title =
      pickText($('meta[property="og:title"]').attr("content")) ||
      pickText($("h1.position-title, h1").first().text());
    const company =
      pickText($('meta[property="og:site_name"]').attr("content")) ||
      pickText($(".company-name a, .company a").first().text());
    const desc =
      pickText($('meta[name="description"]').attr("content")) ||
      pickText($(".job-description, .description").first().text()).slice(0, 1000);

    return {
      source: "rocketpunch",
      source_url: url.toString(),
      company_name: company || "(로켓펀치 공고)",
      position_title: title || "(제목 미상)",
      description: desc || null,
    };
  },
};
