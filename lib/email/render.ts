import { env } from "@/lib/env";

// 정보통신망법 제50조 ⑤항: 본문에 발신자 정보·무료 수신거부 의사표시 수단 명시
// 제목 앞에 (광고) 표기 (제50조 ④항)
export interface AdRenderOptions {
  senderName: string;       // 발신자(법인) 이름
  senderAddress?: string;   // 사업장 주소 (선택)
  senderPhone?: string;     // 연락처 (선택)
  unsubscribeUrl: string;   // 옵트아웃 링크 (필수)
}

export function applyAdSubject(subject: string): string {
  const trimmed = subject.trim();
  if (/^\(광고\)/.test(trimmed)) return trimmed;   // 이미 표기되어 있으면 중복 방지
  return `(광고) ${trimmed}`;
}

export function appendComplianceFooter(html: string, opts: AdRenderOptions): string {
  const lines = [
    `<strong>${escapeHtml(opts.senderName)}</strong>`,
    opts.senderAddress ? escapeHtml(opts.senderAddress) : "",
    opts.senderPhone ? `연락처: ${escapeHtml(opts.senderPhone)}` : "",
  ].filter(Boolean).join(" · ");

  const footer = `
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px" />
<div style="font-size:11px;color:#6b7280;line-height:1.6">
  본 메일은 ${escapeHtml(opts.senderName)}이(가) 발송한 광고성 정보입니다.<br/>
  ${lines}<br/>
  수신을 원치 않으시면 <a href="${opts.unsubscribeUrl}" style="color:#2563eb">여기를 클릭</a>하여 수신거부할 수 있습니다.
  (수신거부는 무료이며, 영구적으로 적용됩니다)
</div>`;

  return html + footer;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

export function unsubscribeUrl(token: string): string {
  return `${env.appUrl()}/unsubscribe?t=${encodeURIComponent(token)}`;
}
