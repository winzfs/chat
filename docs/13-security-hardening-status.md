# 보안 및 안정화 작업 현황

마지막 갱신: 2026-06-25

## 배포 전 필수 설정

Cloudflare Pages의 Production과 Preview 환경에 32자 이상의 `AUTH_SECRET`을 등록해야 합니다. 설정이 없으면 비공개 API와 앱 진입이 의도적으로 차단됩니다.

관리자 기능을 사용할 계정의 서명 세션 `profile_id`는 `ADMIN_PROFILE_IDS`에 쉼표로 구분해 등록합니다.

D1 Schema Inspect workflow를 사용하려면 GitHub repository secrets에 `CLOUDFLARE_ACCOUNT_ID`와 `CLOUDFLARE_API_TOKEN`을 등록해야 합니다.

## 반영 완료

- HMAC 서명 세션 발급과 Bearer 인증
- 관리자 정지 해제 기능 추가
- 관리자 콘텐츠 삭제 기능 추가

## 남은 작업

- Cloudflare Production과 Preview 환경변수 적용 후 Pages auth smoke workflow를 실제 배포 URL로 실행하고 실패 로그 수정
- Pages API smoke workflow를 실제 배포 URL로 실행하고 채팅방 목록 권한·CORS 실패 로그 수정
- 신규 D1 migration을 Preview와 Production 데이터베이스에 적용
- D1 Schema Inspect workflow를 Preview와 Production 데이터베이스 대상으로 실행하고 artifact 확인
- 운영 D1의 sqlite_master 결과 확인 후 추가 migration 작성
- 신규 마이그레이션 적용 후 API 런타임 DDL 제거
- 회원 탈퇴 Preview 회귀 확인
- 관리자 신고 처리 Preview 회귀 확인
- 프로필 사진 실패, 마이룸 저장 차단, 포인트 보상 실패 흐름의 Web E2E 확장
- Android debug APK workflow 실행 결과와 artifact 확인 및 실기기 회귀 테스트

## 현재 제한

서명 세션은 기존 localStorage ID보다 안전하지만 정식 계정 로그인은 아닙니다.