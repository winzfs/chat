type Env = { DB: D1Database };

type MyRoomBody = {
  profile_id?: string;
  wallpaper?: string;
  floor?: string;
  items?: unknown;
};

const allowedWallpapers = new Set(['peach', 'mint', 'lavender', 'sky']);
const allowedFloors = new Set(['cream', 'wood', 'checker', 'carpet']);

const defaultItems = [
  { id: 'window-main', item_type: 'window', asset_id: 'basic-window', label: '창문', x: 68, y: 18, z_index: 2, rotation: 0 },
  { id: 'star-bed', item_type: 'bed', asset_id: 'bed01', label: '별침대', x: 12, y: 48, z_index: 3, rotation: 0 },
  { id: 'rug-round', item_type: 'rug', asset_id: 'round-rug', label: '러그', x: 44, y: 66, z_index: 1, rotation: 0 },
  { id: 'table-tea', item_type: 'table', asset_id: 'tea-table', label: '테이블', x: 58, y: 58, z_index: 4, rotation: 0 },
  { id: 'plant-small', item_type: 'plant', asset_id: 'small-plant', label: '화분', x: 82, y: 52, z_index: 4, rotation: 0 },
  { id: 'frame-heart', item_type: 'frame', asset_id: 'heart-frame', label: '액자', x: 27, y: 22, z_index: 2, rotation: 0 },
];

function defaultRoom(profileId: string) {
  return {
    profile_id: profileId,
    wallpaper: 'peach',
    floor: 'cream',
    items: defaultItems,
  };
}

function normalizeWallpaper(value?: string) {
  return allowedWallpapers.has(value ?? '') ? value as string : 'peach';
}

function normalizeFloor(value?: string) {
  return allowedFloors.has(value ?? '') ? value as string : 'cream';
}

async function ensureMyRoomTable(env: Env) {
  await env.DB.prepare(
    `create table if not exists my_rooms (
      profile_id text primary key,
      wallpaper text not null default 'peach',
      floor text not null default 'cream',
      items text not null default '[]',
      updated_at text not null default (datetime('now'))
    )`,
  ).run();
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) return defaultItems;

  return value.slice(0, 40).map((item, index) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim().slice(0, 40) : `item-${index}`;
    const itemType = typeof record.item_type === 'string' && record.item_type.trim() ? record.item_type.trim().slice(0, 30) : 'decor';
    const rawAssetId = typeof record.asset_id === 'string' && record.asset_id.trim() ? record.asset_id.trim().slice(0, 40) : itemType;
    const assetId = itemType === 'bed' && (rawAssetId === 'soft-bed' || rawAssetId === 'bed01') ? 'bed01' : rawAssetId;
    const rawLabel = typeof record.label === 'string' && record.label.trim() ? record.label.trim().slice(0, 20) : '소품';
    const label = itemType === 'bed' && assetId === 'bed01' ? '별침대' : rawLabel;
    const x = Math.min(Math.max(Number(record.x ?? 50), 0), 100);
    const y = Math.min(Math.max(Number(record.y ?? 50), 0), 100);
    const zIndex = Math.min(Math.max(Number(record.z_index ?? index + 1), 0), 99);
    const rotation = Math.min(Math.max(Number(record.rotation ?? 0), -45), 45);

    return { id, item_type: itemType, asset_id: assetId, label, x, y, z_index: zIndex, rotation };
  });
}

function parseItems(value?: string | null) {
  if (!value) return defaultItems;

  try {
    return normalizeItems(JSON.parse(value));
  } catch {
    return defaultItems;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureMyRoomTable(env);

  const profileId = new URL(request.url).searchParams.get('profile_id')?.trim() ?? '';

  if (!profileId) {
    return Response.json({ error: 'profile_id가 필요해요.' }, { status: 400 });
  }

  const row = await env.DB.prepare(
    'select profile_id, wallpaper, floor, items, updated_at from my_rooms where profile_id = ? limit 1',
  ).bind(profileId).first<{ profile_id: string; wallpaper: string; floor: string; items: string; updated_at: string }>();

  if (!row) {
    return Response.json({ room: defaultRoom(profileId) });
  }

  return Response.json({
    room: {
      profile_id: row.profile_id,
      wallpaper: normalizeWallpaper(row.wallpaper),
      floor: normalizeFloor(row.floor),
      items: parseItems(row.items),
      updated_at: row.updated_at,
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureMyRoomTable(env);

  const body = await request.json() as MyRoomBody;
  const profileId = body.profile_id?.trim() ?? '';

  if (!profileId) {
    return Response.json({ error: 'profile_id가 필요해요.' }, { status: 400 });
  }

  const wallpaper = normalizeWallpaper(body.wallpaper);
  const floor = normalizeFloor(body.floor);
  const items = normalizeItems(body.items);

  await env.DB.prepare(
    `insert into my_rooms (profile_id, wallpaper, floor, items, updated_at)
     values (?, ?, ?, ?, datetime('now'))
     on conflict(profile_id) do update set
       wallpaper = excluded.wallpaper,
       floor = excluded.floor,
       items = excluded.items,
       updated_at = datetime('now')`,
  ).bind(profileId, wallpaper, floor, JSON.stringify(items)).run();

  const row = await env.DB.prepare(
    'select profile_id, wallpaper, floor, items, updated_at from my_rooms where profile_id = ? limit 1',
  ).bind(profileId).first<{ profile_id: string; wallpaper: string; floor: string; items: string; updated_at: string }>();

  return Response.json({
    room: row
      ? { ...row, wallpaper: normalizeWallpaper(row.wallpaper), floor: normalizeFloor(row.floor), items: parseItems(row.items) }
      : { ...defaultRoom(profileId), wallpaper, floor, items },
  });
};
