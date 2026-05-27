import { Resend } from "resend";
import { env } from "@/lib/env";

let _client: Resend | null = null;
export function resend(): Resend {
  if (!_client) _client = new Resend(env.resendApiKey());
  return _client;
}
