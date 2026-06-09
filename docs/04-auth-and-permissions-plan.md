# 인증/권한 전환 계획

마지막 갱신: 2026-06-09

## 현재 상태

현재 앱은 MVP 검증을 위해 localStorage 기반 `profile_id`를 사용합니다.

- 가입 정보는 브라우저 localStorage에 저장됩니다.
- 서버 데이터는 `profile_id` 기준으로 연결됩니다.
- 운영자 권한은 Cloudflare Pages 환경변수 `ADMIN_PROFILE_IDS`에 등록된 `profile_id`로 판별합니다.

이 구조는 빠른 테스트에는 적합하지만 실제 운영용 인증 구조는 아닙니다.

## 현재 구조의 한계

- 브라우저 데이터를 삭제하면 계정이 사라질 수 있습니다.
- 다른 기기에서 같은 계정을 이어 쓰기 어렵습니다.
- 사용자가 localStorage 값을 임의로 바꾸면 `profile_id`를 위조할 수 있습니다.
- 운영자 권한도 현재는 `profile_id` 기반이므로 실제 운영 전 서버 검증 방식으로 교체해야 합니다.
- 신고/차단/관리 기능의 신뢰도가 실제 계정 인증보다 낮습니다.

## 전환 목표

### 1단계: 임시 보강

- `ADMIN_PROFILE_IDS` 유지
- 운영자 전용 API는 서버에서 계속 권한 검사
- 신고 관리 화면은 운영자에게만 표시
- 모든 관리자 API는 `x-profile-id`만 믿지 않는 구조로 점진 전환 준비

### 2단계: 실제 계정 도입

후보 방식:

```txt
1. 이메일 로그인
2. 소셜 로그인
3. Cloudflare Access
4. Supabase Auth
5. Clerk/Auth0 같은 외부 인증 서비스
```

초기 서비스에는 이메일 또는 소셜 로그인이 가장 단순합니다.

### 3단계: 서버 세션/토큰 검증

- 클라이언트는 로그인 후 토큰을 보관
- API 요청마다 인증 토큰 전달
- 서버는 토큰을 검증해 실제 user_id 확인
- `profile_id`는 클라이언트가 보내는 값이 아니라 서버가 인증 결과에서 계산

### 4단계: 권한 모델 정리

권한 구분:

```txt
user      일반 사용자
moderator 신고 검토/차단 관리 가능
admin     전체 운영 설정 가능
```

관리자 API는 다음 기준으로 분리합니다.

```txt
GET /api/admin/me              운영자 여부 확인
GET /api/admin/user-review     moderator 이상
GET/PATCH /api/reports         moderator 이상
운영 설정 변경 API             admin only
```

## 데이터 모델 전환 방향

현재:

```txt
profile_id text
nickname text
```

운영 전환 후:

```txt
user_id text primary key
profile_id text unique
nickname text
role text default 'user'
created_at text
updated_at text
```

권장 테이블:

```sql
create table users (
  id text primary key,
  email text unique,
  role text not null default 'user',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
```

프로필 정보는 별도 테이블로 분리할 수 있습니다.

```sql
create table profiles (
  user_id text primary key,
  nickname text not null,
  age integer,
  location text,
  bio text,
  avatar_url text,
  updated_at text not null default (datetime('now'))
);
```

## 우선순위

1. 현재 기능 안정화와 빌드 확인
2. 관리자 API의 `ADMIN_PROFILE_IDS` 환경변수 적용 확인
3. 실제 인증 서비스 선택
4. `users/profiles` 테이블 도입
5. 기존 localStorage `profile_id` 사용자 마이그레이션 정책 결정
6. 신고/차단/채팅 API를 인증 기반 user_id로 전환

## 마이그레이션 주의사항

- 기존 `profile_id` 데이터가 이미 채팅방, 메시지, 토크 글에 연결되어 있으므로 즉시 삭제하면 안 됩니다.
- 실제 계정 도입 후에도 기존 `profile_id`는 legacy identifier로 유지하는 것이 안전합니다.
- 새 user_id와 기존 profile_id를 매핑하는 기간이 필요합니다.
- 신고/차단 같은 운영 데이터는 마이그레이션 우선순위가 높습니다.
