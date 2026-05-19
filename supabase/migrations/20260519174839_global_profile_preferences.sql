alter table public.profiles
add column if not exists country_code text not null default 'NG',
add column if not exists preferred_currency text not null default 'NGN',
add column if not exists preferred_language text not null default 'en';

update public.profiles
set country_code = coalesce(nullif(country_code, ''), 'NG'),
    preferred_currency = coalesce(nullif(preferred_currency, ''), 'NGN'),
    preferred_language = coalesce(nullif(preferred_language, ''), 'en');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_country_code_supported'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_country_code_supported
    check (country_code in ('NG', 'GH', 'KE', 'ZA', 'GB', 'US', 'CA', 'AE'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_currency_supported'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_preferred_currency_supported
    check (preferred_currency in ('NGN', 'GHS', 'KES', 'ZAR', 'GBP', 'USD', 'CAD', 'AED'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_language_supported'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_preferred_language_supported
    check (preferred_language in ('en', 'fr', 'sw', 'ar', 'pt'));
  end if;
end;
$$;

create index if not exists profiles_country_code_idx
on public.profiles (country_code);

comment on column public.profiles.country_code is
'User-selected onboarding country. Lending remains country-gated until local requirements are ready.';

comment on column public.profiles.preferred_currency is
'Display currency derived from the selected onboarding country.';

comment on column public.profiles.preferred_language is
'User-selected language preference for global-ready onboarding.';
