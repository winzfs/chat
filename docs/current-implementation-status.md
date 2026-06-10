# 현재 구현 상태

마지막 갱신: 2026-06-10

## 개요

이 프로젝트는 **플러팅**이라는 모바일 웹 우선 1:1 채팅 앱입니다. 현재는 React + Vite 프론트엔드와 Cloudflare Pages Functions, D1, R2를 중심으로 구현되어 있습니다.

현재 앱 화면은 `apps/web/src/features/home/HomeScreenNext.tsx`가 기준입니다. 구버전 `HomeScreen.tsx`는 빌드 호환을 위해 `HomeScreenNext`를 그대로 위임합니다.

## 현재 배포/인프라

- 배포: Cloudflare Pages
- 프론트엔드: `apps/web`
- 빌드 결과: `apps/web/dist`
- API: Cloudflare Pages Functions `functions/api/*`
- 데이터베이스: Cloudflare D1, 바인딩 이름 `DB`
- 이미지 저장소: Cloudflare R2, 바인딩 이름 `IMAGES`
- 운영자 판별: Cloudflare 환경변수 `ADMIN_PROFILE_IDS`
- Android 포장: Capacitor
- Android 앱 이름: 플러팅
- Android 패키지명: `com.flirting.app`
- 앱 아이콘 원본: `resources/icon.png`
- 스플래시 원본: `resources/splash.png`

## Android 앱 상태

- Debug APK는 GitHub Actions 수동 실행으로 빌드합니다.
- Release AAB는 GitHub Actions 수동 실행으로 빌드합니다.
- Android 기본 스플래시는 플랫폼 특성상 아이콘 중심으로 표시됩니다.
- 실제 브랜드 스플래시는 앱 시작 직후 웹앱 내부 풀스크린 오버레이로 표시합니다.
- Android 앱에서 API 호출은 `apps/web/src/features/home/api/apiBase.ts`를 통해 Cloudflare Pages 배포 주소로 연결합니다.

관련 파일:

```txt
capacitor.config.ts
resources/icon.png
resources/splash.png
.github/workflows/android-debug-apk.yml
.github/workflows/android-release-aab.yml
apps/web/src/shared/components/AppLaunchSplash.tsx
apps/web/src/shared/components/AppLaunchSplash.css
apps/web/src/features/home/api/apiBase.ts
```

## 현재 구현된 주요 기능

### 1. 가입/프로필

- 첫 접속 시 가입 화면 표시
- 닉네임, 성별, 나이, 지역을 입력해 가입
- 지역은 대한민국 광역시/도 목록에서 선택
- 20세 이상만 가입 가능
- 같은 기기에서는 localStorage 기준으로 한 계정만 사용
- 프로필 정보는 localStorage에 저장
- 서버에는 `profile_id` 기준으로 최근 접속자/토크/채팅방 정보 동기화
- 토크/사람/채팅 목록에서 프로필 아이콘을 눌러 프로필 정보를 확인할 수 있음
- 채팅방 말풍선 내부에서는 프로필 아이콘을 표시하지 않음
- 프로필 모달은 채팅 입력창/하단 네비게이션보다 위에 뜨도록 전용 레이어 사용

지역 목록:

```txt
서울특별시, 부산광역시, 대구광역시, 인천광역시, 광주광역시, 대전광역시, 울산광역시, 세종특별자치시,
경기도, 강원특별자치도, 충청북도, 충청남도, 전북특별자치도, 전라남도, 경상북도, 경상남도, 제주특별자치도
```

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
- 채팅방 목록은 상대방 `peer_avatar_url`을 사용해 상대 프로필 이미지를 표시

적용 위치:

- 설정 화면 미리보기
- 토크 카드
- 사람 탭 최근 접속자 카드
- 채팅 목록 카드
- 프로필 모달

### 3. 포인트 시스템

현재 포인트 기능은 1차 구현 상태입니다.

- 포인트 잔액은 `user_points` 테이블에 저장
- 포인트 내역은 `point_transactions` 테이블에 저장
- 하루 1회 보상 여부는 `daily_point_claims` 테이블로 관리
- 설정 탭 상단에서 현재 포인트 표시
- 설정 탭에서 출석체크 가능
- 설정 탭에서 광고보기 보상 가능
- 설정 탭에서 포인트 충전 상품 UI 확인 가능

포인트 지급/차감 정책:

```txt
쪽지/1:1 대화 시작: 100P 차감
토크 작성 보상: 하루 1회 100P 지급
출석체크 보상: 하루 1회 100P 지급
광고보기 보상: 하루 1회 100P 지급
```

쪽지 차감 규칙:

- 새 1:1 대화방을 만들 때 100P 차감
- 나간 방을 다시 열어 새 대화를 시작하는 경우 100P 차감
- 이미 존재하고 내가 나가지 않은 1:1 방을 단순히 다시 여는 경우는 중복 차감하지 않음
- 포인트가 부족하면 쪽지 시작을 막고 안내 문구 표시

포인트 충전 기준:

```txt
기본 단가: 1,000P = ₩1,200

1,000P  / ₩1,200  / 기본 충전
5,300P  / ₩6,000  / 300P 보너스
10,800P / ₩12,000 / 800P 보너스
33,000P / ₩36,000 / 3,000P 보너스
57,000P / ₩60,000 / 7,000P 보너스
```

포인트 충전 상태:

- 설정 탭에 충전 메뉴와 상품 UI는 존재
- 실제 결제 PG는 아직 연결되지 않음
- 상품을 누르면 결제 준비 중 안내만 표시
- 많이 결제할수록 보너스 포인트가 조금씩 커지는 구조

광고보기 상태:

- 광고보기 보상 API/UI는 존재
- 실제 광고 SDK는 아직 연결되지 않음
- 현재는 버튼 클릭 시 하루 1회 100P 보상만 처리

관련 파일:

```txt
functions/api/points/index.ts
apps/web/src/features/home/api/points.ts
apps/web/src/features/home/components/ProfileSettingsPanel.tsx
```

### 4. 토크 탭

- 한줄 토크 작성
- 토크 작성 시 분위기 선택 없이 내용만 입력
- 토크 글 작성자 `profile_id` 저장
- 토크 글에 닉네임, 나이, 지역, 프로필 사진 URL 저장
- 내 글은 다른 스타일로 표시
- 내 글 삭제 가능
- 토크 목록에서 분위기 문구와 `#태그` 표시는 숨김
- 다른 사람 글에서 `쪽지 100P` 버튼으로 대화 시작
- 대화 연결은 닉네임이 아니라 작성자 `profile_id` 기준
- 토크 탭을 보고 있을 때 자동 갱신
- 토크 작성/삭제/프로필 저장 후 즉시 다시 불러오기
- 토크 작성 성공 시 하루 1회 100P 보상 지급
- API 실패 시 목업 글을 만들지 않고 실패 안내 표시

### 5. 사람 탭

- 최근 접속자 목록 조회
- 최근 접속자는 `profile_id`를 id로 저장
- 내 계정은 목록에서 제외
- 차단한 사용자 또는 나를 차단한 사용자는 목록에서 제외
- 상대방 프로필 사진 표시
- 사진이 없으면 닉네임 첫 글자 표시
- `쪽지 100P` 버튼으로 상대방에게 쪽지 시작
- 포인트 부족 시 쪽지 시작 실패 안내 표시
- 사람 탭을 보고 있을 때 자동 갱신

### 6. 채팅방

- D1 기반 채팅방 목록 조회
- 직접대화방은 두 유저의 `profile_id` 조합으로 `direct_key` 생성
- 같은 두 유저는 같은 방 재사용
- 채팅방 목록 제목은 내 기준 상대방 닉네임으로 표시
- 채팅방 목록 프로필 이미지는 상대방 `peer_avatar_url` 사용
- 채팅 탭 진입 시 기본적으로 채팅방 목록부터 표시
- 프로필 모달/토크/사람 탭에서 대화 시작 시에만 특정 방으로 진입
- 새 메시지 감지 시 하단 채팅 탭 점 표시
- 새 메시지 알림용 큰 카드 표시 없음
- 채팅 탭 목록 화면에서도 자동 갱신
- 목록의 마지막 메시지/시간 갱신
- 방별 안 읽은 메시지 수 표시
- 차단된 사용자와는 새 직접 채팅방 생성 차단
- 포인트가 부족하면 새 쪽지/새 직접대화 시작 차단

### 7. 채팅 메시지

- 텍스트 메시지 전송
- 이미지 메시지 전송
- 메시지 전송 시 `profile_id` 포함
- 텍스트 메시지 API는 가입한 사용자만 전송 가능하도록 `profile_id` 검사
- 이미지 메시지 API도 `profile_id` 필수 검사 및 `sender_profile_id` 저장
- 메시지 로딩 시 방별 읽음 시간이 저장됨
- 내가 보낸 메시지는 `sender_profile_id` 우선 기준으로 오른쪽 말풍선 표시
- 상대 메시지는 왼쪽 말풍선으로 표시
- 닉네임과 프로필 아이콘은 말풍선에 직접 표시하지 않음
- 채팅 입력창은 하단 네비게이션 위에 고정 표시

### 8. 채팅방 나가기

현재 나가기 방식:

- 방 전체 삭제가 아님
- 나간 사람의 목록에서만 해당 방 숨김
- 서버에는 시스템 메시지 저장
- 상대방 방에는 `닉네임님이 나갔습니다.` 표시
- 상대방 채팅 목록의 마지막 메시지도 나감 문구로 갱신
- 나간 사용자가 다시 대화를 시작하면 이전 메시지는 보이지 않음
- 나간 사용자가 다시 대화를 시작하면 이전 나감 시스템 메시지도 보이지 않음
- 양쪽 모두 나간 뒤 다시 대화가 시작되면 목록 요약은 `아직 메시지가 없어요.`로 초기화

관련 API:

```txt
POST /api/chat-room-leave
```

### 9. 차단/신고

- 채팅방 안에서 상대방 신고 가능
- 채팅방 안에서 상대방 차단 가능
- 차단 정보는 `user_blocks` 테이블에 저장
- 신고 정보는 `reports` 테이블에 저장
- 차단된 관계는 최근 접속자 목록과 새 직접 채팅방 생성에서 제외
- 설정 화면의 차단 관리에서 차단 목록 조회와 차단 해제 가능
- 신고 목록 조회와 신고 상태 변경은 운영자만 가능
- 신고 상태를 `open`, `reviewing`, `closed`로 변경 가능
- 운영자는 신고 대상의 프로필, 소개글, 프로필 사진, 토크 글, 관련 채팅방과 메시지 검토 자료를 조회할 수 있음

### 10. Android 뒤로가기

Android 네이티브 환경에서는 Capacitor App 플러그인으로 뒤로가기를 처리합니다.

동작:

```txt
토크 작성 모달 열림 → 모달 닫기
채팅방 내부 → 채팅 목록으로 이동
채팅 목록 → 토크 탭으로 이동
사람/설정 탭 → 토크 탭으로 이동
토크 탭 → 앱 최소화
```

## 주요 API

```txt
GET/POST/DELETE /api/talk-posts
GET/POST        /api/recent-users
GET             /api/profile-lookup
GET/POST/DELETE /api/chat-rooms
GET/POST        /api/chat-messages
GET/POST        /api/chat-images
GET/POST        /api/points
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
apps/web/src/main.tsx
apps/web/src/features/auth/SignupGate.tsx
apps/web/src/features/auth/authStorage.ts
apps/web/src/features/home/HomeScreen.tsx
apps/web/src/features/home/HomeScreenNext.tsx
apps/web/src/features/home/api/apiBase.ts
apps/web/src/features/home/api/points.ts
apps/web/src/features/home/api/d1TalkPosts.ts
apps/web/src/features/home/api/d1ChatRooms.ts
apps/web/src/features/home/api/d1ChatMessages.ts
apps/web/src/features/home/api/recentUsers.ts
apps/web/src/features/home/api/profileStorage.ts
apps/web/src/features/home/api/profileSync.ts
apps/web/src/features/home/components/ProfileSettingsPanel.tsx
apps/web/src/features/home/components/TalkPanel2.tsx
apps/web/src/features/home/components/RecentUsersPanel.tsx
apps/web/src/features/home/components/ChatRoomsList.tsx
apps/web/src/features/home/components/ChatRoomPanel.tsx
apps/web/src/features/home/components/ChatMessageItem.tsx
apps/web/src/features/home/components/ProfilePreviewModal.tsx
```

## 서버 주요 파일

```txt
functions/api/points/index.ts
functions/api/talk-posts/index.ts
functions/api/recent-users/index.ts
functions/api/profile-lookup/index.ts
functions/api/profile-sync/index.ts
functions/api/profile-image/index.ts
functions/api/chat-rooms/index.ts
functions/api/chat-messages/index.ts
functions/api/chat-images/index.ts
functions/api/chat-room-leave/index.ts
functions/api/user-blocks/index.ts
functions/api/reports/index.ts
functions/api/admin/me.ts
functions/api/admin/user-review.ts
```

## 현재 주의사항

- 가입은 아직 실제 인증이 아니라 localStorage 기반입니다.
- 같은 기기 1계정 제한은 브라우저 데이터 삭제나 다른 브라우저 사용 시 우회될 수 있습니다.
- 운영자 권한은 현재 `ADMIN_PROFILE_IDS` 기반이므로 실제 운영 전 로그인 기반 권한 검사가 필요합니다.
- 실시간 기능은 WebSocket이 아니라 폴링 기반입니다.
- 포인트 충전 상품 UI는 있으나 실제 결제 PG는 아직 연결되지 않았습니다.
- 광고보기 보상 API/UI는 있으나 실제 광고 SDK는 아직 연결되지 않았습니다.
- 개발 중 만들어진 오래된 채팅방은 participant 정보가 없어 제목이 보정 표시될 수 있습니다.
- 오래된 메시지는 `sender_profile_id`가 비어 있을 수 있어 닉네임 기준으로 보정 표시됩니다.
- Play Store 업로드 후 Android 패키지명은 변경하기 어렵습니다.

## 다음 작업 후보

- Cloudflare Pages 배포 빌드 로그 확인
- Android Debug APK 빌드 로그 확인
- 포인트 메뉴 실제 단말 테스트
- 쪽지 100P 차감 플로우 테스트
- 출석체크/광고보기 하루 1회 제한 테스트
- 포인트 충전 PG 연동
- 보상형 광고 SDK 연동
- release AAB 서명 키 생성 및 GitHub Secrets 등록
- Play Store 등록 정보 작성
- 실제 인증 체계 도입
