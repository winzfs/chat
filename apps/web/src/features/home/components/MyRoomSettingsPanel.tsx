import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { createDefaultMyRoom, defaultMyRoomItems, floorOptions, loadMyRoom, saveMyRoom, wallpaperOptions, type MyRoom } from '../api/myRoom';
import { getProfileId } from '../api/profileId';
import { RoomCanvas } from './RoomCanvas';
import './MyRoomSettingsPanel.css';

export function MyRoomSettingsPanel({ onClose }: { onClose: () => void }) {
  const [room, setRoom] = useState<MyRoom>(() => createDefaultMyRoom());
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadMyRoom(getProfileId()).then((nextRoom) => {
      if (!isMounted) return;
      setRoom(nextRoom);
      setIsLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      setRoom(createDefaultMyRoom());
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const save = async () => {
    setIsSaving(true);
    const saved = await saveMyRoom(room);
    setIsSaving(false);

    if (!saved) {
      setNotice('마이룸을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    setRoom(saved);
    setNotice('마이룸이 저장됐어요. 새 채팅방에도 이 방이 보여요.');
  };

  const resetItems = () => {
    setRoom((current) => ({ ...current, items: defaultMyRoomItems }));
    setNotice('기본 가구 배치로 되돌렸어요. 저장을 눌러 반영해주세요.');
  };

  const clearItems = () => {
    setRoom((current) => ({ ...current, items: [] }));
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
        <strong>미리보기</strong>
        {isLoading ? <p>마이룸을 불러오는 중...</p> : <RoomCanvas isCompact room={room} />}
        {notice && <p className="my-room-notice">{notice}</p>}
      </Card>

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
        <p>지금은 기본 가구 배치를 저장하고, 이후 에셋 이미지·벽지·액자·가구 아이템을 이 구조에 붙일 수 있게 설계했어요.</p>
        <div className="my-room-item-list">
          {room.items.length === 0 && <span>배치된 가구가 없어요.</span>}
          {room.items.map((item) => <span key={item.id}>{item.label}</span>)}
        </div>
        <div className="chat-room-card-actions">
          <button type="button" onClick={resetItems}>기본 배치</button>
          <button type="button" onClick={clearItems}>가구 비우기</button>
        </div>
      </Card>

      <Card className="person-card my-room-future-card">
        <strong>다음 확장 설계</strong>
        <p>아이템은 `asset_id`, 위치 `x/y`, 깊이 `z_index`, 회전값을 가지고 있어요. 나중에 실제 가구 PNG나 도트 에셋을 넣으면 이 데이터 그대로 배치 편집기로 확장할 수 있어요.</p>
      </Card>

      <div className="my-room-save-bar">
        <Button disabled={isSaving} onClick={save} type="button">{isSaving ? '저장 중' : '마이룸 저장'}</Button>
      </div>
    </section>
  );
}
