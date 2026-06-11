import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { createDefaultMyRoom, createMyRoomItemFromCatalog, defaultMyRoomItems, floorOptions, loadMyRoom, roomItemCatalog, saveMyRoom, wallpaperOptions, type MyRoom, type MyRoomItem } from '../api/myRoom';
import { getProfileId } from '../api/profileId';
import { RoomCanvas } from './RoomCanvas';
import './MyRoomSettingsPanel.css';
import './MyRoomFurnitureThumbs.css';

type MyRoomEditorMenu = 'furniture' | 'selected' | 'wallpaper' | 'floor' | 'manage';

const editorMenus: { id: MyRoomEditorMenu; label: string }[] = [
  { id: 'furniture', label: '가구' },
  { id: 'selected', label: '선택' },
  { id: 'wallpaper', label: '벽지' },
  { id: 'floor', label: '바닥' },
  { id: 'manage', label: '관리' },
];

const catalogThumbnailPaths: Record<string, string> = {
  bed01: '/assets/room/furniture/bed01.png',
  desk01: '/assets/room/furniture/desk01.png',
  sidedesk01: '/assets/room/furniture/sidedesk01.png',
};

const catalogThumbnailIcons: Record<string, string> = {
  bed: '🛏️',
  desk: '🪵',
  'side-desk': '🪵',
  table: '🫖',
  plant: '🪴',
  window: '🪟',
  rug: '☁️',
  frame: '🖼️',
  sofa: '🛋️',
  shelf: '📚',
  lamp: '💡',
};

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function normalizeRotation(value: number) {
  return ((Math.round(value / 45) * 45) % 360 + 360) % 360;
}

function clampZIndex(value: number) {
  return Math.min(Math.max(value, 0), 99);
}

function duplicateItem(item: MyRoomItem, index: number): MyRoomItem {
  return {
    ...item,
    id: `${item.asset_id}-${Date.now()}-${index}`,
    x: clampPercent(item.x + 4),
    y: clampPercent(item.y + 4),
    z_index: clampZIndex(item.z_index + 1),
  };
}

function CatalogThumbnail({ assetId, itemType, label }: { assetId: string; itemType: string; label: string }) {
  const thumbnailPath = catalogThumbnailPaths[assetId];

  return (
    <span className={`my-room-catalog-thumb ${thumbnailPath ? 'has-image' : ''}`}>
      {thumbnailPath ? (
        <img alt="" aria-hidden="true" draggable={false} src={thumbnailPath} />
      ) : (
        <span aria-hidden="true">{catalogThumbnailIcons[itemType] ?? '✨'}</span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function MyRoomSettingsPanel({ onClose }: { onClose: () => void }) {
  const [room, setRoom] = useState<MyRoom>(() => createDefaultMyRoom());
  const [activeMenu, setActiveMenu] = useState<MyRoomEditorMenu>('furniture');
  const [selectedItemId, setSelectedItemId] = useState(defaultMyRoomItems[0]?.id ?? '');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadMyRoom(getProfileId()).then((nextRoom) => {
      if (!isMounted) return;
      setRoom(nextRoom);
      setSelectedItemId(nextRoom.items[0]?.id ?? '');
      setIsLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      const fallbackRoom = createDefaultMyRoom();
      setRoom(fallbackRoom);
      setSelectedItemId(fallbackRoom.items[0]?.id ?? '');
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItem = useMemo(() => room.items.find((item) => item.id === selectedItemId) ?? null, [room.items, selectedItemId]);

  const selectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setActiveMenu('selected');
  };

  const updateItem = (itemId: string, patcher: (item: MyRoomItem) => MyRoomItem) => {
    setRoom((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? patcher(item) : item),
    }));
  };

  const moveItem = (itemId: string, position: { x: number; y: number }) => {
    updateItem(itemId, (item) => ({ ...item, x: clampPercent(position.x), y: clampPercent(position.y) }));
  };

  const rotateSelectedItem = (amount: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({ ...item, rotation: normalizeRotation((item.rotation ?? 0) + amount) }));
  };

  const changeSelectedItemDepth = (amount: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({ ...item, z_index: clampZIndex(item.z_index + amount) }));
  };

  const addCatalogItem = (catalogId: string) => {
    const catalogItem = roomItemCatalog.find((item) => item.catalog_id === catalogId);
    if (!catalogItem) return;

    setRoom((current) => {
      const nextItem = createMyRoomItemFromCatalog(catalogItem, current.items.length);
      setSelectedItemId(nextItem.id);
      setActiveMenu('selected');
      return { ...current, items: [...current.items, nextItem] };
    });
    setNotice(`${catalogItem.label}을(를) 방에 추가했어요. 바로 끌어서 위치를 잡아보세요.`);
  };

  const removeSelectedItem = () => {
    if (!selectedItem) return;

    setRoom((current) => {
      const nextItems = current.items.filter((item) => item.id !== selectedItem.id);
      setSelectedItemId(nextItems[0]?.id ?? '');
      return { ...current, items: nextItems };
    });
    setNotice(`${selectedItem.label}을(를) 방에서 치웠어요. 저장을 눌러 반영해주세요.`);
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;

    setRoom((current) => {
      const nextItem = duplicateItem(selectedItem, current.items.length);
      setSelectedItemId(nextItem.id);
      return { ...current, items: [...current.items, nextItem] };
    });
    setNotice(`${selectedItem.label}을(를) 하나 더 추가했어요.`);
  };

  const save = async () => {
    setIsSaving(true);
    const saved = await saveMyRoom(room);
    setIsSaving(false);

    if (!saved) {
      setNotice('마이룸을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    setRoom(saved);
    setSelectedItemId(saved.items.find((item) => item.id === selectedItemId)?.id ?? saved.items[0]?.id ?? '');
    setNotice('마이룸이 저장됐어요. 새 채팅방에도 이 방이 보여요.');
  };

  const resetItems = () => {
    setRoom((current) => ({ ...current, items: defaultMyRoomItems }));
    setSelectedItemId(defaultMyRoomItems[0]?.id ?? '');
    setNotice('기본 가구 배치로 되돌렸어요. 저장을 눌러 반영해주세요.');
  };

  const clearItems = () => {
    setRoom((current) => ({ ...current, items: [] }));
    setSelectedItemId('');
    setNotice('가구를 비웠어요. 저장을 눌러 반영해주세요.');
  };

  const renderEditorPanel = () => {
    if (activeMenu === 'furniture') {
      return (
        <div className="my-room-panel-section">
          <div className="my-room-panel-title">
            <strong>가구 추가</strong>
            <p>원하는 가구를 누르면 방에 바로 추가돼요.</p>
          </div>
          <div className="my-room-catalog-grid">
            {roomItemCatalog.map((item) => (
              <button key={item.catalog_id} type="button" onClick={() => addCatalogItem(item.catalog_id)}>
                <CatalogThumbnail assetId={item.asset_id} itemType={item.item_type} label={item.label} />
                <span className="my-room-catalog-copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeMenu === 'selected') {
      return (
        <div className="my-room-panel-section">
          <div className="my-room-panel-title">
            <strong>선택한 가구</strong>
            <p>{selectedItem ? `${selectedItem.label} · X ${Math.round(selectedItem.x)} / Y ${Math.round(selectedItem.y)} / 깊이 ${selectedItem.z_index} / 회전 ${normalizeRotation(selectedItem.rotation ?? 0)}°` : '방 안의 가구를 누르거나 아래 목록에서 선택하세요.'}</p>
          </div>
          {selectedItem ? (
            <div className="my-room-control-grid">
              <button type="button" onClick={() => changeSelectedItemDepth(1)}>앞으로</button>
              <button type="button" onClick={() => changeSelectedItemDepth(-1)}>뒤로</button>
              <button type="button" onClick={() => rotateSelectedItem(-45)}>왼쪽 45°</button>
              <button type="button" onClick={() => rotateSelectedItem(45)}>오른쪽 45°</button>
              <button type="button" onClick={duplicateSelectedItem}>복제</button>
              <button className="danger-button" type="button" onClick={removeSelectedItem}>삭제</button>
            </div>
          ) : null}
          <div className="my-room-item-list is-compact-list">
            {room.items.length === 0 && <span>배치된 가구가 없어요.</span>}
            {room.items.map((item) => (
              <button className={selectedItemId === item.id ? 'is-selected' : ''} key={item.id} type="button" onClick={() => setSelectedItemId(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeMenu === 'wallpaper') {
      return (
        <div className="my-room-panel-section">
          <div className="my-room-panel-title">
            <strong>벽지</strong>
            <p>누르면 바로 미리보기에 반영돼요.</p>
          </div>
          <div className="my-room-option-grid is-menu-grid">
            {wallpaperOptions.map((option) => (
              <button
                className={room.wallpaper === option.id ? 'my-room-option is-selected' : 'my-room-option'}
                key={option.id}
                type="button"
                onClick={() => setRoom((current) => ({ ...current, wallpaper: option.id }))}
              >
                <span className={`my-room-swatch wallpaper-${option.id}`} />
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeMenu === 'floor') {
      return (
        <div className="my-room-panel-section">
          <div className="my-room-panel-title">
            <strong>바닥</strong>
            <p>방 분위기에 맞는 바닥을 골라보세요.</p>
          </div>
          <div className="my-room-option-grid is-menu-grid">
            {floorOptions.map((option) => (
              <button
                className={room.floor === option.id ? 'my-room-option is-selected' : 'my-room-option'}
                key={option.id}
                type="button"
                onClick={() => setRoom((current) => ({ ...current, floor: option.id }))}
              >
                <span className={`my-room-swatch floor-${option.id}`} />
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="my-room-panel-section">
        <div className="my-room-panel-title">
          <strong>방 관리</strong>
          <p>배치를 초기화하거나 가구를 모두 비울 수 있어요.</p>
        </div>
        <div className="my-room-manage-grid">
          <button type="button" onClick={resetItems}>기본 배치로</button>
          <button className="danger-button" type="button" onClick={clearItems}>가구 모두 비우기</button>
        </div>
        <p className="my-room-small-hint">지금은 임시 가구 카탈로그지만, 다음에는 실제 PNG/WebP 에셋과 포인트 상점 아이템을 `asset_id`에 연결하면 됩니다.</p>
      </div>
    );
  };

  return (
    <section className="talk-list my-room-editor-screen" aria-label="마이룸 꾸미기">
      <Card className="settings-summary my-room-settings-header">
        <button className="chat-back-button" type="button" onClick={onClose}>←</button>
        <div className="my-room-header-copy">
          <strong>마이룸 꾸미기</strong>
          <p>방을 보면서 바로 가구와 분위기를 바꿔보세요.</p>
        </div>
        <button className="my-room-save-chip" disabled={isSaving} onClick={save} type="button">{isSaving ? '저장중' : '저장'}</button>
      </Card>

      <Card className="person-card my-room-preview-card is-sticky-preview">
        <div className="my-room-card-title-row">
          <div>
            <strong>배치 편집</strong>
            <p>가구를 끌어서 옮기고, 아래 메뉴에서 꾸미기 도구를 바꿔요.</p>
          </div>
          <span>{selectedItem ? selectedItem.label : '선택 없음'}</span>
        </div>
        {isLoading ? (
          <p>마이룸을 불러오는 중...</p>
        ) : (
          <RoomCanvas
            isEditing
            onItemMove={moveItem}
            onItemSelect={selectItem}
            selectedItemId={selectedItemId}
            room={room}
          />
        )}
        {notice && <p className="my-room-notice">{notice}</p>}
      </Card>

      <Card className="person-card my-room-editor-dock">
        <div className="my-room-menu-tabs" role="tablist" aria-label="마이룸 편집 메뉴">
          {editorMenus.map((menu) => (
            <button
              aria-selected={activeMenu === menu.id}
              className={activeMenu === menu.id ? 'is-active' : ''}
              key={menu.id}
              role="tab"
              type="button"
              onClick={() => setActiveMenu(menu.id)}
            >
              {menu.label}
            </button>
          ))}
        </div>
        {renderEditorPanel()}
      </Card>
    </section>
  );
}
