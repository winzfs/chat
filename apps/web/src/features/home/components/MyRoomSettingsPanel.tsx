import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { createDefaultMyRoom, defaultMyRoomItems, floorOptions, loadMyRoom, saveMyRoom, wallpaperOptions, type MyRoom, type MyRoomItem } from '../api/myRoom';
import { getProfileId } from '../api/profileId';
import { RoomCanvas } from './RoomCanvas';
import './MyRoomSettingsPanel.css';

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function clampRotation(value: number) {
  return Math.min(Math.max(value, -45), 45);
}

function clampZIndex(value: number) {
  return Math.min(Math.max(value, 0), 99);
}

export function MyRoomSettingsPanel({ onClose }: { onClose: () => void }) {
  const [room, setRoom] = useState<MyRoom>(() => createDefaultMyRoom());
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
    updateItem(selectedItem.id, (item) => ({ ...item, rotation: clampRotation((item.rotation ?? 0) + amount) }));
  };

  const changeSelectedItemDepth = (amount: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({ ...item, z_index: clampZIndex(item.z_index + amount) }));
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

  return (
    <section className="talk-list" aria-label="마이룸 꾸미기">
      <Card className="settings-summary my-room-settings-header">
        <button className="chat-back-button" type="button" onClick={onClose}>←</button>
        <div>
          <strong>마이룸 꾸미기</strong>
          <p>채팅을 신청하면 상대방은 이 방에서 대화를 시작해요.</p>
        </div>
      </Card>

      <Card className="person-card my-room-preview-card">
        <div className="my-room-card-title-row">
          <div>
            <strong>배치 편집</strong>
            <p>가구를 손가락으로 끌어서 원하는 위치에 놓아보세요.</p>
          </div>
          <span>{selectedItem ? selectedItem.label : '선택 없음'}</span>
        </div>
        {isLoading ? (
          <p>마이룸을 불러오는 중...</p>
        ) : (
          <RoomCanvas
            isEditing
            onItemMove={moveItem}
            onItemSelect={setSelectedItemId}
            selectedItemId={selectedItemId}
            room={room}
          />
        )}
        {notice && <p className="my-room-notice">{notice}</p>}
      </Card>

      {selectedItem && (
        <Card className="person-card my-room-option-card">
          <strong>선택한 가구 조절</strong>
          <p>{selectedItem.label} · X {Math.round(selectedItem.x)} / Y {Math.round(selectedItem.y)} / 깊이 {selectedItem.z_index} / 회전 {selectedItem.rotation ?? 0}°</p>
          <div className="my-room-control-grid">
            <button type="button" onClick={() => changeSelectedItemDepth(1)}>앞으로</button>
            <button type="button" onClick={() => changeSelectedItemDepth(-1)}>뒤로</button>
            <button type="button" onClick={() => rotateSelectedItem(-5)}>왼쪽 회전</button>
            <button type="button" onClick={() => rotateSelectedItem(5)}>오른쪽 회전</button>
          </div>
        </Card>
      )}

      <Card className="person-card my-room-option-card">
        <strong>벽지</strong>
        <div className="my-room-option-grid">
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
      </Card>

      <Card className="person-card my-room-option-card">
        <strong>바닥</strong>
        <div className="my-room-option-grid">
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
      </Card>

      <Card className="person-card my-room-option-card">
        <strong>가구/소품 슬롯</strong>
        <p>가구 버튼을 누르면 해당 가구가 선택돼요. 선택한 가구는 위 미리보기에서 바로 끌어 배치할 수 있어요.</p>
        <div className="my-room-item-list">
          {room.items.length === 0 && <span>배치된 가구가 없어요.</span>}
          {room.items.map((item) => (
            <button className={selectedItemId === item.id ? 'is-selected' : ''} key={item.id} type="button" onClick={() => setSelectedItemId(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="chat-room-card-actions">
          <button type="button" onClick={resetItems}>기본 배치</button>
          <button type="button" onClick={clearItems}>가구 비우기</button>
        </div>
      </Card>

      <Card className="person-card my-room-future-card">
        <strong>다음 확장 설계</strong>
        <p>지금 배치 데이터는 그대로 저장돼요. 다음에는 실제 PNG/WebP 가구 에셋과 상점 아이템을 `asset_id`에 연결하면 됩니다.</p>
      </Card>

      <div className="my-room-save-bar">
        <Button disabled={isSaving} onClick={save} type="button">{isSaving ? '저장 중' : '마이룸 저장'}</Button>
      </div>
    </section>
  );
}
