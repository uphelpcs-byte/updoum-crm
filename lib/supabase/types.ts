// 가벼운 수동 타입. 본격 도입 시 `supabase gen types typescript`로 자동 생성 권장.
export type MemberRole = "owner" | "manager" | "member";
export type JobSource = "jobkorea" | "saramin" | "rocketpunch" | "worknet" | "manual" | "other";
export type JobStatus = "new" | "qualified" | "rejected" | "archived";
export type LeadStatus =
  | "untouched" | "contacted" | "replied" | "meeting" | "won" | "lost" | "do_not_contact";
export type EmailStatus =
  | "queued" | "sending" | "sent" | "delivered"
  | "opened" | "clicked" | "replied"
  | "bounced" | "complained" | "failed" | "blocked";

// ---- Row 타입 (실제 DB 컬럼 모양) ----
export interface OrganizationRow {
  id: string; name: string;
  daily_send_cap: number; per_company_cooldown_days: number;
  created_at: string;
}
export interface ProfileRow {
  id: string; organization_id: string | null; email: string;
  full_name: string | null; role: MemberRole; created_at: string;
}
export interface InviteRow {
  id: string; organization_id: string; email: string; role: MemberRole;
  token: string; invited_by: string | null;
  expires_at: string; accepted_at: string | null; created_at: string;
}
export interface JobPostingRow {
  id: string; organization_id: string; source: JobSource;
  source_url: string | null; external_id: string | null;
  company_name: string; position_title: string;
  location: string | null; employment_type: string | null; experience: string | null;
  description: string | null; posted_at: string | null; expires_at: string | null;
  status: JobStatus; notes: string | null;
  company_id: string | null; created_by: string | null; created_at: string;
}
export interface CompanyRow {
  id: string; organization_id: string; name: string;
  domain: string | null; contact_name: string | null;
  contact_email: string | null; contact_phone: string | null;
  industry: string | null; size: string | null;
  status: LeadStatus; last_contacted_at: string | null;
  notes: string | null; created_by: string | null; created_at: string;
}
export interface ProposalTemplateRow {
  id: string; organization_id: string; name: string;
  subject: string; body_html: string;
  attachment_path: string | null; is_default: boolean;
  created_by: string | null; created_at: string; updated_at: string;
}
export interface EmailMessageRow {
  id: string; organization_id: string;
  company_id: string | null; job_posting_id: string | null; template_id: string | null;
  to_email: string; to_name: string | null;
  from_email: string; from_name: string | null;
  subject: string; body_html: string; attachment_path: string | null;
  provider_message_id: string | null;
  status: EmailStatus; unsubscribe_token: string;
  sent_at: string | null; delivered_at: string | null;
  first_opened_at: string | null; replied_at: string | null;
  failed_at: string | null; failure_reason: string | null;
  created_by: string | null; created_at: string;
}
export interface EmailEventRow {
  id: string; message_id: string; event_type: string;
  payload: unknown; occurred_at: string;
}
export interface UnsubscribeRow {
  id: string; organization_id: string; email: string;
  reason: string | null; source: string | null; created_at: string;
}

// ---- Database 제네릭 (Supabase 클라이언트가 요구하는 모양) ----
// Insert/Update는 자기참조 없이 명시적으로 풀어 씁니다 (순환 추론 방지).
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: { id?: string; name: string; daily_send_cap?: number; per_company_cooldown_days?: number; created_at?: string };
        Update: Partial<{ name: string; daily_send_cap: number; per_company_cooldown_days: number }>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: { id: string; email: string; full_name?: string | null; organization_id?: string | null; role?: MemberRole; created_at?: string };
        Update: Partial<{ organization_id: string | null; full_name: string | null; role: MemberRole; email: string }>;
      };
      invites: {
        Row: InviteRow;
        Insert: { id?: string; organization_id: string; email: string; role?: MemberRole; token: string; invited_by?: string | null; expires_at?: string };
        Update: Partial<{ accepted_at: string | null; expires_at: string }>;
      };
      job_postings: {
        Row: JobPostingRow;
        Insert: {
          id?: string; organization_id: string; source?: JobSource;
          source_url?: string | null; external_id?: string | null;
          company_name: string; position_title: string;
          location?: string | null; employment_type?: string | null; experience?: string | null;
          description?: string | null; posted_at?: string | null; expires_at?: string | null;
          status?: JobStatus; notes?: string | null;
          company_id?: string | null; created_by?: string | null;
        };
        Update: Partial<JobPostingRow>;
      };
      companies: {
        Row: CompanyRow;
        Insert: {
          id?: string; organization_id: string; name: string;
          domain?: string | null; contact_name?: string | null;
          contact_email?: string | null; contact_phone?: string | null;
          industry?: string | null; size?: string | null;
          status?: LeadStatus; last_contacted_at?: string | null;
          notes?: string | null; created_by?: string | null;
        };
        Update: Partial<CompanyRow>;
      };
      proposal_templates: {
        Row: ProposalTemplateRow;
        Insert: {
          id?: string; organization_id: string; name: string;
          subject: string; body_html: string;
          attachment_path?: string | null; is_default?: boolean;
          created_by?: string | null;
        };
        Update: Partial<ProposalTemplateRow>;
      };
      email_messages: {
        Row: EmailMessageRow;
        Insert: {
          id?: string; organization_id: string;
          company_id?: string | null; job_posting_id?: string | null; template_id?: string | null;
          to_email: string; to_name?: string | null;
          from_email: string; from_name?: string | null;
          subject: string; body_html: string; attachment_path?: string | null;
          provider_message_id?: string | null;
          status?: EmailStatus; unsubscribe_token?: string;
          sent_at?: string | null; delivered_at?: string | null;
          first_opened_at?: string | null; replied_at?: string | null;
          failed_at?: string | null; failure_reason?: string | null;
          created_by?: string | null;
        };
        Update: Partial<EmailMessageRow>;
      };
      email_events: {
        Row: EmailEventRow;
        Insert: { message_id: string; event_type: string; payload?: unknown };
        Update: never;
      };
      unsubscribes: {
        Row: UnsubscribeRow;
        Insert: { organization_id: string; email: string; reason?: string | null; source?: string | null };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      member_role: MemberRole;
      job_source: JobSource;
      job_status: JobStatus;
      lead_status: LeadStatus;
      email_status: EmailStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
