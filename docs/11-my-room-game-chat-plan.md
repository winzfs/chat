# 마이룸 게임형 채팅 설계

마지막 갱신: 2026-06-12

이 문서는 플러팅 채팅방을 일반 메시지 리스트가 아니라 **마이룸 기반 게임형 채팅 화면**으로 확장하기 위한 설계 문서입니다.

## 목표

- 채팅방 화면을 방처럼 보이는 2D 마이룸으로 표현
- 내 캐릭터와 상대 캐릭터를 방 안에 표시
- 메시지를 캐릭터 위 말풍선으로 표시
- 설정 탭에서 내 마이룸을 꾸밀 수 있게 구성
- 나중에 가구, 카페트, 벽지, 바닥, 액자, 캐릭터 에셋을 쉽게 추가할 수 있는 구조 유지

## 현재 구현 범위

```txt
- 설정 탭 → 마이룸 꾸미기 진입
- 마이룸 꾸미기 화면에 방 미리보기 유지
- 꾸미기 메뉴는 방 화면 내부의 접을 수 있는 플로팅 버튼/패널로 표시
- 편집 메뉴 탭: 가구 / 카페트 / 선택 / 벽지 / 바닥 / 관리
- 마이룸 벽지 선택
- 마이룸 바닥 선택
- 기본 가구/소품 배치 표시
- 가구 카탈로그/인벤토리 목록
- 카페트 카테고리 분리
- 하트러그 rug01 에셋 등록
- 가구 추가
- 카페트 추가
- 선택 가구 삭제
- 선택 가구 복제
- 같은 가구 여러 개 배치
- 가구 드래그 위치 이동
- 선택한 가구 앞/뒤 깊이 조절
- 선택한 가구 회전 조절
- 마이룸 저장 API 추가
- 채팅방 화면에 큰 마이룸 캔버스 표시
- 메시지를 캐릭터 위 말풍선으로 표시
- 방 화면 터치 시 내 캐릭터 위치 이동
- 대화 기록은 접기/펼치기 방식으로 확인
- 가구 드래그 중 React 재렌더 최소화
- 채팅방 마이룸 화면 페인트 비용 완화
```

현재 캐릭터 위치 이동은 내 화면에서만 즉시 반영됩니다. 상대방에게 위치를 실시간 동기화하는 기능은 아직 없습니다.

## 채팅방 기본 마이룸 기준

1:1 대화방이 새로 생성될 때, **대화를 신청한 사람**이 해당 채팅방의 기본 마이룸 주인이 됩니다.

```txt
chat_rooms.room_owner_profile_id = 대화를 신청한 사람 profile_id
chat_rooms.room_owner_nickname = 대화를 신청한 사람 nickname
```

채팅방 화면은 `room_owner_profile_id` 기준으로 `/api/my-room`에서 마이룸 데이터를 불러옵니다.

기존에 만들어진 채팅방처럼 `room_owner_profile_id`가 없는 경우에는 `participant_a_id`를 우선 마이룸 주인으로 보정합니다.

## 데이터 모델

### chat_rooms 추가 필드

```sql
room_owner_profile_id text
room_owner_nickname text
```

### my_rooms

```sql
create table if not exists my_rooms (
  profile_id text primary key,
  wallpaper text not null default 'peach',
  floor text not null default 'cream',
  items text not null default '[]',
  updated_at text not null default (datetime('now'))
);
```

`items`는 JSON 문자열로 저장합니다.

## 마이룸 아이템 구조

```ts
type MyRoomItem = {
  id: string;
  item_type: string;
  asset_id: string;
  label: string;
  x: number;
  y: number;
  z_index: number;
  rotation?: number;
};
```

필드 의미:

```txt
id        개별 배치 아이템 ID
item_type bed/desk/side-desk/table/plant/window/rug/frame/sofa/shelf/lamp 같은 논리 타입
asset_id  실제 이미지 에셋과 연결될 ID
label     UI에 보여줄 이름
x         방 안의 가로 위치, 0~100 퍼센트
y         방 안의 세로 위치, 0~100 퍼센트
z_index   앞뒤 깊이
rotation  회전값
```

이 구조를 유지하면 나중에 실제 PNG, WebP, 도트 에셋을 연결해도 데이터 구조를 크게 바꾸지 않아도 됩니다.

## 가구/카페트 카탈로그 구조

현재 카탈로그는 클라이언트의 `roomItemCatalog`에 정의되어 있습니다. UI에서는 `item_type === 'rug'` 항목을 카페트 탭으로 분리하고, 나머지 항목은 가구 탭에 표시합니다.

```txt
basic-window       창문
star-bed           별침대 / bed01
wooden-desk        나무책상 / desk01
wooden-side-desk   나무협탁 / sidedesk01
round-rug          러그
heart-rug          하트러그 / rug01
tea-table          테이블
small-plant        화분
heart-frame        액자
cozy-sofa          소파
book-shelf         책장
mood-lamp          스탠드
```

`rug01` 에셋 경로:

```txt
apps/web/public/assets/room/furniture/rug01.png
```

기본 배치는 `defaultCatalogIds`로 고정해 관리합니다. 새로 추가한 하트러그는 카탈로그에만 등록되어 있으며 기본 방에는 자동 포함하지 않습니다.

같은 가구나 카페트를 여러 개 추가할 수 있도록 배치 아이템은 카탈로그 ID와 별도의 고유 `id`를 가집니다.

## 마이룸 편집 UI 구조

꾸미기 메뉴가 방 화면을 덮거나 늘어지지 않도록 편집 UI는 아래처럼 구성합니다.

```txt
상단: 뒤로가기 + 마이룸 꾸미기 제목 + 저장 버튼
중단: 방 미리보기 / 드래그 편집 캔버스
방 내부 우하단: 접을 수 있는 꾸미기 플로팅 버튼
플로팅 패널: 가구 / 카페트 / 선택 / 벽지 / 바닥 / 관리 탭
```

편집 메뉴 탭:

```txt
가구     러그를 제외한 가구 카탈로그에서 새 가구 추가
카페트   rug 타입 아이템만 모아 표시, 하트러그 포함
선택     선택한 가구 이동/앞뒤/회전/복제/삭제
벽지     벽지 선택
바닥     바닥 선택
관리     기본 배치 복원/가구 모두 비우기
```

방 미리보기를 보면서 바로 꾸밀 수 있도록 한 번에 하나의 메뉴 패널만 보여줍니다.

## 에셋 연결 방식

현재 실제 이미지 에셋은 `RoomCanvas.tsx`의 `furnitureAssetPaths`에서 `asset_id`와 파일 경로를 연결합니다.

```txt
bed01       /assets/room/furniture/bed01.png
desk01      /assets/room/furniture/desk01.png
sidedesk01  /assets/room/furniture/sidedesk01.png
rug01       /assets/room/furniture/rug01.png
```

이미지 크기 보정은 기본 `RoomCanvas.css`에 두되, 신규 이미지별 세부 보정은 `RoomCanvasFurnitureAssets.css`에 분리합니다.

## 성능 최적화 메모

마이룸 화면은 모바일 WebView에서 렉이 나기 쉬우므로 아래 기준을 유지합니다.

```txt
- 드래그 중에는 React 상태를 매 프레임 갱신하지 않음
- 드래그 중에는 DOM 위치만 requestAnimationFrame으로 갱신
- pointerup/pointercancel 시점에만 저장용 상태를 갱신
- RoomCanvas는 memo 처리하여 불필요한 재렌더를 줄임
- blur/filter와 큰 box-shadow 사용을 줄임
- room-canvas에 contain: layout paint style 적용
- 채팅방 말풍선 계산 시 localStorage/profile 반복 조회를 피함
```

가구가 많아지면 다음 최적화 후보는 실제 에셋 스프라이트 시트화, 화면 밖 요소 렌더링 제한, 가구 개수 제한입니다.

## 주요 파일

```txt
functions/api/my-room/index.ts
functions/api/chat-rooms/index.ts
apps/web/src/features/home/api/myRoom.ts
apps/web/src/features/home/api/d1ChatRooms.ts
apps/web/src/features/home/components/RoomCanvas.tsx
apps/web/src/features/home/components/RoomCanvas.css
apps/web/src/features/home/components/RoomCanvasFurnitureAssets.css
apps/web/src/features/home/components/ChatRoomGameScene.tsx
apps/web/src/features/home/components/ChatRoomGameScene.css
apps/web/src/features/home/components/MyRoomSettingsPanel.tsx
apps/web/src/features/home/components/MyRoomSettingsPanel.css
apps/web/src/features/home/components/ChatRoomPanel.tsx
apps/web/src/features/home/components/ProfileSettingsPanel.tsx
apps/web/public/assets/room/furniture/bed01.png
apps/web/public/assets/room/furniture/desk01.png
apps/web/public/assets/room/furniture/sidedesk01.png
apps/web/public/assets/room/furniture/rug01.png
apps/web/schema/d1.sql
```

## 컴포넌트 역할

### RoomCanvas

마이룸을 그리는 공통 캔버스입니다.

역할:

- 벽지 표시
- 바닥 표시
- 가구/소품/카페트 표시
- 캐릭터 표시
- 말풍선 표시
- 방 터치 위치 계산
- 편집 모드에서 가구 드래그 위치 계산
- 드래그 중 DOM 위치 직접 갱신
- `asset_id` 기준 이미지 에셋 렌더링

설정 화면과 채팅방 화면에서 같이 사용합니다.

### MyRoomSettingsPanel

설정 탭 안의 마이룸 꾸미기 화면입니다.

역할:

- 내 마이룸 불러오기
- 방 미리보기 표시
- 접을 수 있는 꾸미기 플로팅 메뉴 표시
- 편집 메뉴 탭 전환
- 벽지 선택
- 바닥 선택
- 가구 카탈로그 표시
- 카페트 카탈로그 표시
- 가구/카페트 추가
- 가구 드래그 배치
- 선택한 가구 앞/뒤 깊이 조절
- 선택한 가구 회전 조절
- 선택한 가구 복제
- 선택한 가구 삭제
- 기본 배치 복원
- 가구 모두 비우기
- 마이룸 저장

### ChatRoomGameScene

채팅방 안의 게임형 대화 화면입니다.

역할:

- 채팅방의 마이룸 주인 확인
- 마이룸 데이터 불러오기
- 내 캐릭터/상대 캐릭터 표시
- 최신 메시지를 말풍선으로 표시
- 터치한 위치로 내 캐릭터 이동
- 채팅방에서 방 화면을 크게 표시

## 다음 확장 후보

### 1. 실제 에셋 연결 확대

```txt
- /assets/room/furniture/{asset_id}.png
- /assets/room/wallpapers/{wallpaper}.png
- /assets/room/floors/{floor}.png
```

### 2. 가구 보유/구매 상태 분리

```txt
- 무료 기본 가구
- 구매한 가구
- 잠긴 가구
- 포인트 가격
- 희귀도
```

### 3. 캐릭터 커스터마이징

```txt
- 기본 아바타
- 의상
- 표정
- 위치 동기화
```

### 4. 방 방문/좋아요

```txt
- 상대 마이룸 방문
- 방 좋아요
- 인기 방 목록
```

### 5. 채팅방 내 상호작용

```txt
- 이모트
- 손 흔들기
- 선물 던지기
- 작은 미니게임
```
