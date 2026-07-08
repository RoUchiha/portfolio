create extension if not exists pgcrypto;

create table if not exists ai_digests (
  id uuid primary key default gen_random_uuid(),
  digest_date date unique not null,
  title text not null,
  summary_md text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists ai_digests_digest_date_idx on ai_digests (digest_date desc);
