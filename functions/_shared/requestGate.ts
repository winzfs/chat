type GateEnv = { DB: D1Database };

export async function acquireRequestGate(env: GateEnv, key: string, owner: string) {
  await env.DB.prepare(
    `create table if not exists request_gates (
      gate_key text primary key,
      owner_id text not null,
      expires_at text not null
    )`,
  ).run();

  await env.DB.prepare(
    `delete from request_gates where datetime(expires_at) <= datetime('now')`,
  ).run();

  const result = await env.DB.prepare(
    `insert or ignore into request_gates (gate_key, owner_id, expires_at)
     values (?, ?, datetime('now', '+30 seconds'))`,
  ).bind(key, owner).run();

  return Number(result.meta.changes ?? 0) > 0;
}

export async function releaseRequestGate(env: GateEnv, key: string, owner: string) {
  try {
    await env.DB.prepare(
      'delete from request_gates where gate_key = ? and owner_id = ?',
    ).bind(key, owner).run();
  } catch {
    // Expiration clears stale gates if cleanup fails.
  }
}
