type Env = { DB: D1Database; IMAGES: R2Bucket };

async function existingTables(env: Env) {
  const result = await env.DB.prepare("select name from sqlite_master where type = 'table'").all<{ name: string }>();
  return new Set((result.results ?? []).map((row) => row.name));
}

async function existingColumns(env: Env, table: string) {
  const result = await env.DB.prepare(`pragma table_info(${table})`).all<{ name: string }>();
  return new Set((result.results ?? []).map((row) => row.name));
}

async function imageKeys(env: Env, prefix: string) {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.IMAGES.list({ prefix, cursor });
    keys.push(...page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

async function clearImages(env: Env, prefixes: string[]) {
  const keys = new Set<string>();
  for (const prefix of prefixes) {
    for (const key of await imageKeys(env, prefix)) keys.add(key);
  }
  const all = [...keys];
  for (let index = 0; index < all.length; index += 1000) {
    await env.IMAGES.delete(all.slice(index, index + 1000));
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  if (!profileId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const tables = await existingTables(env);
  if (!tables.has('revoked_profiles')) {
    return Response.json({ error: '탈퇴 기능용 D1 migration이 아직 적용되지 않았어요.' }, { status: 503 });
  }

  let roomIds: string[] = [];
  if (tables.has('chat_rooms')) {
    const columns = await existingColumns(env, 'chat_rooms');
    if (columns.has('participant_a_id') && columns.has('participant_b_id')) {
      const result = await env.DB.prepare(
        'select id from chat_rooms where participant_a_id = ? or participant_b_id = ?',
      ).bind(profileId, profileId).all<{ id: string }>();
      roomIds = (result.results ?? []).map((row) => row.id);
    }
  }

  try {
    await clearImages(env, [
      `profiles/${profileId}/`,
      ...roomIds.map((roomId) => `chat/${roomId}/`),
    ]);
  } catch {
    return Response.json({ error: '저장된 이미지를 정리하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }

  const statements: D1PreparedStatement[] = [];
  const roomPlaceholders = roomIds.map(() => '?').join(', ');

  if (tables.has('chat_messages')) {
    const columns = await existingColumns(env, 'chat_messages');
    if (columns.has('sender_profile_id')) {
      statements.push(env.DB.prepare('delete from chat_messages where sender_profile_id = ?').bind(profileId));
    }
    if (roomIds.length && columns.has('room_id')) {
      statements.push(env.DB.prepare(`delete from chat_messages where room_id in (${roomPlaceholders})`).bind(...roomIds));
    }
  }

  for (const table of ['chat_room_reads', 'chat_room_exits']) {
    if (tables.has(table) && roomIds.length) {
      statements.push(env.DB.prepare(`delete from ${table} where room_id in (${roomPlaceholders})`).bind(...roomIds));
    }
  }

  if (tables.has('chat_rooms') && roomIds.length) {
    statements.push(env.DB.prepare(`delete from chat_rooms where id in (${roomPlaceholders})`).bind(...roomIds));
  }

  const ownRows: Array<[string, string]> = [
    ['recent_users', 'id = ?'],
    ['talk_posts', 'profile_id = ?'],
    ['my_rooms', 'profile_id = ?'],
    ['user_points', 'profile_id = ?'],
    ['point_transactions', 'profile_id = ?'],
    ['daily_point_claims', 'profile_id = ?'],
    ['chat_room_reads', 'profile_id = ?'],
    ['chat_room_exits', 'profile_id = ?'],
    ['request_gates', 'owner_id = ?'],
    ['user_suspensions', 'profile_id = ?'],
  ];

  for (const [table, where] of ownRows) {
    if (tables.has(table)) statements.push(env.DB.prepare(`delete from ${table} where ${where}`).bind(profileId));
  }

  if (tables.has('user_blocks')) {
    statements.push(env.DB.prepare('delete from user_blocks where blocker_id = ? or blocked_id = ?').bind(profileId, profileId));
  }

  if (tables.has('reports') && tables.has('report_moderation')) {
    statements.push(
      env.DB.prepare(
        `delete from report_moderation
         where report_id in (
           select id from reports where reporter_id = ? or reported_id = ?
         )`,
      ).bind(profileId, profileId),
    );
  }

  if (tables.has('reports')) {
    statements.push(env.DB.prepare('delete from reports where reporter_id = ? or reported_id = ?').bind(profileId, profileId));
  }

  statements.push(
    env.DB.prepare(
      "insert into revoked_profiles (profile_id, revoked_at, reason) values (?, datetime('now'), 'account_deleted') on conflict(profile_id) do update set revoked_at = excluded.revoked_at, reason = excluded.reason",
    ).bind(profileId),
  );

  await env.DB.batch(statements);
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
};
