-- Keep private image upload buckets aligned with the app upload guardrails.
-- The app only accepts image files up to 5 * 1024 * 1024 bytes.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  ('receipts', 'receipts', false, 5242880, array['image/*']::text[]),
  ('kyc-documents', 'kyc-documents', false, 5242880, array['image/*']::text[])
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
