import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { createDefaultMyRoom, createMyRoomItemFromCatalog, defaultMyRoomItems, floorOptions, loadMyRoom, roomItemCatalog, saveMyRoom, wallpaperOptions, type MyRoom, type MyRoomItem } from '../api/myRoom';
import { getProfileId } from '../api/profileId';
import { RoomCanvas } from './RoomCanvas';
import './MyRoomSettingsPanel.css';
import './MyRoomSettingsRestoreControls.css';
import './MyRoomSettingsRestoreOptions.css';
import './MyRoomSettingsRestoreSwatches.css';
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
};

function normalizeRotation(rotation: number) {
  return ((Math.round(rotation / 45) * 45) % 360 + 360) % 360;
}

function CatalogThumbnail({ item }: { item: MyRoomItem }) {
  const imagePath = catalogThumbnailPaths[item.asset_id];

  if (imagePath) {
    return (
      <span className="my-room-catalog-thumb has-image" aria-hidden="true">
        <img alt="" src={imagePath} />
      </span>
    );
  }

  return <span className="my-room-catalog-thumb" aria-hidden="true">{catalogThumbnailIcons[item.item_type] ?? '✨'}</span>;
}

export function MyRoomSettingsPanel({ onClose }: { onClose: () => void }) {
  const myProfileId = useMemo(() => getProfileId(), []);
  const [room, setRoom] = useState<MyRoom>(() => createDefaultMyRoom(myProfileId));
  const [selectedId, setSelectedId] = useState('');
  const [activeMenu, setActiveMenu] = useState<MyRoomEditorMenu>('furniture');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isMounted = true;
    loadMyRoom(myProfileId).then((nextRoom) => {
      if (!isMounted) return;
      setRoom(nextRoom);
      setSelectedId(nextRoom.items[0]?.id ?? '');
    });

    return () => {
      isMounted = false;
    };
  }, [myProfileId]);

  const selectedItem = useMemo(() => room.items.find((item) => item.id === selectedId), [room.items, selectedId]);

  const updateItem = (id: string, patch: Partial<MyRoomItem>) => {
    setRoom((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      updated_at: new Date().toISOString(),
    }));
  };

  const addItem = (catalogItem: MyRoomItem) => {
    const nextItem = createMyRoomItemFromCatalog(catalogItem, room.items.length);
    setRoom((current) => ({
      ...current,
      items: [...current.items, nextItem],
      updated_at: new Date().toISOString(),
    }));
    setSelectedId(nextItem.id);
    setActiveMenu('selected');
    setNotice(`${catalogItem.label}을 방에 추가했어요.`);
  };

  const removeSelectedItem = () => {
    if (!selectedItem) return;
    setRoom((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== selectedItem.id),
      updated_at: new Date().toISOString(),
    }));
    setNotice(`${selectedItem.label}을 제거했어요.`);
    setSelectedId('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const saved = await saveMyRoom(room);
    setIsSaving(false);
    if (saved) {
      setRoom(saved);
      setNotice('마이룸을 저장했어요.');
      return;
    }

    setNotice('저장에 실패했어요. 잠시 후 다시 시도해주세요.');
  };

  return (
    <section className="my-room-editor-screen">
      <Card className="settings-summary my-room-settings-header">
        <button className="chat-back-button" type="button" onClick={onClose}>←</button>
        <div className="my-room-header-copy">
          <strong>마이룸 꾸미기</strong>
          <p>방을 보면서 바로 가구와 분위기를 바꿔보세요.</p>
        </div>
        <button className="my-room-save-chip" disabled={isSaving} type="button" onClick={handleSave}>{isSaving ? '저장중' : '저장'}</button>
      </Card>

      <Card className="my-room-preview-card is-sticky-preview">
        <div className="my-room-card-title-row">
          <div>
            <strong>배치 편집</strong>
            <p>가구를 터치하고 위치, 크기, 방향을 조절하세요.</p>
          </div>
          <span>{selectedItem?.label ?? '전체'}</span>
        </div>
        <RoomCanvas editingItemId={selectedId} isEditing onItemSelect={setSelectedId} onItemUpdate={updateItem} room={room} />
      </Card>

      <Card className="my-room-editor-dock">
        <div className="my-room-menu-tabs">
          {editorMenus.map((menu) => (
            <button className={menu.id === activeMenu ? 'is-active' : ''} key={menu.id} type="button" onClick={() => setActiveMenu(menu.id)}>{menu.label}</button>
          ))}
        </div>

        {activeMenu === 'furniture' && (
          <div className="my-room-panel-section">
            <div className="my-room-panel-title">
              <strong>가구 추가</strong>
              <p>원하는 가구를 누르면 방에 바로 추가돼요.</p>
            </div>
            <div className="my-room-catalog-grid">
              {roomItemCatalog.map((item) => (
                <button key={item.id} type="button" onClick={() => addItem(item)}>
                  <CatalogThumbnail item={item} />
                  <span className="my-room-catalog-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMenu === 'selected' && (
          <div className="my-room-panel-section">
            {selectedItem ? (
              <>
                <div className="my-room-panel-title">
                  <strong>{selectedItem.label}</strong>
                  <p>작게 움직여서 원하는 위치로 맞춰보세요.</p>
                </div>
                <div className="my-room-control-grid">
                  <button type="button" onClick={() => updateItem(selectedItem.id, { x: Math.max(4, selectedItem.x - 4) })}>왼쪽</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { x: Math.min(96, selectedItem.x + 4) })}>오른쪽</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { y: Math.max(20, selectedItem.y - 4) })}>위</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { y: Math.min(96, selectedItem.y + 4) })}>아래</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { scale: Math.max(0.6, Number((selectedItem.scale - 0.1).toFixed(1))) })}>작게</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { scale: Math.min(1.8, Number((selectedItem.scale + 0.1).toFixed(1))) })}>크게</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { rotation: normalizeRotation((selectedItem.rotation ?? 0) - 45) })}>왼쪽 45°</button>
                  <button type="button" onClick={() => updateItem(selectedItem.id, { rotation: normalizeRotation((selectedItem.rotation ?? 0) + 45) })}>오른쪽 45°</button>
                  <button className="danger-button" type="button" onClick={removeSelectedItem}>삭제</button>
                </div>
              </>
            ) : (
              <p className="my-room-small-hint">선택된 가구가 없어요. 방 위 가구나 아래 목록을 눌러 선택해주세요.</p>
            )}
          </div>
        )}

        {activeMenu === 'wallpaper' && (
          <div className="my-room-panel-section">
            <div className="my-room-panel-title">
              <strong>벽지</strong>
              <p>방의 분위기를 바꾸는 배경 컬러예요.</p>
            </div>
            <div className="my-room-option-grid is-menu-grid">
              {wallpaperOptions.map((option) => (
                <button className={`my-room-option ${room.wallpaper === option.id ? 'is-selected' : ''}`} key={option.id} type="button" onClick={() => setRoom((current) => ({ ...current, wallpaper: option.id, updated_at: new Date().toISOString() }))}>
                  <span className={`my-room-swatch wallpaper-${option.id}`} />
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMenu === 'floor' && (
          <div className="my-room-panel-section">
            <div className="my-room-panel-title">
              <strong>바닥</strong>
              <p>가구와 잘 어울리는 바닥을 골라보세요.</p>
            </div>
            <div className="my-room-option-grid is-menu-grid">
              {floorOptions.map((option) => (
                <button className={`my-room-option ${room.floor === option.id ? 'is-selected' : ''}`} key={option.id} type="button" onClick={() => setRoom((current) => ({ ...current, floor: option.id, updated_at: new Date().toISOString() }))}>
                  <span className={`my-room-swatch floor-${option.id}`} />
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMenu === 'manage' && (
          <div className="my-room-panel-section">
            <div className="my-room-panel-title">
              <strong>관리</strong>
              <p>기본 배치로 돌리거나 저장할 수 있어요.</p>
            </div>
            <div className="my-room-manage-grid">
              <button type="button" onClick={() => setRoom(createDefaultMyRoom(myProfileId))}>초기화</button>
              <button type="button" onClick={() => setRoom((current) => ({ ...current, items: defaultMyRoomItems, updated_at: new Date().toISOString() }))}>기본 가구</button>
              <button type="button" onClick={handleSave}>저장</button>
            </div>
            {notice && <p className="my-room-notice">{notice}</p>}
            <div className="my-room-item-list is-compact-list">
              {room.items.map((item) => (
                <button className={item.id === selectedId ? 'is-selected' : ''} key={item.id} type="button" onClick={() => { setSelectedId(item.id); setActiveMenu('selected'); }}>{item.label}</button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
