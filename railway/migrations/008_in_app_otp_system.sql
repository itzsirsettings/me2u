-- ============================================================
-- In-App OTP Verification System
-- Railway-native: self-contained.
-- Uses set_updated_at() from 001.
-- ============================================================

-- OTP purpose enum
do $$ begin
  create type otp_purpose_type as enum ('register', 'login', 'password_reset');
exception when duplicate_object then null; end $$;

-- OTP codes table
create table if not exists otp_codes (
  id              uuid primary key default gen_random_uuid(),
  identifier      text not null,
  code            text not null,
  purpose         otp_purpose_type not null,
  expires_at      timestamptz not null,
  verified        boolean not null default false,
  attempts        integer not null default 0,
  last_attempt_at timestamptz,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_otp_codes_identifier_purpose
  on otp_codes(identifier, purpose, verified, expires_at desc);
create index if not exists idx_otp_codes_expires_at
  on otp_codes(expires_at) where verified = false;
create index if not exists idx_otp_codes_created_at
  on otp_codes(created_at desc);

create trigger otp_codes_set_updated_at
  before update on otp_codes
  for each row execute function public.set_updated_at();

comment on table otp_codes is 'Self-contained OTP verification codes - no external email/SMS services';
comment on column otp_codes.identifier is 'Email or phone number that requested OTP';
comment on column otp_codes.code is '6-digit verification code';
comment on column otp_codes.purpose is 'What the OTP is for: register, login, or password_reset';
comment on column otp_codes.expires_at is 'When this OTP expires (10 minutes from creation)';
comment on column otp_codes.verified is 'Whether this OTP has been successfully verified';
comment on column otp_codes.attempts is 'Number of failed verification attempts';

-- Increment attempt counter
create or replace function increment_otp_attempt(p_id uuid)
returns void language plpgsql as $$
begin
  update otp_codes
  set attempts = attempts + 1,
      last_attempt_at = now()
  where id = p_id;
end;
$$;

comment on function increment_otp_attempt is 'Track failed OTP verification attempts';

-- Get active OTP for identifier
create or replace function get_active_otp(
  p_identifier text,
  p_purpose otp_purpose_type
)
returns table (
  code text,
  expires_at timestamptz,
  created_at timestamptz,
  minutes_until_expiry integer
)
language plpgsql stable as $$
begin
  return query
  select
    otp.code,
    otp.expires_at,
    otp.created_at,
    greatest(0, extract(epoch from (otp.expires_at - now()))::integer / 60) as minutes_until_expiry
  from otp_codes otp
  where otp.identifier = p_identifier
    and otp.purpose = p_purpose
    and otp.verified = false
    and otp.expires_at > now()
  order by otp.created_at desc
  limit 1;
end;
$$;

comment on function get_active_otp is 'Get currently active OTP for an identifier';

-- OTP verification stats view
create or replace view otp_verification_stats as
select
  date(created_at) as date,
  purpose,
  count(*) as total_sent,
  count(*) filter (where verified = true) as total_verified,
  count(*) filter (where verified = false and expires_at < now()) as expired,
  round(
    100.0 * count(*) filter (where verified = true) / nullif(count(*), 0),
    2
  ) as verification_rate_percent
from otp_codes
where created_at >= now() - interval '30 days'
group by date(created_at), purpose
order by date desc, purpose;

comment on view otp_verification_stats is 'Daily OTP verification statistics for analytics';

-- Auto-cleanup: Delete expired OTPs older than 24 hours
create or replace function cleanup_expired_otps()
returns integer language plpgsql as $$
declare
  deleted_count integer;
begin
  delete from otp_codes
  where expires_at < now() - interval '24 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function cleanup_expired_otps is 'Delete OTP codes expired for more than 24 hours';
