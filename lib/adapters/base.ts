import type { JobSource } from "@/lib/supabase/types";

export interface ParsedJob {
  source: JobSource;
  source_url: string;
  external_id?: string | null;
  company_name: string;
  position_title: string;
  location?: string | null;
  employment_type?: string | null;
  experience?: string | null;
  description?: string | null;
  posted_at?: string | null;   // ISO date
  expires_at?: string | null;
}

export interface SiteAdapter {
  source: JobSource;
  matches(url: URL): boolean;
  parse(url: URL): Promise<ParsedJob>;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      "accept": "text/html,application/xhtml+xml",
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return await res.text();
}

export function pickText(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
