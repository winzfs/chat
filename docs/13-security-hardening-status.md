# 보안 및 안정화 작업 현황

마지막 갱신: 2026-06-23

## 배포 전 필수 설정

Cloudflare Pages의 Production과 Preview 환경에 32자 이상의 `AUTH_SECRET`을 등록해야 합니다. 설정이 없으면 비공개 API와 앱 진입이 의도적으로 차단됩니다.

관리자 기능을 사용할 계정의 서명 세션 `profile_id`는 `ADMIN_PROFILE_IDS`에 쉼표로 구분해 등록합니다.

## 반영 완료

- HMAC 서명 세션 발급과 Bearer 인증
- 앱 시작 시 저장된 세션 서버 검증 및 무효 세션 자동 재발급
- 비공개 API 인증 강제와 인증 사용자 ID 전달
- 채팅방 목록 요청자 ID 검증 및 최종 참가자/소유자 필터
- 채팅 메시지 참가자 검증
- 최신 채팅 100개 조회 수정
- 차단 관계의 텍스트·이미지 전송 차단
- 채팅 나가기 요청자 검증
- 프로필·최근 사용자·토크·포인트·마이룸 저장 요청자 검증
- 관리자 본인 확인 API의 검증된 세션 ID 사용
- 신고 작성자 ID 검증
- 프로필 동기화의 닉네임 기반 대량 수정 제거
- 프로필·채팅 이미지 JPEG/PNG/WebP 파일 시그니처 검사
- Android API 및 이미지 상대경로 보정
- Capacitor localhost origin만 허용하는 CORS와 Authorization preflight 허용
- 인증 API 응답 캐시 금지
- 웹 CSP, 클릭재킹, MIME 스니핑, 권한 정책 헤더
- 공용 `anonymous-profile` ID 충돌 제거
- 서버 프로필을 기준으로 토크 작성자 정보 저장
- 토크 삭제 시 인증된 작성자 ID 일치 강제
- `pnpm --filter @chat/web typecheck` 명령 추가

## 남은 작업

- Cloudflare 환경변수 적용 후 실제 배포 API 확인
- GitHub Actions 자동 웹 빌드 추가
- lockfile 생성과 `latest` 의존성 버전 고정
- 출석·광고 포인트 지급과 1:1 채팅방 생성의 완전한 원자성 보강
- D1 스키마 변경을 요청 시점 `ALTER TABLE`에서 버전형 migration으로 이전
- 프로필 사진 교체 시 이전 R2 객체 자동 정리
- 토크 카드의 내 글 판별을 닉네임이 아닌 `profile_id`로 변경
- 네트워크 장애와 실제 빈 목록을 구분하는 공통 클라이언트 오류 처리
- 자동 테스트와 Android 실기기 회귀 테스트

## 현재 제한

서명 세션은 기존 localStorage ID보다 안전하지만 정식 계정 로그인은 아닙니다. 앱 삭제나 저장소 초기화 후 기존 계정을 복구하는 기능은 별도의 계정 시스템 도입 전까지 제공되지 않습니다.
