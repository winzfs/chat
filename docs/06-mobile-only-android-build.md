# 모바일만으로 Android APK 만들기

마지막 갱신: 2026-06-09

## 목표

PC나 Android Studio 없이, 휴대폰에서 GitHub Actions를 실행해서 테스트용 APK를 받습니다.

추가된 워크플로우:

```txt
.github/workflows/android-debug-apk.yml
```

생성되는 파일:

```txt
app-debug.apk
```

이 APK는 테스트용 debug APK입니다. Google Play 정식 출시용 AAB는 별도 서명 설정이 필요합니다.

## 모바일에서 APK 빌드 실행하기

1. 휴대폰 브라우저에서 GitHub 접속
2. `winzfs/chat` 저장소로 이동
3. 상단 또는 메뉴에서 `Actions` 선택
4. `Android Debug APK` 워크플로우 선택
5. `Run workflow` 버튼 선택
6. 브랜치는 `main` 그대로 두고 실행
7. 빌드가 끝날 때까지 기다림
8. 완료된 실행 기록으로 들어감
9. 아래쪽 `Artifacts`에서 `chitchat-debug-apk` 다운로드
10. 압축을 풀고 `app-debug.apk` 설치

## 휴대폰 설치 시 주의

Android에서 APK 직접 설치를 하려면 브라우저 또는 파일 관리자에 `알 수 없는 앱 설치 허용` 권한이 필요할 수 있습니다.

## 현재 자동 빌드 흐름

GitHub Actions가 아래 작업을 서버에서 대신 실행합니다.

```bash
pnpm install --frozen-lockfile=false
pnpm add @capacitor/core@latest @capacitor/android@latest
pnpm add -D @capacitor/cli@latest
pnpm build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

## 실패했을 때 확인할 것

### 1. `pnpm build` 실패

TypeScript 또는 Vite 빌드 오류입니다. Actions 로그에서 오류 메시지를 복사해서 수정해야 합니다.

### 2. `npx cap add android` 실패

Capacitor 설정 또는 의존성 문제입니다. `capacitor.config.ts`와 Capacitor 설치 로그를 확인합니다.

### 3. `./gradlew assembleDebug` 실패

Android Gradle 빌드 문제입니다. Android SDK, Gradle, 앱 설정 로그를 확인합니다.

## 다음 단계

1. debug APK로 실기기 테스트
2. 입력창/키보드/이미지 업로드 확인
3. 앱 아이콘/스플래시 추가
4. release AAB 자동 빌드 추가
5. Play Console 업로드 준비
