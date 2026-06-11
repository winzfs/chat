import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';

export type MyRoomWallpaper = 'peach' | 'mint' | 'lavender' | 'sky';
export type MyRoomFloor = 'cream' | 'wood' | 'checker' | 'carpet';

export type MyRoomItem = {
  id: string;
  item_type: string;
  asset_id: string;
  label: string;
  x: number;
  y: number;
  z_index: number;
  rotation?: number;
};

export type MyRoomCatalogItem = {
  catalog_id: string;
  item_type: string;
  asset_id: string;
  label: string;
  description: string;
  default_x: number;
  default_y: number;
  default_z_index: number;
};

export type MyRoom = {
  profile_id: string;
  wallpaper: MyRoomWallpaper;
  floor: MyRoomFloor;
  items: MyRoomItem[];
  updated_at?: string;
};

export const wallpaperOptions: { id: MyRoomWallpaper; label: string; description: string }[] = [
  { id: 'peach', label: '복숭아빛 방', description: '따뜻하고 부드러운 기본 방' },
  { id: 'mint', label: '민트 방', description: '산뜻하고 편안한 방' },
  { id: 'lavender', label: '라벤더 방', description: '몽글몽글한 보라빛 방' },
  { id: 'sky', label: '하늘 방', description: '맑고 청량한 파란 방' },
];

export const floorOptions: { id: MyRoomFloor; label: string; description: string }[] = [
  { id: 'cream', label: '크림 바닥', description: '깔끔한 기본 바닥' },
  { id: 'wood', label: '우드 바닥', description: '따뜻한 나무 바닥' },
  { id: 'checker', label: '체커 바닥', description: '귀여운 체크 패턴' },
  { id: 'carpet', label: '러그 바닥', description: '포근한 카펫 느낌' },
];

export const roomItemCatalog: MyRoomCatalogItem[] = [
  { catalog_id: 'basic-window', item_type: 'window', asset_id: 'basic-window', label: '창문', description: '방 분위기를 밝게 만드는 기본 창문', default_x: 68, default_y: 18, default_z_index: 2 },
  { catalog_id: 'soft-bed', item_type: 'bed', asset_id: 'bed01', label: '침대', description: '포근한 기본 침대', default_x: 14, default_y: 52, default_z_index: 3 },
  { catalog_id: 'round-rug', item_type: 'rug', asset_id: 'round-rug', label: '러그', description: '방 중앙에 까는 둥근 러그', default_x: 46, default_y: 68, default_z_index: 1 },
  { catalog_id: 'tea-table', item_type: 'table', asset_id: 'tea-table', label: '테이블', description: '대화하기 좋은 작은 테이블', default_x: 58, default_y: 58, default_z_index: 4 },
  { catalog_id: 'small-plant', item_type: 'plant', asset_id: 'small-plant', label: '화분', description: '싱그러운 작은 화분', default_x: 82, default_y: 52, default_z_index: 4 },
  { catalog_id: 'heart-frame', item_type: 'frame', asset_id: 'heart-frame', label: '액자', description: '벽에 거는 작은 액자', default_x: 27, default_y: 22, default_z_index: 2 },
  { catalog_id: 'cozy-sofa', item_type: 'sofa', asset_id: 'cozy-sofa', label: '소파', description: '둘이 앉기 좋은 소파', default_x: 28, default_y: 60, default_z_index: 4 },
  { catalog_id: 'book-shelf', item_type: 'shelf', asset_id: 'book-shelf', label: '책장', description: '아기자기한 책장', default_x: 14, default_y: 31, default_z_index: 3 },
  { catalog_id: 'mood-lamp', item_type: 'lamp', asset_id: 'mood-lamp', label: '스탠드', description: '은은한 분위기의 조명', default_x: 78, default_y: 62, default_z_index: 5 },
];

export const defaultMyRoomItems: MyRoomItem[] = roomItemCatalog.slice(0, 6).map((item) => ({
  id: item.catalog_id === 'basic-window' ? 'window-main' : item.catalog_id,
  item_type: item.item_type,
  asset_id: item.asset_id,
  label: item.label,
  x: item.default_x,
  y: item.default_y,
  z_index: item.default_z_index,
  rotation: 0,
}));

function makeItemId(catalogId: string) {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 10000)}`;
  return `${catalogId}-${randomId}`;
}

export function createMyRoomItemFromCatalog(catalogItem: MyRoomCatalogItem, index = 0): MyRoomItem {
  return {
    id: makeItemId(catalogItem.catalog_id),
    item_type: catalogItem.item_type,
    asset_id: catalogItem.asset_id,
    label: catalogItem.label,
    x: Math.min(Math.max(catalogItem.default_x + index * 3, 8), 92),
    y: Math.min(Math.max(catalogItem.default_y + index * 3, 12), 90),
    z_index: catalogItem.default_z_index,
    rotation: 0,
  };
}

export function createDefaultMyRoom(profileId = getProfileId()): MyRoom {
  return {
    profile_id: profileId,
    wallpaper: 'peach',
    floor: 'cream',
    items: defaultMyRoomItems,
  };
}

function normalizeLegacyAssetId(item: MyRoomItem): MyRoomItem {
  if (item.item_type === 'bed' && item.asset_id === 'soft-bed') {
    return { ...item, asset_id: 'bed01' };
  }

  return item;
}

function normalizeRoom(room?: Partial<MyRoom> | null, profileId = getProfileId()): MyRoom {
  const items = Array.isArray(room?.items) ? room.items.map(normalizeLegacyAssetId) : defaultMyRoomItems;

  return {
    ...createDefaultMyRoom(profileId),
    ...room,
    profile_id: room?.profile_id || profileId,
    items,
  };
}

export async function loadMyRoom(profileId = getProfileId()): Promise<MyRoom> {
  const params = new URLSearchParams({ profile_id: profileId });
  const response = await fetch(apiUrl(`/api/my-room?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return createDefaultMyRoom(profileId);
  }

  const data = await response.json() as { room?: MyRoom };
  return normalizeRoom(data.room, profileId);
}

export async function saveMyRoom(room: MyRoom): Promise<MyRoom | null> {
  const response = await fetch(apiUrl('/api/my-room'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { room?: MyRoom };
  return normalizeRoom(data.room, room.profile_id);
}
