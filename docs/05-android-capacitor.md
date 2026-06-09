# Android 패키징 가이드

마지막 갱신: 2026-06-10

## 목표

현재 React/Vite 웹앱을 Capacitor로 감싸 Android 앱으로 빌드합니다.

웹 빌드 결과물:

```txt
apps/web/dist
```

Capacitor 설정 파일:

```txt
capacitor.config.ts
```

현재 앱 설정:

```txt
appId: com.flirting.app
appName: 플러팅
webDir: apps/web/dist
```

앱 리소스:

```txt
아이콘 원본: resources/icon.png
스플래시 원본: resources/splash.png
```

## 1. 의존성 설치

루트에서 실행합니다.

```bash
pnpm install
```

Capacitor 관련 의존성은 루트 `package.json`에 포함되어 있습니다.

## 2. 웹앱 빌드 확인

```bash
pnpm build
```

이 단계가 실패하면 Android 프로젝트를 만들기 전에 TypeScript/Vite 오류를 먼저 수정해야 합니다.

## 3. Android 프로젝트 생성

처음 한 번만 실행합니다.

```bash
npx cap add android
```

생성 후 아래 폴더가 생깁니다.

```txt
android/
```

## 4. 앱 아이콘/스플래시 리소스 생성

```bash
npx @capacitor/assets generate --android --iconBackgroundColor '#ff5b8f' --splashBackgroundColor '#ff5b8f'
```

Android 12 이상 기본 스플래시는 전체 이미지를 그대로 보여주기보다 아이콘과 배경색 중심으로 표시합니다. 플러팅은 앱 시작 직후 웹앱 내부에서 `resources/splash.png` 기반 풀스크린 스플래시를 한 번 더 표시합니다.

## 5. 웹 빌드 결과 동기화

웹 코드가 바뀔 때마다 실행합니다.

```bash
pnpm build
npx cap sync android
```

## 6. Android Studio 열기

```bash
npx cap open android
```

Android Studio에서 실제 기기 또는 에뮬레이터로 실행합니다.

## 7. 테스트 체크리스트

- 앱 이름이 플러팅으로 표시되는지
- 앱 아이콘 표시
- Android 기본 스플래시 이후 웹 스플래시 표시
- 첫 가입 화면 동작
- 지역 선택 드롭다운 동작
- 토크 작성/삭제
- 사람 탭 최근 접속자 표시
- 프로필 모달 표시
- 프로필 모달에서 채팅 시작
- 채팅 탭 진입 시 목록부터 표시
- 채팅방 메시지 전송
- 사진 업로드/압축/전송
- 키보드가 올라올 때 채팅 입력창 위치
- Android 뒤로가기 동작
- 신고/차단 버튼 동작
- 채팅방 나가기 동작

## 8. 출시 전 필수 준비

- 개인정보처리방침 URL
- 이용약관 URL
- Play Store 512×512 아이콘
- Play Store 1024×500 피처 그래픽
- Play Store 스크린샷
- 실제 로그인/인증 구조
- 운영자 계정과 `ADMIN_PROFILE_IDS` 설정
- D1/R2 운영 바인딩 확인
- Play Console 앱 서명 설정

## 9. 주의사항

현재 앱은 localStorage 기반 가입입니다. Android 앱으로 감싸도 브라우저/WebView 저장소를 지우면 계정이 사라질 수 있습니다.

정식 운영 전에는 서버 기반 로그인 또는 소셜 로그인으로 전환하는 것이 안전합니다.

Google Play에 한 번 업로드한 뒤에는 `com.flirting.app` 패키지명을 변경하기 어렵습니다. 첫 업로드 전 패키지명을 최종 확정해야 합니다.
