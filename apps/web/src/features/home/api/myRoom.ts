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

export const defaultMyRoomItems: MyRoomItem[] = [
  { id: 'window-main', item_type: 'window', asset_id: 'basic-window', label: '창문', x: 68, y: 18, z_index: 2, rotation: 0 },
  { id: 'bed-soft', item_type: 'bed', asset_id: 'soft-bed', label: '침대', x: 12, y: 48, z_index: 3, rotation: 0 },
  { id: 'rug-round', item_type: 'rug', asset_id: 'round-rug', label: '러그', x: 44, y: 66, z_index: 1, rotation: 0 },
  { id: 'table-tea', item_type: 'table', asset_id: 'tea-table', label: '테이블', x: 58, y: 58, z_index: 4, rotation: 0 },
  { id: 'plant-small', item_type: 'plant', asset_id: 'small-plant', label: '화분', x: 82, y: 52, z_index: 4, rotation: 0 },
  { id: 'frame-heart', item_type: 'frame', asset_id: 'heart-frame', label: '액자', x: 27, y: 22, z_index: 2, rotation: 0 },
];

export function createDefaultMyRoom(profileId = getProfileId()): MyRoom {
  return {
    profile_id: profileId,
    wallpaper: 'peach',
    floor: 'cream',
    items: defaultMyRoomItems,
  };
}

function normalizeRoom(room?: Partial<MyRoom> | null, profileId = getProfileId()): MyRoom {
  return {
    ...createDefaultMyRoom(profileId),
    ...room,
    profile_id: room?.profile_id || profileId,
    items: Array.isArray(room?.items) && room.items.length > 0 ? room.items : defaultMyRoomItems,
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
