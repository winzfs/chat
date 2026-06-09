# 배포 가이드

## 배포 목표

이 프로젝트는 먼저 웹앱으로 배포한 뒤, Capacitor를 통해 Android 앱으로 확장한다.

현재 앱 이름은 **플러팅**이며, 초기 배포 대상은 Cloudflare Pages다.

## Cloudflare Pages 설정

Cloudflare Pages에서 GitHub 저장소를 연결할 때 아래 값을 사용한다.

```txt
Repository: winzfs/chat
Production branch: main
Root directory: /
Build command: pnpm install --frozen-lockfile=false && pnpm build
Build output directory: apps/web/dist
Node.js version: 22
```

루트 디렉터리를 저장소 루트로 두고, 루트 `package.json`에서 웹앱 빌드를 실행한다.

## Cloudflare 바인딩

```txt
D1 binding: DB
R2 binding: IMAGES
```

## Cloudflare 환경변수

```txt
ADMIN_PROFILE_IDS=운영자_profile_id
```

운영자 `profile_id`가 여러 개라면 쉼표로 구분한다.

```txt
ADMIN_PROFILE_IDS=id1,id2,id3
```

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
6. Cloudflare D1/R2 바인딩 확인
7. `ADMIN_PROFILE_IDS` 환경변수 등록
8. 배포 후 모바일 화면 확인
9. `/privacy.html` 접근 확인
10. `/terms.html` 접근 확인

## Android 앱 전환 흐름

현재 Android 앱 전환은 GitHub Actions로 처리한다.

Debug APK:

```txt
.github/workflows/android-debug-apk.yml
artifact: flirting-debug-apk
```

Release AAB:

```txt
.github/workflows/android-release-aab.yml
artifact: flirting-release-aab
```

현재 Android 앱 설정:

```txt
appId: com.flirting.app
appName: 플러팅
webDir: apps/web/dist
```

앱 리소스:

```txt
resources/icon.png
resources/splash.png
```

## Android 앱에서 API 주소

Android 앱은 WebView 내부 주소에서 실행되기 때문에 `/api/*` 상대경로를 그대로 사용하면 Cloudflare Pages Functions로 요청되지 않을 수 있다.

현재 네이티브 앱에서는 아래 배포 주소를 API 기준 주소로 사용한다.

```txt
https://chat-509.pages.dev
```

관련 파일:

```txt
apps/web/src/features/home/api/apiBase.ts
```

커스텀 도메인을 붙이면 이 파일의 기준 주소도 함께 변경해야 한다.

## 주의 사항

- 환경 변수는 `.env` 파일에 두고 GitHub에 올리지 않는다.
- 결제 키, Supabase 키, 관리자 키, Android keystore 파일은 공개 저장소에 커밋하지 않는다.
- Cloudflare Pages 환경 변수 기능을 사용해 배포 환경 값을 관리한다.
- UI 작업과 서버/DB 작업은 분리해서 진행한다.
- Play Store에 업로드한 뒤에는 `com.flirting.app` 패키지명을 변경하기 어렵다.
