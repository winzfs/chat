# 배포 가이드

## 배포 목표

이 프로젝트는 먼저 웹앱으로 배포한 뒤, 이후 Capacitor를 통해 Android 앱으로 확장한다.

초기 배포 대상은 Cloudflare Pages다.

## Cloudflare Pages 설정

Cloudflare Pages에서 GitHub 저장소를 연결할 때 아래 값을 사용한다.

```txt
Repository: winzfs/chat
Production branch: main
Root directory: /
Build command: pnpm install --frozen-lockfile=false && pnpm build
Build output directory: apps/web/dist
Node.js version: 20
```

루트 디렉터리를 저장소 루트로 두고, 루트 `package.json`에서 웹앱 빌드를 실행한다.

## 로컬 실행

루트에서 실행한다.

```bash
pnpm install
pnpm dev
```

## 로컬 빌드

```bash
pnpm build
```

웹앱 빌드 결과물은 아래 경로에 생성된다.

```txt
apps/web/dist
```

## 배포 전 확인 순서

1. `pnpm install`
2. `pnpm build`
3. `apps/web/dist` 생성 확인
4. Cloudflare Pages에서 GitHub 저장소 연결
5. Production branch를 `main`으로 설정
6. 배포 후 모바일 화면 확인

## 이후 Android 앱 전환 흐름

웹앱 MVP가 안정되면 Capacitor를 추가한다.

예정 순서:

```bash
pnpm add @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npx cap add android
pnpm build
npx cap sync android
npx cap open android
```

Android 작업은 웹앱의 핵심 화면과 결제/로그인 정책이 어느 정도 정리된 뒤 진행한다.

## 주의 사항

- 환경 변수는 `.env` 파일에 두고 GitHub에 올리지 않는다.
- 결제 키, Supabase 키, 관리자 키는 공개 저장소에 커밋하지 않는다.
- Cloudflare Pages 환경 변수 기능을 사용해 배포 환경 값을 관리한다.
- UI 작업과 서버/DB 작업은 분리해서 진행한다.
