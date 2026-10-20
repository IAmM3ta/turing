create table if not exists favorites (
  id text primary key,
  user_id text not null,
  name text not null,
  kind text not null,
  spec text not null,
  thumb text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists favorites_user_idx on favorites (user_id, created_at desc);
