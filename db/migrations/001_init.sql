create table if not exists jobs (
  id uuid primary key,
  type text not null,
  payload jsonb,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_created_at_idx on jobs (created_at desc);
