# 출시 준비 전체 코드 점검

마지막 갱신: 2026-06-25

## 점검 결론

현재 코드는 모바일 웹 MVP와 Android 비공개 테스트를 준비할 수 있는 수준입니다. 다만 실제 Production 출시 전에는 Cloudflare 운영 환경 검증, D1 migration 적용, release AAB 실기기 검증, 법적 문서 실정보 반영이 필요합니다.

이번 점검에서는 인증, 권한, 회원 탈퇴, 관리자 운영, D1 migration, R2 이미지 삭제, React 상태 복구, E2E와 GitHub Actions 계약을 확인했습니다.

## 이번 점검에서 수정한 코드 문제

### 관리자 신고 처리

- 처리 성공 문구가 목록 갱신 과정에서 즉시 사라지던 문제 수정
- 새 목록 응답 후 신고 카드의 상태와 관리자 메모가 이전 값으로 남던 문제 수정
- 동일 신고 처리의 중복 실행 방지
- 정지 해제 API가 화면에 연결되지 않았던 문제 수정
- 정지 해제 중 다른 조작 방지

### 관리자 콘텐츠 삭제

- 이미지 메시지 삭제 시 DB 참조만 지우고 R2 원본 객체가 남던 문제 수정
- R2 삭제가 실패하면 DB 삭제 처리 전에 오류 반환
- 다른 콘텐츠 삭제 중 전체 삭제 버튼 비활성화

### 회원 탈퇴

- `user_suspensions` 정지 기록 삭제 누락 수정
- `report_moderation` 운영 메타데이터 삭제 누락 수정
- 설정 화면을 전역 MutationObserver로 감지하던 구조 제거
- `HomeScreenNext` 설정 탭에서 탈퇴 카드를 직접 렌더링하도록 변경

### D1 migration

- `0006_moderation.sql`의 `ALTER TABLE ADD COLUMN` 재실행 오류 가능성 제거
- 관리자 메모를 별도 `report_moderation` 테이블로 분리
- 정지 기록을 `user_suspensions`로 유지
- Reports API를 `reports + report_moderation` 조인 구조로 변경
- D1 Apply와 Schema Inspect에 `report_moderation` 필수 검사 추가
- migration 계약 검사가 신규 migration 테이블 전체를 확인하도록 강화

## 확인된 보호 장치

- HMAC 서명 Bearer 세션
- 탈퇴 계정 세션 401 차단
- 정지 사용자 비공개 API 403 차단
- 신고 작성자 ID를 인증 세션 기준으로 강제
- 관리자 API의 관리자 프로필 검증
- 직접대화 profile_id 대조
- 직접대화 중복 차감 방지와 실패 환불
- 이미지 파일 시그니처 검사
- 차단 관계 메시지·이미지 전송 제한
- 회원 탈퇴 시 D1·R2·localStorage 정리
- dependency와 runtime 버전 고정
- Web Verify와 15개 Playwright E2E

## 자동 검증 범위

### `pnpm verify`

- dependency pin
- 클라이언트 안정화 계약
- D1 migration 계약
- TypeScript typecheck
- production build

### Web E2E 15개

- 가입 성공·실패
- 토크 실패 초안 보존
- 모달 포커스 복원
- 직접대화 중복 요청
- 메시지 실패 입력값 보존
- 채팅방 나가기 취소·실패·성공
- 회원 탈퇴 실패·성공
- 프로필 저장 실패
- 프로필 사진 업로드 실패
- 포인트 보상 실패
- 마이룸 로드 실패 저장 차단

## 출시 전 차단 항목

### 우선순위 P0

- Preview D1에 migration 1~6 적용
- Production D1에 migration 1~6 적용
- D1 Schema Inspect artifact에서 모든 필수 테이블 확인
- Production과 Preview `AUTH_SECRET` 설정
- 관리자 계정의 `ADMIN_PROFILE_IDS` 설정
- Pages Auth Smoke 실행
- Pages API Smoke 실행
- 회원 탈퇴 실제 데이터와 R2 삭제 확인
- 관리자 정지·해제·콘텐츠 삭제 실제 확인

### 우선순위 P1

- Android release keystore 생성과 GitHub Secrets 등록
- Android Release AAB workflow 실제 실행
- release AAB 실기기 설치·업데이트 확인
- 개인정보처리방침 운영자명·문의 이메일·책임자 정보 확정
- 이용약관 유료 기능·환불 조항 확정
- Play Console Data Safety 작성
- 콘텐츠 등급과 20세 이상 표시 일치 확인

### 우선순위 P2

- 관리자 운영 전용 E2E 추가
- 오류 수집과 장애 알림 도입
- D1 백업·복원 훈련
- 계정 복구 가능한 정식 로그인 도입 여부 결정
- 이용자가 증가할 경우 폴링을 실시간 구조로 전환 검토

## 운영상 남은 위험

- 현재 계정은 기기 localStorage와 서명 세션 기반이라 기기 변경 복구가 불가능합니다.
- 실제 결제 PG와 광고 SDK가 연결되지 않았습니다.
- 운영 DB의 기존 핵심 테이블은 아직 버전형 migration으로 완전히 이전되지 않았습니다.
- 일부 API에는 legacy DB 호환을 위한 런타임 DDL이 남아 있습니다.
- R2와 D1을 하나의 원자적 트랜잭션으로 묶을 수 없어 이미지 삭제와 DB 변경 사이 장애 대응 절차가 필요합니다.
- 현재 채팅 갱신은 폴링 방식입니다.

## 검증 상태

이번 점검으로 새 커밋이 추가됐습니다. 과거 GitHub Actions 통과 결과는 현재 HEAD의 통과를 보장하지 않습니다.

다음 결과를 확인한 뒤 출시 후보로 표시합니다.

- Web Verify 성공
- Web E2E 성공
- D1 Migrations Apply 성공
- D1 Schema Inspect 성공
- Pages Auth Smoke 성공
- Pages API Smoke 성공
- Android Release AAB 성공
