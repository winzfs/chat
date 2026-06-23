# 보안 및 안정화 작업 현황

마지막 갱신: 2026-06-23

## 배포 전 필수 설정

Cloudflare Pages의 Production과 Preview 환경에 32자 이상의 `AUTH_SECRET`을 등록해야 합니다. 설정이 없으면 비공개 API와 앱 진입이 의도적으로 차단됩니다.

관리자 기능을 사용할 계정의 서명 세션 `profile_id`는 `ADMIN_PROFILE_IDS`에 쉼표로 구분해 등록합니다.

## 반영 완료

- HMAC 서명 세션 발급과 Bearer 인증
- 서명 세션 30일 만료와 미래 발급 시각 거부
- 앱 시작 시 저장된 세션 서버 검증 및 무효 세션 자동 재발급
- 네트워크 장애 시 기존 세션 보존
- Bearer 토큰을 앱 origin과 운영 API origin에만 첨부
- 비공개 API 인증 강제와 인증 사용자 ID 전달
- 채팅방 목록 요청자 ID 검증 및 최종 참가자/소유자 필터
- 채팅 메시지 참가자 검증과 최신 100개 조회
- 차단 관계의 텍스트·이미지 전송 차단
- 채팅 나가기 요청자 검증
- 1:1 채팅 중복 요청 잠금
- 1:1 채팅 생성·재입장 실패 시 중복 없는 100P 복구
- 실제 방 생성·재입장이 완료된 경우 잘못 환불하지 않는 최종 상태 검사
- 1:1 채팅방 생성 실패 복구 응답에 안정적인 오류 코드와 환불 후 잔액 표시
- 출석·광고 포인트 지급의 D1 batch 처리
- 프로필·최근 사용자·토크·포인트·마이룸 저장 요청자 검증
- 관리자 본인 확인 API의 검증된 세션 ID 사용
- 신고 작성자 ID 검증
- 프로필 동기화의 닉네임 기반 대량 수정 제거
- 프로필 동기화 서버 입력 검증과 업로드 이미지 소유권 검사
- 프로필·채팅 이미지 JPEG/PNG/WebP 파일 시그니처 검사
- 프로필 동기화 성공 후 이전 R2 프로필 이미지 정리
- 프로필 사진 저장 실패 시 임시 업로드 파일 정리
- Android API·프로필·토크·채팅 이미지 경로 보정
- Capacitor localhost origin만 허용하는 CORS와 Authorization preflight 허용
- 인증 API 응답 캐시 금지
- 웹 CSP, 클릭재킹, MIME 스니핑, 권한 정책 헤더
- 공용 `anonymous-profile` ID 충돌 제거
- 서버 프로필을 기준으로 토크 작성자 정보 저장
- 토크 내 글 판별과 삭제 권한을 `profile_id` 기준으로 통일
- 채팅방·메시지·토크·최근 사용자·프로필 API 오류를 빈 데이터와 구분
- 서버 저장 성공 후에만 프로필 localStorage와 화면 상태 변경
- GitHub Actions 웹 `typecheck`·빌드 워크플로 추가
- 웹 `typecheck`와 루트 `verify` 명령 추가
- `.dev.vars.example` 제공 및 실제 `.dev.vars` ignore
- 포인트·채팅 상태·차단·신고·1:1 요청 잠금 테이블의 버전형 D1 migration 추가
- D1 migration Preview/Production 적용 runbook 추가
- `pnpm-lock.yaml` 생성
- 루트와 웹 앱의 `latest` 직접 의존성을 고정 버전으로 변경
- 웹 CI를 `pnpm install --frozen-lockfile --ignore-scripts` 기반으로 변경
- Android debug APK 워크플로를 `pnpm install --frozen-lockfile` 기반으로 변경
- 클라이언트 API 오류 공통 파서에 HTTP status, error code, 환불 후 잔액 표시 추가
- 토크·최근 접속자 1:1 채팅 실패 시 서버 오류와 복구된 잔액 표시
- `pnpm verify`에 클라이언트 안정화 계약 검사를 추가해 API 오류 표시, 1:1 채팅 profile_id 검증, Android 뒤로가기 처리, CI lockfile 조건을 자동 확인
- `pnpm verify`에 D1 migration 계약 검사를 추가해 migration 번호·비파괴 SQL·runbook/status 문서 동기화를 자동 확인
- `pnpm verify`의 클라이언트 안정화 계약에 1:1 채팅 실패 복구 코드·환불 거래 기록·최종 방 상태 확인을 추가

## 남은 작업

- Cloudflare Production과 Preview 환경변수 적용 후 실제 배포 API 확인
- GitHub Actions push 실행 결과 확인과 실패 로그 수정
- 신규 D1 migration을 Preview와 Production 데이터베이스에 적용
- 운영 D1의 `sqlite_master`와 `pragma table_info(...)` 결과 확인 후 기존 핵심 테이블의 추가 migration 작성
- 신규 마이그레이션 적용 후 API 런타임 DDL 제거
- 실제 API 통합 테스트 추가
- Android APK 생성 결과와 실기기 회귀 테스트

## 현재 제한

서명 세션은 기존 localStorage ID보다 안전하지만 정식 계정 로그인은 아닙니다. 앱 삭제나 저장소 초기화 후 기존 계정을 복구하는 기능은 별도의 계정 시스템 도입 전까지 제공되지 않습니다.
