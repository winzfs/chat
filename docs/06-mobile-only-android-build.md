# 모바일만으로 Android APK 만들기

마지막 갱신: 2026-06-10

## 목표

PC나 Android Studio 없이, 휴대폰에서 GitHub Actions를 실행해서 플러팅 테스트용 APK를 받습니다.

추가된 워크플로우:

```txt
.github/workflows/android-debug-apk.yml
```

생성되는 파일:

```txt
app-debug.apk
```

이 APK는 테스트용 debug APK입니다. Google Play 정식 출시용 AAB는 별도 서명 설정이 필요합니다.

## 현재 앱 정보

```txt
앱 이름: 플러팅
패키지명: com.flirting.app
아이콘 원본: resources/icon.png
스플래시 원본: resources/splash.png
artifact 이름: flirting-debug-apk
```

## 모바일에서 APK 빌드 실행하기

1. 휴대폰 브라우저에서 GitHub 접속
2. `winzfs/chat` 저장소로 이동
3. 상단 또는 메뉴에서 `Actions` 선택
4. `Android Debug APK` 워크플로우 선택
5. `Run workflow` 버튼 선택
6. 브랜치는 `main` 그대로 두고 실행
7. 빌드가 끝날 때까지 기다림
8. 완료된 실행 기록으로 들어감
9. 아래쪽 `Artifacts`에서 `flirting-debug-apk` 다운로드
10. 압축을 풀고 `app-debug.apk`를 테스트 기기에 설치

## 현재 자동 빌드 흐름

GitHub Actions가 아래 작업을 서버에서 대신 실행합니다.

```bash
pnpm install --frozen-lockfile=false
mkdir -p apps/web/public
cp resources/splash.png apps/web/public/splash.png
pnpm build
npx cap add android
npx @capacitor/assets generate --android --iconBackgroundColor '#ff5b8f' --splashBackgroundColor '#ff5b8f'
npx cap sync android
cd android
./gradlew assembleDebug
```

## 앱에서 확인할 것

- 앱 이름이 플러팅으로 보이는지
- 앱 아이콘이 바뀌었는지
- Android 기본 스플래시 이후 웹 스플래시가 표시되는지
- 토크 작성이 되는지
- 채팅방 생성과 메시지 전송이 되는지
- 이미지 메시지 업로드가 되는지
- Android 뒤로가기가 의도대로 작동하는지

## 실패했을 때 확인할 것

### 1. `pnpm build` 실패

TypeScript 또는 Vite 빌드 오류입니다. Actions 로그에서 오류 메시지를 복사해서 수정해야 합니다.

### 2. `npx cap add android` 실패

Capacitor 설정 또는 의존성 문제입니다. `capacitor.config.ts`와 Capacitor 설치 로그를 확인합니다.

### 3. `npx @capacitor/assets generate --android` 실패

`resources/icon.png` 또는 `resources/splash.png` 경로와 이미지 형식을 확인합니다.

### 4. `./gradlew assembleDebug` 실패

Android Gradle 빌드 문제입니다. Android SDK, Gradle, 앱 설정 로그를 확인합니다.

## 다음 단계

1. debug APK로 실기기 테스트
2. 입력창/키보드/이미지 업로드 확인
3. release keystore 생성 및 GitHub Secrets 등록
4. release AAB 빌드 테스트
5. Play Console 업로드 준비
