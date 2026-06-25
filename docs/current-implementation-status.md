# 현재 구현 상태

마지막 갱신: 2026-06-25

## 개요

플러팅은 모바일 웹 우선의 20세 이상 1:1 채팅 앱입니다.

- 프론트엔드: React + Vite
- API: Cloudflare Pages Functions
- 데이터베이스: Cloudflare D1 (`DB`)
- 이미지 저장소: Cloudflare R2 (`IMAGES`)
- Android: Capacitor
- 현재 홈 화면 기준: `apps/web/src/features/home/HomeScreenNext.tsx`

## 인증과 계정

- HMAC 서명 Bearer 세션 사용
- 세션 만료·변조 검증
- 네트워크 장애 시 기존 세션 보존
- 탈퇴한 `profile_id`는 `revoked_profiles`로 즉시 차단
- 정지 사용자는 비공개 API에서 403 차단
- 회원 탈퇴 UI와 데이터 삭제 API 구현
- 탈퇴 성공 후 `chitchat.*` localStorage 정리와 가입 화면 복귀

현재 계정은 이메일·소셜 로그인 계정이 아닙니다. 앱 데이터 삭제나 기기 변경 후 계정 복구 기능은 없습니다.

## 가입과 프로필

- 닉네임, 성별, 나이, 지역 가입
- 20세 이상 제한
- 프로필 서버 동기화
- 프로필 사진 크롭·R2 업로드·삭제
- 프로필 미리보기
- 서버 저장 성공 후에만 로컬 상태 반영
- 저장·업로드 실패 시 기존 프로필 보존

## 토크와 사람 목록

- 한줄 토크 작성·삭제
- 하루 1회 토크 작성 100P 보상
- 최근 접속자 목록
- 본인과 차단 관계 사용자 제외
- `profile_id` 기준 직접대화 시작
- 같은 이벤트 루프의 연속 클릭 중복 요청 차단

## 포인트

- `user_points` 잔액
- `point_transactions` 거래내역
- `daily_point_claims` 일일 보상 기록
- 출석체크·광고보기 하루 1회 100P
- 직접대화 시작 시 100P 차감
- 채팅방 생성 실패 시 환불 거래 기록
- 실제 PG와 광고 SDK는 아직 연결되지 않음

## 채팅

- D1 기반 직접대화방 재사용
- 채팅방 목록과 읽지 않은 메시지 수
- 텍스트·이미지 메시지
- 메시지 전송 실패 시 입력값 유지
- 채팅방 나가기와 재입장 처리
- 차단 관계의 메시지·이미지 전송 제한
- 채팅 화면에서 마이룸 표시
- 폴링 기반 갱신

## 마이룸

- 벽지·바닥·가구 선택
- 가구 추가·삭제·복제·이동·회전·깊이 조절
- 키보드 선택과 화살표 이동
- `my_rooms` 저장
- 로딩 실패 시 편집과 저장 차단

## 신고·차단·관리자 운영

- 채팅방 신고와 차단
- 설정에서 차단 목록 조회·해제
- 관리자 신고 목록과 대상 사용자 검토
- 신고 상태: 접수, 검토중, 처리완료, 기각
- 관리자 메모, 처리자, 처리 시각
- 1일·7일·30일·무기한 사용자 정지
- 사용자 정지 해제
- 관리자 토크 삭제
- 관리자 채팅 메시지 삭제 처리
- 이미지 메시지 삭제 시 R2 원본 제거
- 신고 작성자 ID는 인증 세션 기준으로 강제

관리자 계정은 Cloudflare 환경변수 `ADMIN_PROFILE_IDS`에 등록합니다.

## 회원 탈퇴 삭제 범위

- 프로필·최근 접속 정보
- 토크
- 마이룸
- 포인트 잔액·내역·일일 보상
- 차단 관계
- 신고와 신고 처리 메타데이터
- 사용자 정지 기록
- 참여 중인 직접대화방과 메시지
- 프로필·채팅 R2 이미지
- 로컬 세션·프로필 상태

## D1 migration

현재 migration:

1. `0001_points.sql`
2. `0002_chat_state.sql`
3. `0003_safety.sql`
4. `0004_request_gates.sql`
5. `0005_revoked_profiles.sql`
6. `0006_moderation.sql`

`0006_moderation.sql`은 `report_moderation`과 `user_suspensions`를 생성하며 재실행 가능합니다.

실제 Preview와 Production 적용 절차는 `docs/14-d1-migration-runbook.md`를 따릅니다.

## 자동 검증

### Web Verify

`pnpm verify` 실행 항목:

- dependency pin 검사
- 클라이언트 안정화 계약
- D1 migration 계약
- TypeScript typecheck
- production build

### Web E2E

현재 15개 Playwright 테스트가 다음 영역을 검증합니다.

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

### 수동 workflow

- Pages Auth Smoke
- Pages API Smoke
- D1 Schema Inspect
- D1 Migrations Apply
- Android Debug APK
- Android Release AAB

## 2026-06-25 전체 점검에서 수정한 문제

- 관리자 신고 처리 성공 문구가 즉시 사라지던 문제
- 신고 카드의 상태·메모가 새 응답과 동기화되지 않던 문제
- 정지 해제 API가 관리자 UI에 연결되지 않았던 문제
- 관리자 이미지 메시지 삭제 후 R2 원본이 남던 문제
- 회원 탈퇴 후 정지·신고 처리 메타데이터가 남던 문제
- `0006_moderation.sql`의 중복 컬럼 오류 가능성
- D1 Apply/Inspect artifact의 `report_moderation` 누락
- 회원 탈퇴 카드를 전역 MutationObserver로 붙이던 구조

## 정식 출시 전 남은 필수 작업

- Preview와 Production에 migration 1~6 적용
- Preview/Production D1 Schema Inspect artifact 확인
- 실제 Pages Auth/API smoke 실행
- 실제 회원 탈퇴 데이터·R2 삭제 확인
- 실제 관리자 정지·정지 해제·콘텐츠 삭제 확인
- Android release AAB 서명·설치 검증
- 개인정보처리방침과 이용약관의 운영자 정보·문의 이메일 확정
- Google Play Data Safety·콘텐츠 등급·스토어 이미지 준비
- 정식 로그인·계정 복구 도입 여부 결정

## 기준 문서

- 보안·운영 상태: `docs/13-security-hardening-status.md`
- D1 migration: `docs/14-d1-migration-runbook.md`
- 프론트엔드 점검: `docs/15-frontend-review.md`
- Web E2E: `docs/16-web-e2e.md`
- 출시 준비 감사: `docs/17-release-readiness-audit.md`
