alter table public.profiles
add column if not exists username text,
add column if not exists referral_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[A-Za-z0-9]{3,30}$');
  end if;
end;
$$;

create unique index if not exists profiles_username_lower_unique_idx
on public.profiles (lower(username))
where username is not null;
