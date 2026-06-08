# Chat

남녀 간 1:1 채팅 기반 수익형 웹앱 프로젝트입니다.

## 목표

- 모바일 웹앱을 먼저 완성합니다.
- Cloudflare Pages로 배포합니다.
- 이후 Capacitor를 사용해 Android 앱으로 패키징합니다.
- 유지보수와 확장이 쉽도록 기능을 작은 모듈로 분리합니다.

## 초기 기술 방향

- Frontend: React + Vite
- Deploy: Cloudflare Pages
- Mobile wrapper: Capacitor
- Realtime/Auth/DB: 추후 Supabase 또는 Cloudflare 기반으로 결정

## 개발 원칙

- 한 파일에 많은 기능을 몰아넣지 않습니다.
- 기능 단위로 폴더를 분리합니다.
- 작은 작업 단위로 커밋합니다.
- 먼저 배포 가능한 최소 버전을 만들고 점진적으로 확장합니다.

## 프로젝트 구조

```txt
chat/
 ├─ apps/
 │  └─ web/
 │     ├─ src/
 │     │  ├─ features/
 │     │  └─ shared/
 │     └─ package.json
 ├─ docs/
 ├─ package.json
 └─ pnpm-workspace.yaml
```

## 로컬 실행

```bash
pnpm install
pnpm dev
```

## 빌드

```bash
pnpm build
```

빌드 결과물은 아래 경로에 생성됩니다.

```txt
apps/web/dist
```

## Cloudflare Pages 배포 설정

```txt
Root directory: /
Build command: pnpm install --frozen-lockfile=false && pnpm build
Build output directory: apps/web/dist
Node.js version: 20
```

자세한 내용은 `docs/03-deployment.md`를 참고합니다.
