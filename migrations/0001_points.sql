create table if not exists user_points (
  profile_id text primary key,
  balance integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists point_transactions (
  id text primary key,
  profile_id text not null,
  amount integer not null,
  reason text not null,
  reference_id text,
  description text,
  created_at text not null default (datetime('now'))
);

create index if not exists point_transactions_profile_idx
  on point_transactions(profile_id, created_at);

create index if not exists point_transactions_reference_idx
  on point_transactions(profile_id, reason, reference_id);

create table if not exists daily_point_claims (
  profile_id text not null,
  claim_type text not null,
  claim_date text not null,
  amount integer not null,
  created_at text not null default (datetime('now')),
  primary key (profile_id, claim_type, claim_date)
);
