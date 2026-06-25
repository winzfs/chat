# 보안 및 안정화 작업 현황

마지막 갱신: 2026-06-25

## 배포 전 필수 설정

Cloudflare Pages의 Production과 Preview 환경에 32자 이상의 `AUTH_SECRET`을 등록해야 합니다. 설정이 없으면 비공개 API와 앱 진입이 의도적으로 차단됩니다.

관리자 기능을 사용할 계정의 서명 세션 `profile_id`는 `ADMIN_PROFILE_IDS`에 쉼표로 구분해 등록합니다.

D1 Schema Inspect와 D1 Migrations Apply workflow를 사용하려면 GitHub repository secrets에 `CLOUDFLARE_ACCOUNT_ID`와 `CLOUDFLARE_API_TOKEN`을 등록해야 합니다.

## 반영 완료

- HMAC 서명 세션 발급과 Bearer 인증
- 관리자 정지 해제 기능 추가
- 관리자 콘텐츠 삭제 기능 추가
- 포인트·채팅 상태·차단·신고·1:1 요청 잠금 테이블의 버전형 D1 migration 추가
- D1 migration Preview/Production 적용 runbook 추가
- D1 migration apply workflow 추가
- D1 migration apply workflow schema artifact가 기존 핵심 테이블 table_info까지 캡처하도록 보강
- 탈퇴 계정의 기존 서명 세션을 차단하는 `revoked_profiles` migration 추가
- 신고 관리자 메모와 사용자 정지를 위한 `0006_moderation.sql` migration 추가
- 자동 Web Verify, Web E2E, Android debug APK, Pages Auth/API Smoke, D1 Schema Inspect workflow의 수동 재실행·timeout·artifact 실패 조건 보강
- 회원 탈퇴 실패/성공 E2E와 DELETE 인증 요청 검증 추가
- 프로필 저장 실패, 프로필 사진 업로드 실패, 마이룸 로드 실패 저장 차단, 포인트 보상 실패 흐름의 Web E2E 확장
- `pnpm verify`에 lockfile, package manager, Node, workflow install, exact dependency pin 계약 검사 추가

## 남은 작업

- Cloudflare Production과 Preview 환경변수 적용 후 Pages auth smoke workflow를 실제 배포 URL로 실행하고 실패 로그 수정
- Pages API smoke workflow를 실제 배포 URL로 실행하고 채팅방 목록 권한·CORS 실패 로그 수정
- 신규 D1 migration을 Preview와 Production 데이터베이스에 적용하고 schema artifact 확인
- D1 Schema Inspect workflow를 Preview와 Production 데이터베이스 대상으로 실행하고 artifact 확인
- 운영 D1의 `sqlite_master`와 `pragma table_info(...)` 결과 확인 후 기존 핵심 테이블의 추가 migration 작성
- 신규 마이그레이션 적용 후 API 런타임 DDL 제거
- 회원 탈퇴 Preview 회귀 확인
- 관리자 신고 처리 Preview 회귀 확인
- Android debug APK workflow 실행 결과와 artifact 확인 및 실기기 회귀 테스트

## 현재 제한

서명 세션은 기존 localStorage ID보다 안전하지만 정식 계정 로그인은 아닙니다.
