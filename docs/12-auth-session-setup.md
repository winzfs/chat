# 서명 세션 인증 설정

마지막 갱신: 2026-06-23

플러팅 API는 더 이상 클라이언트가 보낸 `profile_id`만으로 사용자를 신뢰하지 않습니다. 앱 시작 시 서버가 프로필 ID와 서명 토큰을 발급하고, 이후 비공개 API 요청은 `Authorization: Bearer <token>` 헤더를 검사합니다.

## Cloudflare Pages 필수 환경변수

Cloudflare Pages 프로젝트의 Settings → Variables and Secrets에서 아래 값을 Production과 Preview 환경에 각각 등록합니다.

```txt
AUTH_SECRET=32자 이상의 예측하기 어려운 무작위 문자열
```

권장 생성 예시:

```bash
openssl rand -base64 48
```

`AUTH_SECRET`은 공개 저장소, 프론트엔드 환경변수, Android 리소스에 넣지 않습니다. Cloudflare 서버 환경변수에만 저장합니다.

## 배포 순서

1. Cloudflare Pages에 `AUTH_SECRET` 등록
2. 새 배포 실행
3. 앱 첫 실행 시 `/api/auth/session`이 201을 반환하는지 확인
4. 포인트, 프로필 저장, 토크 작성, 채팅방 목록 API에 Bearer 토큰이 포함되는지 확인
5. 토큰 없이 비공개 API를 호출했을 때 401이 반환되는지 확인

## 기존 개발 계정

기존 localStorage 기반 프로필 ID는 신뢰 가능한 로그인 정보가 아니므로 새 서명 세션이 발급됩니다. 개발 중 생성한 기존 채팅·포인트 데이터와 연결이 끊길 수 있습니다. 정식 계정 로그인 도입 전까지 이 세션은 현재 기기 저장소에 유지됩니다.

## 장애 확인

`서버 인증 설정이 필요해요.` 또는 `AUTH_SECRET 환경변수를 32자 이상으로 설정해주세요.`가 표시되면 Cloudflare 환경변수가 없거나 너무 짧은 상태입니다.
