create table if not exists request_gates (
  gate_key text primary key,
  owner_id text not null,
  expires_at text not null
);

create index if not exists request_gates_expiry_idx
  on request_gates(expires_at);
