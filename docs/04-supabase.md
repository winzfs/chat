# Supabase 연결 설정

프로젝트 정보

```txt
Project ref: ylbqvgjeyecztcpahmqc
Project URL: https://ylbqvgjeyecztcpahmqc.supabase.co
Region: ap-northeast-2
```

Cloudflare Pages 환경변수에 아래 값을 추가해야 합니다.

```txt
VITE_SUPABASE_URL=https://ylbqvgjeyecztcpahmqc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_NL2GpQOccNMO0mrNR_KnRg_y4CMK9ey
```

Cloudflare 설정 위치

```txt
Workers & Pages → chat 프로젝트 → Settings → Environment variables
```

현재 생성된 테이블

```txt
profiles
- 사용자 프로필
- 닉네임, 나이, 지역, 소개, 프로필 이미지

talk_posts
- 한줄 토크
- 분위기, 본문, 태그, 좋아요 수, 댓글 수
```

주의사항

```txt
- service_role key는 프론트에 넣지 않는다.
- publishable key 또는 anon key만 프론트 환경변수로 사용한다.
- 로그인 기능을 붙이면 RLS 정책을 더 엄격하게 수정한다.
```
