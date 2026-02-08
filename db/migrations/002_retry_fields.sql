alter table jobs
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists last_error text;

create index if not exists jobs_status_retry_idx on jobs (status, retry_count);
