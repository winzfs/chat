# 플러팅

모바일 웹 우선의 1:1 채팅 앱 프로젝트입니다. 현재는 React + Vite 프론트엔드와 Cloudflare Pages Functions, D1, R2를 기반으로 구현하고 있습니다.

## 목표

- 모바일 웹앱을 먼저 완성합니다.
- Cloudflare Pages로 배포합니다.
- Capacitor를 사용해 Android 앱으로 패키징합니다.
- 유지보수와 확장이 쉽도록 기능을 작은 모듈로 분리합니다.
- 포인트 기반 쪽지/수익화 구조를 단계적으로 도입합니다.

## 현재 기술 스택

```txt
Frontend: React + Vite
Deploy: Cloudflare Pages
API: Cloudflare Pages Functions
DB: Cloudflare D1
Image Storage: Cloudflare R2
Mobile Wrapper: Capacitor
CI Build: GitHub Actions
```

## 현재 구현된 기능

### 가입/프로필

- 닉네임, 성별, 나이, 지역을 입력하는 간단 가입
- 지역은 대한민국 광역시/도 목록에서 선택
- 프로필 설정 화면에서도 같은 지역 목록으로 변경 가능
- 20세 이상 가입 제한
- 같은 기기 localStorage 기준 1계정 사용
- 프로필 저장/수정
- 닉네임, 나이, 지역, 소개, 프로필 사진 동기화
- `profile_id` 또는 닉네임 기반 최신 프로필 조회 API 제공
- 토크/사람/채팅 목록의 프로필 아이콘에서 프로필 미리보기 표시
- 채팅방 말풍선 안에서는 프로필 아이콘을 표시하지 않음

지역 목록:

```txt
서울특별시, 부산광역시, 대구광역시, 인천광역시, 광주광역시, 대전광역시, 울산광역시, 세종특별자치시,
경기도, 강원특별자치도, 충청북도, 충청남도, 전북특별자치도, 전라남도, 경상북도, 경상남도, 제주특별자치도
```

### 프로필 사진

- 설정 화면에서 이미지 업로드
- 1:1 정사각형 크롭 모달 제공
- 확대/위치 조절 후 업로드
- R2 저장
- 프로필 사진 삭제/기본 이미지 되돌리기
- 토크/사람/채팅 목록/프로필 모달에 표시
- 채팅방 목록은 상대방 `peer_avatar_url`을 사용해 상대 프로필 이미지를 표시

### 토크

- 한줄 토크 작성
- 분위기 선택 없이 내용만 입력
- 목록에서 분위기/태그 표시 숨김
- 내 글 강조 표시
- 내 글 삭제
- 토크 글에서 바로 쪽지 시작
- 대화 연결은 닉네임이 아니라 작성자 `profile_id` 기준
- 토크 작성 시 하루 1회 100P 보상 지급
- API 실패 시 목업 글을 만들지 않고 실패 안내만 표시

### 사람

- 최근 접속자 목록
- 내 프로필 제외
- 차단 관계 사용자 제외
- 상대방 프로필 사진 표시
- 상대방에게 쪽지 보내기
- 쪽지 시작 비용은 100P
- 포인트 부족 시 쪽지 시작을 막고 안내 표시

### 포인트

- D1 기반 포인트 잔액 저장
- 설정 탭에서 내 포인트 표시
- 출석체크: 하루 1회 100P 지급
- 광고보기 보상: 하루 1회 100P 지급
- 토크 작성 보상: 하루 1회 100P 지급
- 쪽지/1:1 대화 시작 시 100P 차감
- 이미 존재하고 내가 나가지 않은 1:1 방을 단순히 다시 여는 경우는 중복 차감하지 않음
- 포인트 충전 메뉴와 상품 UI 제공
- 실제 결제 PG 및 광고 SDK는 아직 미연동

포인트 충전 기준:

```txt
기본 단가: 1,000P = ₩1,200

1,000P  / ₩1,200  / 기본 충전
5,300P  / ₩6,000  / 300P 보너스
10,800P / ₩12,000 / 800P 보너스
33,000P / ₩36,000 / 3,000P 보너스
57,000P / ₩60,000 / 7,000P 보너스
```

### 채팅

- D1 기반 채팅방 목록
- `profile_id` 조합으로 직접대화방 재사용
- 내 기준 상대방 이름으로 채팅방 제목 표시
- 채팅방 목록 5초 폴링
- 전역 새 메시지 알림은 하단 채팅 탭 점으로 표시
- 방별 안 읽은 메시지 수 표시
- 목록 안의 새 메시지 배지
- 텍스트/이미지 메시지 전송
- 이미지 메시지 `profile_id` 검사 강화
- 내 메시지/상대 메시지 말풍선 분리
- 말풍선 안에는 프로필 아이콘을 표시하지 않음
- 채팅방 화면은 마이룸 기반 게임형 화면으로 크게 표시
- 메시지는 캐릭터 위 말풍선으로 표시
- 대화 기록은 채팅방에서 접어서 확인 가능

### 마이룸

- 설정 탭에서 마이룸 꾸미기 진입
- 마이룸 벽지 선택
- 마이룸 바닥 선택
- 기본 가구/소품 배치 표시
- 가구 카탈로그에서 가구 추가
- 선택한 가구 삭제
- 선택한 가구 복제
- 같은 가구 여러 개 배치
- 가구 드래그 위치 이동
- 선택한 가구 앞/뒤 깊이 조절
- 선택한 가구 회전 조절
- 방 데이터는 `my_rooms` 테이블에 저장
- 1:1 대화를 새로 신청한 사람이 해당 채팅방의 기본 마이룸 주인이 됨
- 채팅방에서는 `room_owner_profile_id` 기준으로 마이룸을 불러옴
- 가구/벽지/액자 에셋 확장을 위해 `asset_id`, `x`, `y`, `z_index`, `rotation` 구조 사용

### 채팅방 나가기

- 방 전체 삭제가 아니라 내 목록에서만 숨김
- 상대방에게는 `닉네임님이 나갔습니다.` 시스템 메시지 표시
- 상대방 채팅 목록 마지막 메시지도 나감 문구로 갱신
- 나간 사용자가 다시 대화를 시작하면 이전 메시지와 이전 나감 시스템 메시지는 보이지 않음
- 양쪽 모두 나간 뒤 다시 대화가 시작되면 목록 요약도 `아직 메시지가 없어요.`로 초기화

### 차단/신고

- 채팅방에서 상대방 신고
- 채팅방에서 상대방 차단
- 차단된 사용자와 새 직접 채팅방 생성 제한
- 차단 관계 사용자는 최근 접속자 목록에서 제외
- 설정 화면에서 차단 목록 조회/해제
- 신고 관리 API와 화면은 운영자 전용

### Android 앱 리소스

- 앱 이름: 플러팅
- Android 패키지명: `com.flirting.app`
- 앱 아이콘 원본: `resources/icon.png`
- 앱 스플래시 원본: `resources/splash.png`
- Android 기본 스플래시 이후 웹앱 내부 풀스크린 스플래시 표시

## 프로젝트 구조

```txt
chat/
 ├─ .github/
 │  └─ workflows/
 │     ├─ android-debug-apk.yml
 │     └─ android-release-aab.yml
 ├─ apps/
 │  └─ web/
 │     ├─ src/
 │     │  ├─ features/
 │     │  │  ├─ auth/
 │     │  │  └─ home/
 │     │  └─ shared/
 │     └─ package.json
 ├─ functions/
 │  └─ api/
 ├─ resources/
 │  ├─ icon.png
 │  └─ splash.png
 ├─ docs/
 ├─ capacitor.config.ts
 ├─ package.json
 └─ pnpm-workspace.yaml
```

## 주요 문서

```txt
docs/03-deployment.md
docs/04-auth-and-permissions-plan.md
docs/05-android-capacitor.md
docs/06-mobile-only-android-build.md
docs/07-play-store-release-checklist.md
docs/08-play-store-listing-draft.md
docs/09-release-aab-and-keystore.md
docs/10-safety-and-operation-policy.md
docs/11-my-room-game-chat-plan.md
docs/current-implementation-status.md
```

현재 구현 상태와 주의사항은 `docs/current-implementation-status.md`를 기준으로 확인합니다.
실제 인증/권한 전환 계획은 `docs/04-auth-and-permissions-plan.md`를 기준으로 확인합니다.
Android 패키징 절차는 `docs/05-android-capacitor.md`를 기준으로 확인합니다.
모바일만으로 APK를 만드는 방법은 `docs/06-mobile-only-android-build.md`를 기준으로 확인합니다.
Google Play 정식 출시 전 차단 조건은 `docs/07-play-store-release-checklist.md`를 기준으로 확인합니다.
Play Store 등록 문구 초안은 `docs/08-play-store-listing-draft.md`를 기준으로 확인합니다.
release AAB 서명 키 준비와 GitHub Secrets 등록 절차는 `docs/09-release-aab-and-keystore.md`를 기준으로 확인합니다.
안전/운영 정책과 금지 콘텐츠, 신고/차단 처리 기준은 `docs/10-safety-and-operation-policy.md`를 기준으로 확인합니다.
마이룸 게임형 채팅 구조와 확장 계획은 `docs/11-my-room-game-chat-plan.md`를 기준으로 확인합니다.

## 로컬 실행

```bash
pnpm install
pnpm dev
```

## 빌드

```bash
pnpm build
```

빌드 결과물은 아래 경로에 생성됩니다.

```txt
apps/web/dist
```

## Android 패키징

PC가 있다면 아래 명령을 사용합니다.

```bash
pnpm install
pnpm build
npx cap add android
npx @capacitor/assets generate --android --iconBackgroundColor '#ff5b8f' --splashBackgroundColor '#ff5b8f'
npx cap sync android
npx cap open android
```

모바일만 있다면 GitHub Actions에서 `Android Debug APK` 워크플로우를 실행하고 `flirting-debug-apk` artifact를 다운로드합니다.

## Cloudflare Pages 배포 설정

```txt
Root directory: /
Build command: pnpm install --frozen-lockfile=false && pnpm build
Build output directory: apps/web/dist
Node.js version: 22
```

## Cloudflare 바인딩

```txt
D1 binding: DB
R2 binding: IMAGES
```

## Cloudflare 환경변수

```txt
ADMIN_PROFILE_IDS=운영자_profile_id
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
GET/POST        /api/my-room
GET/POST/DELETE /api/profile-image
POST            /api/profile-sync
POST            /api/chat-room-leave
GET/POST/DELETE /api/user-blocks
GET/POST/PATCH  /api/reports
GET             /api/admin/me
GET             /api/admin/user-review
```

## 현재 화면 구조

- 현재 앱 화면은 `HomeScreenNext.tsx` 기준입니다.
- 구버전 `HomeScreen.tsx`는 빌드 호환을 위해 `HomeScreenNext`를 위임합니다.

## 현재 주의사항

- 가입은 아직 실제 인증이 아니라 localStorage 기반입니다.
- 같은 기기 1계정 제한은 브라우저 데이터 삭제나 다른 브라우저 사용 시 우회될 수 있습니다.
- 운영자 권한은 현재 `ADMIN_PROFILE_IDS` 기반이므로 실제 운영 전 로그인 기반 권한 검사가 필요합니다.
- 실시간 기능은 WebSocket이 아니라 폴링 기반입니다.
- 마이룸 캐릭터 이동은 현재 내 화면에서만 즉시 반영되며 상대방 실시간 위치 동기화는 아직 없습니다.
- 포인트 충전 상품 UI는 있으나 실제 결제 PG는 아직 연결되지 않았습니다.
- 광고보기 보상 API/UI는 있으나 실제 광고 SDK는 아직 연결되지 않았습니다.
- 개발 중 만들어진 오래된 채팅방은 participant 정보가 없어 제목이 보정 표시될 수 있습니다.
- 오래된 메시지는 `sender_profile_id`가 비어 있을 수 있어 닉네임 기준으로 보정 표시됩니다.
- Play Store 업로드 후 Android 패키지명은 변경하기 어렵습니다.

## 다음 작업 후보

- GitHub Actions에서 Cloudflare Pages 배포 빌드 로그 확인
- GitHub Actions에서 Android Debug APK 워크플로우 실행 후 빌드 로그 확인
- Android 실기기에서 키보드/입력창/이미지 업로드 테스트
- 실제 가구/벽지/액자 에셋 연결
- 마이룸 가구 보유/구매 상태 분리
- 마이룸 캐릭터 위치 실시간 동기화 검토
- 포인트 충전 PG 연동
- 보상형 광고 SDK 연동
- release AAB 서명 키 생성 및 GitHub Secrets 등록
- Play Store 등록 정보 작성
- 실제 인증 체계 도입
