# Chat

모바일 웹 우선의 1:1 채팅 앱 프로젝트입니다. 현재는 React + Vite 프론트엔드와 Cloudflare Pages Functions, D1, R2를 기반으로 구현하고 있습니다.

## 목표

- 모바일 웹앱을 먼저 완성합니다.
- Cloudflare Pages로 배포합니다.
- 이후 Capacitor를 사용해 Android 앱으로 패키징할 수 있도록 구조를 유지합니다.
- 유지보수와 확장이 쉽도록 기능을 작은 모듈로 분리합니다.

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
- 토크/사람/채팅 화면의 프로필 아이콘에서 프로필 미리보기 표시

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
- 토크/사람/상단/채팅 프로필 아이콘에 표시

### 토크

- 한줄 토크 작성
- 분위기 선택 없이 내용만 입력
- 목록에서 분위기/태그 표시 숨김
- 내 글 강조 표시
- 내 글 삭제
- 토크 글에서 바로 대화 시작
- 대화 연결은 닉네임이 아니라 작성자 `profile_id` 기준

### 사람

- 최근 접속자 목록
- 내 프로필 제외
- 차단 관계 사용자 제외
- 상대방 프로필 사진 표시
- 상대방에게 채팅 걸기

### 채팅

- D1 기반 채팅방 목록
- `profile_id` 조합으로 직접대화방 재사용
- 내 기준 상대방 이름으로 채팅방 제목 표시
- 채팅방 목록 5초 폴링
- 전역 새 메시지 알림
- 채팅 탭 배지
- 방별 안 읽은 메시지 수 표시
- 목록 안의 새 메시지 배지
- 텍스트/이미지 메시지 전송
- 이미지 메시지 `profile_id` 검사 강화
- 내 메시지/상대 메시지 말풍선 분리

### 채팅방 나가기

- 방 전체 삭제가 아니라 내 목록에서만 숨김
- 상대방에게는 `닉네임님이 나갔습니다.` 시스템 메시지 표시
- 상대방 채팅 목록 마지막 메시지도 나감 문구로 갱신

### 차단/신고

- 채팅방에서 상대방 신고
- 채팅방에서 상대방 차단
- 차단된 사용자와 새 직접 채팅방 생성 제한
- 차단 관계 사용자는 최근 접속자 목록에서 제외
- 설정 화면에서 차단 목록 조회/해제
- 신고 관리 API와 화면은 운영자 전용

## 프로젝트 구조

```txt
chat/
 ├─ .github/
 │  └─ workflows/
 │     └─ android-debug-apk.yml
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
docs/current-implementation-status.md
```

현재 구현 상태와 주의사항은 `docs/current-implementation-status.md`를 기준으로 확인합니다.
실제 인증/권한 전환 계획은 `docs/04-auth-and-permissions-plan.md`를 기준으로 확인합니다.
Android 패키징 절차는 `docs/05-android-capacitor.md`를 기준으로 확인합니다.
모바일만으로 APK를 만드는 방법은 `docs/06-mobile-only-android-build.md`를 기준으로 확인합니다.

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
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
pnpm build
npx cap add android
npx cap sync android
npx cap open android
```

모바일만 있다면 GitHub Actions에서 `Android Debug APK` 워크플로우를 실행하고 `chitchat-debug-apk` artifact를 다운로드합니다.

## Cloudflare Pages 배포 설정

```txt
Root directory: /
Build command: pnpm install --frozen-lockfile=false && pnpm build
Build output directory: apps/web/dist
Node.js version: 20
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

## 현재 주의사항

- 가입은 아직 실제 인증이 아니라 localStorage 기반입니다.
- 같은 기기 1계정 제한은 브라우저 데이터 삭제나 다른 브라우저 사용 시 우회될 수 있습니다.
- 운영자 권한은 현재 `ADMIN_PROFILE_IDS` 기반이므로 실제 운영 전 로그인 기반 권한 검사가 필요합니다.
- 실시간 기능은 WebSocket이 아니라 폴링 기반입니다.
- 개발 중 만들어진 오래된 채팅방은 participant 정보가 없어 제목이 보정 표시될 수 있습니다.
- 오래된 메시지는 `sender_profile_id`가 비어 있을 수 있어 닉네임 기준으로 보정 표시됩니다.

## 다음 작업 후보

- GitHub Actions에서 Android Debug APK 워크플로우 실행 후 빌드 로그 확인
- Android 실기기에서 키보드/입력창/이미지 업로드 테스트
- 앱 아이콘/스플래시 추가
- release AAB 자동 빌드 추가
- 실제 인증 체계 도입
