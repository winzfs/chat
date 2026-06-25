# D1 마이그레이션 적용 절차

마지막 갱신: 2026-06-25

## 목적

API 요청마다 실행하던 `create table if not exists`와 호환용 스키마 준비 작업을 단계적으로 배포 마이그레이션으로 옮깁니다. 현재 migration은 기존 데이터를 삭제하거나 테이블을 재생성하지 않는 비파괴 SQL만 포함합니다.

## 현재 migration

1. `migrations/0001_points.sql`
   - 포인트 잔액
   - 포인트 거래내역
   - 일일 보상 수령 기록
2. `migrations/0002_chat_state.sql`
   - 채팅 읽음 시각
   - 채팅방 나가기·숨김 상태
3. `migrations/0003_safety.sql`
   - 사용자 차단
   - 신고 기록
4. `migrations/0004_request_gates.sql`
   - 중복 1:1 채팅 요청 잠금
5. `migrations/0005_revoked_profiles.sql`
   - 회원 탈퇴한 프로필 ID 폐기 기록
   - 기존 HMAC 서명 세션의 즉시 재사용 차단
6. `migrations/0006_moderation.sql`
   - 신고 관리자 메모·처리자·처리 시각을 저장하는 `report_moderation`
   - 사용자 기간·무기한 정지를 저장하는 `user_suspensions`
   - 기존 `reports` 테이블을 `ALTER TABLE`하지 않아 재실행 가능

## 자동 검증

`pnpm verify`는 `scripts/check-d1-migrations.mjs`를 실행해 아래 계약을 확인합니다.

- migration 파일명이 `0000_snake_case.sql` 형식인지
- migration 번호가 중복되지 않는지
- 현재 배포 대상 migration 6개가 모두 존재하는지
- checked migration에 `drop table`, `delete from`, `truncate`, `alter table ... drop` 같은 파괴적 SQL이 없는지
- D1 migration apply workflow가 수동 실행, 명시적 적용 확인, 대상 이름 검증, 고정 Wrangler 버전, 적용 후 schema artifact 검사를 유지하는지
- D1 migration apply workflow가 신규 migration 테이블과 기존 핵심 테이블의 `pragma table_info(...)`를 모두 artifact에 포함하는지
- 이 runbook과 `docs/13-security-hardening-status.md`가 D1 적용 상태를 계속 언급하는지

이 검사는 실제 Preview/Production 데이터베이스에 SQL을 적용하지 않습니다. 배포 전에는 아래 절차대로 Cloudflare D1에 직접 적용하고 회귀 확인을 해야 합니다.

## 운영 스키마 확인 자동화

수동 실행 workflow인 `.github/workflows/d1-schema-inspect.yml`은 실제 D1 데이터베이스에서 아래 결과를 수집해 artifact로 남깁니다.

- `sqlite_master`의 table/index 목록
- migration 대상 테이블의 `pragma table_info(...)`
- 기존 핵심 테이블의 `pragma table_info(...)`

실행 전 GitHub repository secrets에 `CLOUDFLARE_ACCOUNT_ID`와 `CLOUDFLARE_API_TOKEN`을 등록합니다. workflow 입력의 `database_name`에는 Cloudflare D1 데이터베이스 이름이나 UUID를 넣고, `target_environment`는 artifact 구분용으로 Preview 또는 Production을 선택합니다.

workflow는 `scripts/check-d1-schema-report.mjs`를 실행해 다음 신규 테이블을 포함한 migration 결과를 확인합니다.

- `user_points`
- `point_transactions`
- `daily_point_claims`
- `chat_room_reads`
- `chat_room_exits`
- `user_blocks`
- `reports`
- `report_moderation`
- `request_gates`
- `revoked_profiles`
- `user_suspensions`

기존 핵심 테이블은 artifact의 `table-info-*.json`을 보고 추가 migration 작성 여부를 판단합니다.

## D1 migration apply workflow

수동 실행 workflow인 `.github/workflows/d1-migrations-apply.yml`은 번호 순서대로 repository의 D1 migration을 실제 D1 데이터베이스에 적용합니다.

실행 전 아래 조건을 확인합니다.

- 대상 Preview 또는 Production D1 데이터베이스를 백업하거나 내보냅니다.
- GitHub repository secrets에 `CLOUDFLARE_ACCOUNT_ID`와 `CLOUDFLARE_API_TOKEN`이 등록되어 있어야 합니다.
- workflow 입력의 `database_name`은 Cloudflare D1 데이터베이스 이름이나 UUID만 사용합니다.
- `target_environment`를 Preview 또는 Production 중 하나로 선택합니다.
- 백업과 대상 확인이 끝난 경우에만 `confirm_apply`를 true로 지정합니다.

workflow는 적용 전 `pnpm check:d1-migrations`를 실행하고, 적용 후 `sqlite_master`, migration 대상 테이블, 기존 핵심 테이블의 `pragma table_info(...)`를 `d1-migrations-<environment>` artifact로 업로드합니다. artifact가 없거나 schema report 검사가 실패하면 workflow가 실패합니다.

## 적용 순서

1. Cloudflare D1 데이터베이스를 백업하거나 내보냅니다.
2. Preview 데이터베이스에 SQL 파일을 번호 순서대로 적용합니다. 가능하면 D1 Migrations Apply workflow를 `target_environment=preview`, `confirm_apply=true`로 실행합니다.
3. D1 Schema Inspect workflow를 Preview DB 대상으로 실행하고 artifact를 확인합니다.
4. 아래 회귀 항목을 Preview 배포에서 확인합니다.
5. 같은 파일을 Production 데이터베이스에 같은 순서로 적용합니다. 가능하면 D1 Migrations Apply workflow를 `target_environment=production`, `confirm_apply=true`로 실행합니다.
6. D1 Schema Inspect workflow를 Production DB 대상으로 실행하고 artifact를 보관합니다.
7. Production 확인이 끝난 뒤에만 API의 런타임 테이블 생성 코드를 제거합니다.

Cloudflare 대시보드의 D1 SQL 실행 화면 또는 프로젝트에서 사용하는 Wrangler 명령으로 각 파일을 적용할 수도 있습니다. 저장소에는 D1 데이터베이스 이름과 Wrangler 설정 파일이 없으므로 실제 데이터베이스 이름은 Cloudflare Pages 프로젝트 설정에서 확인해야 합니다.

## Preview 회귀 확인

- 출석체크와 광고 보상이 하루 한 번만 지급되는지
- 토크 첫 작성 보상이 한 번만 지급되는지
- 1:1 채팅을 빠르게 두 번 눌러도 100P가 한 번만 차감되는지
- 채팅방 생성 실패 시 거래내역에 복구 기록이 남고 잔액이 돌아오는지
- 채팅방 나가기 후 내 목록에서만 숨겨지는지
- 다시 쪽지를 시작했을 때 채팅방이 정상 재개되는지
- 차단한 사용자가 최근 사용자 목록에서 제외되는지
- 신고 작성과 관리자 신고 목록 조회가 정상 동작하는지
- 신고 상태·관리자 메모·처리 시각이 `reports + report_moderation` 조합으로 저장되는지
- 1일·7일·30일·무기한 정지가 적용되는지
- 정지 해제 후 비공개 API 접근이 복구되는지
- 정지된 사용자가 비공개 API 호출 시 403을 받는지
- 관리자 이미지 메시지 삭제 후 R2 원본 객체가 제거되는지
- 회원 탈퇴 후 기존 세션으로 비공개 API를 호출하면 401이 반환되는지
- 탈퇴 후 새 세션으로 다시 가입할 수 있는지

## 아직 migration으로 옮기지 않은 항목

기존 운영 DB의 정확한 초기 스키마를 확인해야 하는 핵심 테이블은 이번 migration에 포함하지 않았습니다.

- `recent_users`
- `talk_posts`
- `chat_rooms`
- `chat_messages`
- `my_rooms`

이 테이블들은 Production의 `sqlite_master`와 `pragma table_info(...)` 결과를 확인한 뒤 별도 migration으로 작성해야 합니다. 확인 전에는 기존 호환용 런타임 DDL 코드를 제거하지 않습니다.
