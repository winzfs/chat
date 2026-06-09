# Android 패키징 가이드

마지막 갱신: 2026-06-09

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
appId: com.chitchat.app
appName: ChitChat
webDir: apps/web/dist
```

## 1. 의존성 설치

루트에서 실행합니다.

```bash
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
```

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

## 4. 웹 빌드 결과 동기화

웹 코드가 바뀔 때마다 실행합니다.

```bash
pnpm build
npx cap sync android
```

## 5. Android Studio 열기

```bash
npx cap open android
```

Android Studio에서 실제 기기 또는 에뮬레이터로 실행합니다.

## 6. 테스트 체크리스트

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
- 신고/차단 버튼 동작
- 채팅방 나가기 동작

## 7. 출시 전 필수 준비

- 앱 아이콘
- 스플래시 이미지
- 개인정보처리방침 URL
- 이용약관 URL
- 실제 로그인/인증 구조
- 운영자 계정과 `ADMIN_PROFILE_IDS` 설정
- D1/R2 운영 바인딩 확인
- Android 뒤로가기 버튼 동작 확인
- Play Console 앱 서명 설정

## 8. 주의사항

현재 앱은 localStorage 기반 가입입니다. Android 앱으로 감싸도 브라우저/WebView 저장소를 지우면 계정이 사라질 수 있습니다.

정식 운영 전에는 서버 기반 로그인 또는 소셜 로그인으로 전환하는 것이 안전합니다.
