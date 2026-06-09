# 현재 구현 상태

마지막 갱신: 2026-06-09

## 개요

이 프로젝트는 모바일 웹 우선의 1:1 채팅 앱입니다. 현재는 React + Vite 프론트엔드와 Cloudflare Pages Functions, D1, R2를 중심으로 구현되어 있습니다.

## 현재 배포/인프라

- 배포: Cloudflare Pages
- 프론트엔드: `apps/web`
- 빌드 결과: `apps/web/dist`
- API: Cloudflare Pages Functions `functions/api/*`
- 데이터베이스: Cloudflare D1, 바인딩 이름 `DB`
- 이미지 저장소: Cloudflare R2, 바인딩 이름 `IMAGES`

## 현재 구현된 주요 기능

### 1. 가입/프로필

- 첫 접속 시 가입 화면 표시
- 닉네임, 성별, 나이만 입력해 가입
- 20세 이상만 가입 가능
- 같은 기기에서는 localStorage 기준으로 한 계정만 사용
- 프로필 정보는 localStorage에 저장
- 서버에는 `profile_id` 기준으로 최근 접속자/토크/채팅방 정보 동기화

현재 프로필 필드:

```txt
nickname
gender
age
location
bio
avatar_url
```

### 2. 프로필 사진

- 설정 화면에서 프로필 사진 업로드 가능
- 이미지는 R2에 저장
- `/api/profile-image`로 업로드/조회
- 업로드 전 1:1 정사각형 크롭 모달 제공
- 확대, 가로 위치, 세로 위치 조절 가능
- 크롭 결과는 512x512 JPEG로 업로드
- 사진이 없으면 닉네임 첫 글자 아바타 표시

적용 위치:

- 설정 화면 미리보기
- 상단 내 프로필 버튼
- 토크 카드
- 사람 탭 최근 접속자 카드

### 3. 토크 탭

- 한줄 토크 작성
- 토크 글 작성자 `profile_id` 저장
- 토크 글에 닉네임, 나이, 지역, 프로필 사진 URL 저장
- 내 글은 다른 스타일로 표시
- 내 글 삭제 가능
- 다른 사람 글에서 대화하기 가능
- 대화하기는 닉네임이 아니라 작성자 `profile_id` 기준으로 직접 채팅방 연결

### 4. 사람 탭

- 최근 접속자 목록 조회
- 최근 접속자는 `profile_id`를 id로 저장
- 내 계정은 목록에서 제외
- 상대방에게 채팅 걸기 가능
- 상대방 프로필 사진 표시
- 사진이 없으면 닉네임 첫 글자 표시

### 5. 채팅방

- D1 기반 채팅방 목록 조회
- 직접대화방은 두 유저의 `profile_id` 조합으로 `direct_key` 생성
- 같은 두 유저는 같은 방 재사용
- 채팅방 목록 제목은 내 기준 상대방 닉네임으로 표시
- 기존 꼬인 방은 클라이언트에서 제목 보정
- 새 메시지 감지 시 채팅 탭 배지 표시
- 채팅 탭 목록 화면에서도 3초마다 자동 갱신
- 목록의 마지막 메시지/시간 갱신
- 새 메시지가 온 방에 `새 메시지` 배지 표시

### 6. 채팅 메시지

- 텍스트 메시지 전송
- 이미지 메시지 전송
- 메시지 전송 시 `profile_id` 포함
- 텍스트 메시지 API는 가입한 사용자만 전송 가능하도록 `profile_id` 검사
- 내가 보낸 메시지는 오른쪽 말풍선으로 표시
- 상대 메시지는 왼쪽 말풍선으로 표시
- 닉네임은 말풍선에 직접 표시하지 않음

### 7. 채팅방 나가기

현재 나가기 방식:

- 방 전체 삭제가 아님
- 나간 사람의 로컬 목록에서만 해당 방 숨김
- 서버에는 시스템 메시지 저장
- 상대방 방에는 `닉네임님이 나갔습니다.` 표시
- 상대방 채팅 목록의 마지막 메시지도 나감 문구로 갱신

관련 API:

```txt
POST /api/chat-room-leave
```

## 주요 API

```txt
GET/POST/DELETE /api/talk-posts
GET/POST        /api/recent-users
GET/POST/DELETE /api/chat-rooms
GET/POST        /api/chat-messages
GET/POST        /api/chat-images
GET/POST        /api/profile-image
POST            /api/profile-sync
POST            /api/chat-room-leave
```

## 클라이언트 주요 파일

```txt
apps/web/src/features/auth/SignupGate.tsx
apps/web/src/features/auth/authStorage.ts
apps/web/src/features/home/HomeScreenNext.tsx
apps/web/src/features/home/api/profileStorage.ts
apps/web/src/features/home/api/profileId.ts
apps/web/src/features/home/api/profileSync.ts
apps/web/src/features/home/api/d1TalkPosts.ts
apps/web/src/features/home/api/recentUsers.ts
apps/web/src/features/home/api/d1ChatRooms.ts
apps/web/src/features/home/api/d1ChatMessages.ts
apps/web/src/features/home/components/ProfileSettingsPanel.tsx
apps/web/src/features/home/components/AvatarCropModal.tsx
apps/web/src/features/home/components/UserAvatar.tsx
apps/web/src/features/home/components/TalkPanel2.tsx
apps/web/src/features/home/components/RecentUsersPanel.tsx
apps/web/src/features/home/components/ChatRoomsList.tsx
apps/web/src/features/home/components/ChatRoomPanel.tsx
apps/web/src/features/home/ProfileAvatar.css
```

## 현재 주의사항

### localStorage 기반 가입

현재 가입은 진짜 계정 인증이 아니라 기기 localStorage 기반입니다. 브라우저 데이터를 지우거나 다른 브라우저를 사용하면 새 계정처럼 동작할 수 있습니다.

### 실시간 방식

현재 실시간 채팅은 WebSocket이 아니라 폴링 기반입니다.

- 전역 새 메시지 감지: 3초 간격
- 채팅 목록 갱신: 3초 간격
- 채팅방 메시지 갱신: 기존 메시지 패널의 폴링 흐름 사용

### 기존 데이터 보정

개발 중 닉네임 기반으로 만들어진 오래된 방은 `participant_a/b` 정보가 없을 수 있습니다. 이런 방은 클라이언트에서 제목을 보정하거나 `상대방과의 대화`로 fallback 표시될 수 있습니다.

## 다음 작업 후보

1. 읽음/안읽음 수 정교화
2. 방별 마지막 읽은 시간 저장
3. 차단/신고 기능
4. 프로필 사진 삭제/기본 이미지 되돌리기
5. 이미지 메시지 서버도 `profile_id` 필수 검사로 강화
6. 실제 인증 체계 도입 검토
7. Cloudflare D1 마이그레이션 파일 정리
