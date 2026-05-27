import { jobkoreaAdapter } from "./jobkorea";
import { saraminAdapter } from "./saramin";
import { rocketpunchAdapter } from "./rocketpunch";
import { genericAdapter } from "./generic";
import type { ParsedJob, SiteAdapter } from "./base";

const ADAPTERS: SiteAdapter[] = [
  jobkoreaAdapter,
  saraminAdapter,
  rocketpunchAdapter,
];

export async function parseJobUrl(rawUrl: string): Promise<ParsedJob> {
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new Error("유효한 URL이 아닙니다."); }
  const adapter = ADAPTERS.find((a) => a.matches(url)) ?? genericAdapter;
  return adapter.parse(url);
}
