# 플러팅 Release AAB 및 서명 키 준비

이 문서는 플러팅을 Google Play에 올리기 위한 release AAB 빌드 준비 문서입니다.

## 현재 상태

- Debug APK 워크플로우: `.github/workflows/android-debug-apk.yml`
- Release AAB 워크플로우: `.github/workflows/android-release-aab.yml`
- 앱 이름: 플러팅
- Android 패키지명: `com.flirting.app`
- 앱 아이콘 원본: `resources/icon.png`
- 앱 스플래시 원본: `resources/splash.png`

## 중요한 주의사항

Google Play에 한 번 업로드한 뒤에는 Android 패키지명인 `com.flirting.app`을 사실상 변경하기 어렵습니다. Play Store 첫 업로드 전 패키지명을 최종 확정해야 합니다.

## 필요한 GitHub Secrets

Release AAB 워크플로우를 실행하려면 GitHub 저장소 Secrets에 아래 값을 넣어야 합니다.

```txt
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

## 각 Secret 의미

```txt
ANDROID_KEYSTORE_BASE64
→ release 서명 키 파일을 base64로 변환한 값

ANDROID_KEYSTORE_PASSWORD
→ keystore 파일 비밀번호

ANDROID_KEY_ALIAS
→ 키 별칭

ANDROID_KEY_PASSWORD
→ 키 비밀번호
```

## PC가 있을 때 keystore 생성 예시

```bash
keytool -genkeypair \
  -v \
  -keystore flirting-release.keystore \
  -alias flirting \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

생성 후 base64 변환:

```bash
base64 -w 0 flirting-release.keystore
```

macOS에서는:

```bash
base64 flirting-release.keystore | tr -d '\n'
```

## 모바일만 있을 때 현실적인 방법

모바일만으로 release keystore를 안전하게 생성하고 관리하는 것은 불편합니다. 가능한 방법은 아래 중 하나입니다.

1. 잠깐이라도 PC 사용 가능한 환경에서 keystore 생성
2. GitHub Codespaces 같은 클라우드 개발환경 사용
3. Android 빌드는 GitHub Actions에서 처리하고, keystore 값은 GitHub Secrets에만 보관

keystore 파일은 절대 공개 저장소에 올리면 안 됩니다.

## Release AAB 빌드 순서

```txt
1. GitHub 저장소 Settings 접속
2. Secrets and variables → Actions 이동
3. 필요한 4개 Secrets 등록
4. Actions → Android Release AAB 실행
5. flirting-release-aab artifact 다운로드
6. Google Play Console에 app-release.aab 업로드
```

## 빌드 실패 시 확인할 것

- `Missing ANDROID_KEYSTORE_BASE64` 오류: Secret 미등록
- `base64 decode` 오류: base64 문자열 깨짐
- `Execution failed for task ':app:validateSigningRelease'`: 비밀번호/alias 불일치
- `bundleRelease` 실패: Gradle signing 설정 확인 필요
- `pnpm build` 실패: 프론트 TypeScript/빌드 오류 확인 필요

## 출시 전 최종 점검

- 앱 이름이 플러팅으로 표시되는지
- 아이콘이 `resources/icon.png` 기준으로 나오는지
- 앱 시작 직후 웹 스플래시가 표시되는지
- 토크 작성 가능 여부
- 채팅방 생성/메시지 전송 가능 여부
- 이미지 업로드 가능 여부
- 신고/차단 동작 여부
- 개인정보처리방침 URL 접근 가능 여부
- 이용약관 URL 접근 가능 여부
