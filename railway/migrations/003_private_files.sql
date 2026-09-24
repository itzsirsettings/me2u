-- Private file storage in PostgreSQL.
-- Self-contained database object storage; no external storage service.
-- Files are stored as bytea; max enforced at application layer (5 MB).

create table if not exists private_files (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  bucket      text        not null check (bucket in ('receipts', 'kyc-documents')),
  file_name   text        not null,
  content_type text       not null,
  size_bytes  integer     not null check (size_bytes > 0),
  data        bytea       not null,
  created_at  timestamptz not null default now()
);

create index if not exists private_files_user_id_idx   on private_files(user_id);
create index if not exists private_files_bucket_idx    on private_files(bucket);
