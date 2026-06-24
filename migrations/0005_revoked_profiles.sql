create table if not exists revoked_profiles (
  profile_id text primary key,
  revoked_at text not null default (datetime('now')),
  reason text not null default 'account_deleted'
);

create index if not exists revoked_profiles_revoked_at_idx
  on revoked_profiles(revoked_at);
