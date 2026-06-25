# 플러팅

모바일 웹 우선의 20세 이상 1:1 채팅 앱입니다.

- Frontend: React + Vite
- API: Cloudflare Pages Functions
- Database: Cloudflare D1
- Image Storage: Cloudflare R2
- Android: Capacitor
- CI/CD: GitHub Actions

## 현재 구현 상태

### 계정과 프로필

- HMAC 서명 Bearer 세션
- 가입, 프로필 저장·수정
- 20세 이상 가입 제한
- 프로필 사진 크롭·R2 업로드·삭제
- 회원 탈퇴와 D1·R2·localStorage 정리
- 탈퇴 계정의 기존 세션 즉시 차단

현재 계정은 이메일·소셜 로그인 계정이 아닙니다. 앱 데이터 삭제나 기기 변경 후 계정 복구 기능은 아직 없습니다.

### 토크·사람·포인트

- 한줄 토크 작성·삭제
- 최근 접속자 목록
- 차단 관계 사용자 제외
- `profile_id` 기준 직접대화 시작
- 출석·광고·토크 작성 일일 보상
- 직접대화 시작 100P 차감
- 중복 차감 방지와 채팅방 생성 실패 환불

실제 결제 PG와 광고 SDK는 아직 연결되지 않았습니다.

### 채팅과 마이룸

- 1:1 채팅방 재사용
- 텍스트·이미지 메시지
- 읽지 않은 메시지 수
- 채팅방 나가기·재입장
- 메시지 전송 실패 시 입력값 보존
- 마이룸 벽지·바닥·가구 배치
- 마이룸 로딩 실패 시 편집·저장 차단
- 폴링 기반 자동 갱신

### 신고·차단·관리자 운영

- 사용자 신고·차단
- 차단 목록 조회·해제
- 관리자 신고 목록과 대상 사용자 검토
- 신고 상태: 접수, 검토중, 처리완료, 기각
- 관리자 메모, 처리자, 처리 시각
- 1일·7일·30일·무기한 사용자 정지
- 사용자 정지 해제
- 관리자 토크 삭제
- 관리자 채팅 메시지 삭제 처리
- 이미지 메시지 삭제 시 R2 원본 제거

관리자 계정은 Cloudflare 환경변수 `ADMIN_PROFILE_IDS`에 등록합니다.

## 로컬 실행

```bash
pnpm install
pnpm dev
```

필수 런타임:

```txt
Node >= 22
pnpm 9.15.0
```

## 검증

전체 정적 검증:

```bash
pnpm verify
```

`pnpm verify`는 다음을 실행합니다.

- dependency pin 검사
- 클라이언트 안정화 계약
- D1 migration 계약
- TypeScript typecheck
- production build

Playwright E2E:

```bash
pnpm exec playwright install chromium
pnpm e2e
```

현재 15개 테스트 케이스가 가입, 토크, 모달, 직접대화, 메시지 실패, 채팅방 나가기, 회원 탈퇴, 프로필·사진·포인트·마이룸 실패 복구를 검증합니다.

## Cloudflare 운영 설정

필수 환경변수:

```txt
AUTH_SECRET=<32자 이상 비밀값>
ADMIN_PROFILE_IDS=<관리자 profile_id, 쉼표 구분>
```

GitHub Actions에서 D1 workflow를 사용할 때 필요한 repository secrets:

```txt
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

현재 D1 migration:

```txt
migrations/0001_points.sql
migrations/0002_chat_state.sql
migrations/0003_safety.sql
migrations/0004_request_gates.sql
migrations/0005_revoked_profiles.sql
migrations/0006_moderation.sql
```

`0006_moderation.sql`은 재실행 가능한 `report_moderation`과 `user_suspensions` 테이블을 생성합니다.

## GitHub Actions

- Web Verify
- Web E2E
- Pages Auth Smoke
- Pages API Smoke
- D1 Schema Inspect
- D1 Migrations Apply
- Android Debug APK
- Android Release AAB

실제 D1 적용은 데이터베이스를 백업한 뒤 `D1 Migrations Apply` workflow를 사용합니다.

## Android

- 앱 이름: 플러팅
- 패키지명: `com.flirting.app`
- 아이콘 원본: `resources/icon.png`
- 스플래시 원본: `resources/splash.png`

Android 동기화:

```bash
pnpm android:sync
```

Release AAB에는 별도의 keystore와 GitHub Secrets가 필요합니다.

## 주요 문서

- 현재 구현 상태: `docs/current-implementation-status.md`
- 배포: `docs/03-deployment.md`
- 인증·권한 계획: `docs/04-auth-and-permissions-plan.md`
- Android Capacitor: `docs/05-android-capacitor.md`
- Google Play 출시 체크리스트: `docs/07-play-store-release-checklist.md`
- Play Store 등록 문구: `docs/08-play-store-listing-draft.md`
- Release AAB·keystore: `docs/09-release-aab-and-keystore.md`
- 안전·운영 정책: `docs/10-safety-and-operation-policy.md`
- 보안·안정화 현황: `docs/13-security-hardening-status.md`
- D1 migration runbook: `docs/14-d1-migration-runbook.md`
- 프론트엔드 점검 결과: `docs/15-frontend-review.md`
- Web E2E: `docs/16-web-e2e.md`
- 출시 준비 전체 점검: `docs/17-release-readiness-audit.md`

## 정식 출시 전 핵심 차단 항목

- Preview와 Production migration 1~6 적용·검증
- Pages Auth/API Smoke 성공
- 회원 탈퇴와 관리자 제재 실제 환경 회귀
- Android Release AAB 서명·실기기 설치 검증
- 개인정보처리방침·이용약관 실제 운영 정보 반영
- Google Play Data Safety·콘텐츠 등급·스토어 이미지 준비

자세한 기준은 `docs/17-release-readiness-audit.md`를 확인합니다.
