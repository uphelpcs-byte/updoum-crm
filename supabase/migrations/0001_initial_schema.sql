-- ============================================================================
-- 업도움 CRM 초기 스키마
-- 멀티테넌트: 모든 도메인 테이블은 organization_id 로 격리, RLS 로 강제
-- ============================================================================

-- 확장
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 조직 (회사 1개 = 1 organization. 향후 멀티테넌트 SaaS 전환 가능)
-- ============================================================================
create table if not exists organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  -- 발송 안전장치
  daily_send_cap          int  not null default 50,
  per_company_cooldown_days int not null default 30,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- 프로필 (auth.users 1:1 확장)
-- ============================================================================
create type member_role as enum ('owner', 'manager', 'member');

create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references organizations(id) on delete set null,
  email            text not null,
  full_name        text,
  role             member_role not null default 'member',
  created_at       timestamptz not null default now()
);
create index on profiles(organization_id);

-- 초대 코드 (대표가 직원 초대 시 생성)
create table if not exists invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  email            text not null,
  role             member_role not null default 'member',
  token            text not null unique,
  invited_by       uuid references profiles(id),
  expires_at       timestamptz not null default now() + interval '14 days',
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index on invites(token);

-- ============================================================================
-- 채용 공고
-- ============================================================================
create type job_source as enum ('jobkorea', 'saramin', 'rocketpunch', 'worknet', 'manual', 'other');
create type job_status as enum ('new', 'qualified', 'rejected', 'archived');

create table if not exists job_postings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  source           job_source not null default 'manual',
  source_url       text,
  external_id      text,           -- 워크넷 wantedAuthNo 등
  company_name     text not null,
  position_title   text not null,
  location         text,
  employment_type  text,           -- 정규/계약/외주 등
  experience       text,           -- 신입/경력/무관
  description      text,
  posted_at        date,
  expires_at       date,
  status           job_status not null default 'new',
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  unique (organization_id, source, source_url)
);
create index on job_postings(organization_id, status);
create index on job_postings(organization_id, company_name);

-- ============================================================================
-- 타겟 업체 (공고에서 추출. 동일 회사가 여러 공고를 올릴 수 있으므로 분리)
-- ============================================================================
create type lead_status as enum (
  'untouched',   -- 미접촉
  'contacted',   -- 메일 발송
  'replied',     -- 회신 옴
  'meeting',     -- 미팅 예정/완료
  'won',         -- 계약 체결
  'lost',        -- 결렬
  'do_not_contact' -- 영구 차단
);

create table if not exists companies (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  domain           text,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  industry         text,
  size             text,
  status           lead_status not null default 'untouched',
  last_contacted_at timestamptz,
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  unique (organization_id, name)
);
create index on companies(organization_id, status);
-- 대소문자 무시 검색을 위한 인덱스 (uniqueness는 위 unique 제약이 담당)
create index if not exists companies_org_lower_name on companies(organization_id, lower(name));

-- 공고 ↔ 업체 (1:N. 한 공고는 한 업체에 귀속)
alter table job_postings
  add column if not exists company_id uuid references companies(id) on delete set null;

-- ============================================================================
-- 제안서 템플릿
-- 변수 치환 가능 (예: {{company_name}}, {{position}}, {{my_name}})
-- ============================================================================
create table if not exists proposal_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  subject          text not null,
  body_html        text not null,     -- 리치 HTML 본문 (변수 포함)
  attachment_path  text,              -- supabase storage 경로 (PDF 등)
  is_default       boolean not null default false,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on proposal_templates(organization_id);

-- ============================================================================
-- 콜드메일 캠페인 (1 캠페인 = 1 발송)
-- ============================================================================
create type email_status as enum (
  'queued', 'sending', 'sent', 'delivered',
  'opened', 'clicked', 'replied',
  'bounced', 'complained', 'failed', 'blocked'
);

create table if not exists email_messages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  company_id       uuid references companies(id) on delete set null,
  job_posting_id   uuid references job_postings(id) on delete set null,
  template_id      uuid references proposal_templates(id) on delete set null,
  to_email         text not null,
  to_name          text,
  from_email       text not null,
  from_name        text,
  subject          text not null,
  body_html        text not null,
  attachment_path  text,
  -- Resend
  provider_message_id text,
  status           email_status not null default 'queued',
  -- 옵트아웃 토큰
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  -- 이벤트 타임스탬프
  sent_at          timestamptz,
  delivered_at     timestamptz,
  first_opened_at  timestamptz,
  replied_at       timestamptz,
  failed_at        timestamptz,
  failure_reason   text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now()
);
create index on email_messages(organization_id, status);
create index on email_messages(organization_id, created_at desc);
create index on email_messages(unsubscribe_token);

-- 개별 이벤트 (열람·클릭·바운스 로그)
create table if not exists email_events (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid not null references email_messages(id) on delete cascade,
  event_type       text not null,    -- delivered, opened, clicked, bounced, complained
  payload          jsonb,
  occurred_at      timestamptz not null default now()
);
create index on email_events(message_id, occurred_at desc);

-- ============================================================================
-- 수신거부 (영구 보관. 정보통신망법 준수)
-- ============================================================================
create table if not exists unsubscribes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  email            text not null,
  reason           text,
  source           text,             -- 'link', 'complaint', 'manual'
  created_at       timestamptz not null default now(),
  unique (organization_id, email)
);
create index on unsubscribes(organization_id, email);

-- ============================================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================================
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_proposal_templates_updated
  before update on proposal_templates
  for each row execute function touch_updated_at();

-- ============================================================================
-- 트리거: 회원가입 시 profiles 자동 생성
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 헬퍼 함수: 현재 사용자의 organization_id
-- ============================================================================
create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- ============================================================================
-- RLS 활성화 및 정책
-- ============================================================================
alter table organizations       enable row level security;
alter table profiles            enable row level security;
alter table invites             enable row level security;
alter table job_postings        enable row level security;
alter table companies           enable row level security;
alter table proposal_templates  enable row level security;
alter table email_messages      enable row level security;
alter table email_events        enable row level security;
alter table unsubscribes        enable row level security;

-- organizations: 자신이 속한 조직만 read, owner만 update
create policy org_select on organizations for select
  using (id = current_org_id());
create policy org_update on organizations for update
  using (id = current_org_id() and exists(
    select 1 from profiles where id = auth.uid() and role = 'owner'
  ));

-- profiles: 본인 + 동일 조직 멤버 read, 본인만 update, owner는 조직 멤버 update
create policy profile_select on profiles for select
  using (id = auth.uid() or organization_id = current_org_id());
create policy profile_update_self on profiles for update
  using (id = auth.uid());
create policy profile_insert_self on profiles for insert
  with check (id = auth.uid());

-- invites: 조직 owner/manager만 관리, 가입 시 token으로 조회는 별도 서버키 경로 사용
create policy invite_select on invites for select
  using (organization_id = current_org_id());
create policy invite_modify on invites for all
  using (organization_id = current_org_id() and exists(
    select 1 from profiles where id = auth.uid() and role in ('owner','manager')
  ));

-- 공통 패턴: organization_id = current_org_id()
create policy job_all on job_postings for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

create policy company_all on companies for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

create policy proposal_all on proposal_templates for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

create policy email_msg_all on email_messages for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

create policy email_event_select on email_events for select
  using (exists(
    select 1 from email_messages m
    where m.id = email_events.message_id and m.organization_id = current_org_id()
  ));

create policy unsub_all on unsubscribes for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());
