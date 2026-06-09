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
- 운영자 판별: Cloudflare 환경변수 `ADMIN_PROFILE_IDS`

## 현재 구현된 주요 기능

### 1. 가입/프로필

- 첫 접속 시 가입 화면 표시
- 닉네임, 성별, 나이, 지역을 입력해 가입
- 20세 이상만 가입 가능
- 같은 기기에서는 localStorage 기준으로 한 계정만 사용
- 프로필 정보는 localStorage에 저장
- 가입 시 입력한 지역은 `profile.location`에 저장되고 토크/사람/프로필 모달에 표시됨
- 서버에는 `profile_id` 기준으로 최근 접속자/토크/채팅방 정보 동기화
- 토크, 사람, 채팅 목록, 채팅방 메시지에서 프로필 아이콘을 눌러 프로필 정보를 확인할 수 있음
- 프로필 모달은 `profile_id`가 있으면 `/api/profile-lookup`으로 최신 프로필 정보를 다시 불러옴

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
- `/api/profile-image`로 업로드/조회/삭제 가능
- 업로드 전 1:1 정사각형 크롭 모달 제공
- 확대, 가로 위치, 세로 위치 조절 가능
- 크롭 결과는 512x512 JPEG로 업로드
- 프로필 사진을 기본 이미지로 되돌릴 수 있음
- 프로필 사진 업로드/기본 이미지 되돌리기 후 즉시 프로필 저장까지 처리
- 사진이 없으면 닉네임 첫 글자 아바타 표시
- 목록과 프로필 모달의 프로필 아이콘/사진 크기를 모바일에서 더 잘 보이도록 키움

적용 위치:

- 설정 화면 미리보기
- 상단 내 프로필 버튼
- 토크 카드
- 사람 탭 최근 접속자 카드
- 채팅 목록 카드
- 채팅방 메시지

### 3. 토크 탭

- 한줄 토크 작성
- 토크 작성 시 분위기 선택 없이 내용만 입력
- 토크 글 작성자 `profile_id` 저장
- 토크 글에 닉네임, 나이, 지역, 프로필 사진 URL 저장
- 내 글은 다른 스타일로 표시
- 내 글 삭제 가능
- 토크 목록에서 분위기 문구와 `#태그` 표시는 숨김
- 다른 사람 글에서 대화하기 가능
- 대화하기는 닉네임이 아니라 작성자 `profile_id` 기준으로 직접 채팅방 연결
- 토크 탭을 보고 있을 때 자동 갱신
- 토크 작성/삭제/프로필 저장 후 즉시 다시 불러오기

### 4. 사람 탭

- 최근 접속자 목록 조회
- 최근 접속자는 `profile_id`를 id로 저장
- 내 계정은 목록에서 제외
- 차단한 사용자 또는 나를 차단한 사용자는 목록에서 제외
- 상대방에게 채팅 걸기 가능
- 상대방 프로필 사진 표시
- 사진이 없으면 닉네임 첫 글자 표시
- 사람 탭을 보고 있을 때 자동 갱신

### 5. 채팅방

- D1 기반 채팅방 목록 조회
- 직접대화방은 두 유저의 `profile_id` 조합으로 `direct_key` 생성
- 같은 두 유저는 같은 방 재사용
- 채팅방 목록 제목은 내 기준 상대방 닉네임으로 표시
- 기존 꼬인 방은 클라이언트에서 제목 보정
- 새 메시지 감지 시 채팅 탭 배지 표시
- 채팅 탭 목록 화면에서도 자동 갱신
- 목록의 마지막 메시지/시간 갱신
- 방별 안 읽은 메시지 수 표시
- 차단된 사용자와는 새 직접 채팅방 생성 차단

### 6. 채팅 메시지

- 텍스트 메시지 전송
- 이미지 메시지 전송
- 메시지 전송 시 `profile_id` 포함
- 텍스트 메시지 API는 가입한 사용자만 전송 가능하도록 `profile_id` 검사
- 이미지 메시지 API도 `profile_id` 필수 검사 및 `sender_profile_id` 저장
- 메시지 로딩 시 방별 읽음 시간이 저장됨
- 내가 보낸 메시지는 `sender_profile_id` 우선 기준으로 오른쪽 말풍선 표시
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

### 8. 차단/신고

- 채팅방 안에서 상대방 신고 가능
- 채팅방 안에서 상대방 차단 가능
- 차단 정보는 `user_blocks` 테이블에 저장
- 신고 정보는 `reports` 테이블에 저장
- 차단된 관계는 최근 접속자 목록과 새 직접 채팅방 생성에서 제외
- 설정 화면의 차단 관리에서 차단 목록 조회와 차단 해제 가능
- 신고 목록 조회와 신고 상태 변경은 운영자만 가능
- 신고 상태를 `open`, `reviewing`, `closed`로 변경 가능
- 운영자는 신고 대상의 프로필, 소개글, 프로필 사진, 토크 글, 관련 채팅방과 메시지 검토 자료를 조회할 수 있음

## 주요 API

```txt
GET/POST/DELETE /api/talk-posts
GET/POST        /api/recent-users
GET             /api/profile-lookup
GET/POST/DELETE /api/chat-rooms
GET/POST        /api/chat-messages
GET/POST        /api/chat-images
GET/POST/DELETE /api/profile-image
POST            /api/profile-sync
POST            /api/chat-room-leave
GET/POST/DELETE /api/user-blocks
GET/POST/PATCH  /api/reports
GET             /api/admin/me
GET             /api/admin/user-review
```

## 클라이언트 주요 파일

```txt
apps/web/src/features/auth/SignupGate.tsx
apps/web/src/features/auth/authStorage.ts
apps/web/src/features/home/HomeScreenNext.tsx
apps/web/src/features/home/api/profileStorage.ts
apps/web/src/features/home/api/profileId.ts
apps/web/src/features/home/api/profileSync.ts
apps/web/src/features/home/api/profileLookup.ts
apps/web/src/features/home/api/d1TalkPosts.ts
apps/web/src/features/home/api/recentUsers.ts
apps/web/src/features/home/api/d1ChatRooms.ts
apps/web/src/features/home/api/d1ChatMessages.ts
apps/web/src/features/home/api/userSafety.ts
apps/web/src/features/home/api/reportsAdmin.ts
apps/web/src/features/home/api/pollingIntervals.ts
apps/web/src/features/home/api/admin.ts
apps/web/src/features/home/components/ProfileSettingsPanel.tsx
apps/web/src/features/home/components/AvatarCropModal.tsx
apps/web/src/features/home/components/UserAvatar.tsx
apps/web/src/features/home/components/ProfilePreviewModal.tsx
apps/web/src/features/home/components/TalkPanel2.tsx
apps/web/src/features/home/components/RecentUsersPanel.tsx
apps/web/src/features/home/components/ChatRoomsList.tsx
apps/web/src/features/home/components/ChatRoomPanel.tsx
apps/web/src/features/home/components/ChatMessageItem.tsx
apps/web/src/features/home/components/ReportsAdminPanel.tsx
apps/web/src/features/home/components/BlockedUsersPanel.tsx
apps/web/src/features/home/ProfileAvatar.css
```

## 현재 주의사항

### localStorage 기반 가입

현재 가입은 진짜 계정 인증이 아니라 기기 localStorage 기반입니다. 브라우저 데이터를 지우거나 다른 브라우저를 사용하면 새 계정처럼 동작할 수 있습니다.

### 실시간 방식

현재 실시간 채팅은 WebSocket이 아니라 폴링 기반입니다. 폴링 간격은 `apps/web/src/features/home/api/pollingIntervals.ts`에서 관리합니다.

현재 설정:

```txt
채팅방 메시지: 3초
채팅 목록/새 메시지 배지: 5초
토크 탭: 7초
사람 탭: 10초
```

현재 코드에는 부담을 줄이기 위한 기본 장치가 일부 적용되어 있습니다.

- 토크/사람 탭은 해당 탭을 보고 있을 때만 갱신
- 브라우저 탭이 백그라운드 상태(`document.hidden`)일 때는 토크/사람/채팅 메시지 갱신 생략
- 채팅방 메시지는 채팅방을 열었을 때만 갱신

MVP/테스트 단계에서는 폴링 기반으로 유지해도 됩니다. 다만 사용자가 늘면 Cloudflare Pages Functions 호출 수와 D1 쿼리 수가 증가하고, 모바일 배터리/데이터 사용량도 늘 수 있습니다.

운영 단계 확장 방향:

```txt
초기 MVP: 폴링 유지
사용자 증가: 폴링 간격 조정 + 필요한 탭만 갱신
실시간 강화: WebSocket 또는 Cloudflare Durable Objects 검토
```

### 신고 관리 보안

신고 관리 API는 `ADMIN_PROFILE_IDS`에 포함된 `profile_id`만 접근할 수 있습니다. Cloudflare Pages 환경변수에 운영자 `profile_id`를 쉼표로 구분해 등록해야 합니다.

```txt
ADMIN_PROFILE_IDS=운영자_profile_id
```

현재는 localStorage 기반 `profile_id`를 운영자 식별에 사용하므로, 실제 운영 전에는 로그인 기반 관리자 권한 검사로 교체하는 것이 안전합니다.

### 기존 데이터 보정

개발 중 닉네임 기반으로 만들어진 오래된 방은 `participant_a/b` 정보가 없을 수 있습니다. 이런 방은 클라이언트에서 제목을 보정하거나 `상대방과의 대화`로 fallback 표시될 수 있습니다.

오래된 메시지는 `sender_profile_id`가 비어 있을 수 있습니다. 이 경우 클라이언트는 닉네임 기준으로 내 메시지 여부를 보정합니다.

## 다음 작업 후보

1. 로컬에서 `pnpm build`로 타입/빌드 확인
2. Cloudflare Pages 환경변수 `ADMIN_PROFILE_IDS` 등록
3. 프로필 모달에서 채팅 시작 버튼 연결 범위 확대
4. 실제 인증 체계 도입 검토
5. WebSocket 또는 Durable Objects 기반 실시간화 검토