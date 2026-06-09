# Google Play 정식 출시 체크리스트

마지막 갱신: 2026-06-09

## 현재 상태

- 웹앱 MVP 구현 진행 중
- Cloudflare Pages 배포 구조 있음
- Capacitor Android debug APK 빌드 성공
- Android 실기기 실행 확인 완료
- 개인정보처리방침/이용약관 초안 페이지 추가
- release AAB 워크플로우 초안 추가

## 1. 앱 품질 점검

- [ ] 가입 화면 테스트
- [ ] 지역 선택 테스트
- [ ] 프로필 저장 테스트
- [ ] 프로필 사진 업로드/삭제 테스트
- [ ] 토크 작성/삭제 테스트
- [ ] 사람 탭 최근 접속자 테스트
- [ ] 프로필 모달 테스트
- [ ] 채팅 시작 테스트
- [ ] 채팅 탭 진입 시 목록부터 표시되는지 확인
- [ ] 채팅방 메시지 전송 테스트
- [ ] 이미지 메시지 전송 테스트
- [ ] 키보드가 올라올 때 입력창 위치 확인
- [ ] Android 뒤로가기 버튼 동작 확인
- [ ] 신고/차단 테스트
- [ ] 채팅방 나가기 테스트

## 2. 정책/법적 문서

현재 추가된 페이지:

```txt
/privacy.html
/terms.html
```

출시 전 실제 정보로 교체 필요:

- [ ] 운영자명 또는 사업자명
- [ ] 문의 이메일
- [ ] 사업자등록번호가 있다면 추가
- [ ] 개인정보 보호책임자 정보
- [ ] 유료 기능 추가 시 결제/환불/청약철회 조항 보강

## 3. Google Play Console 준비

- [ ] Google Play 개발자 계정 생성
- [ ] 앱 이름 확정
- [ ] 패키지명 확정
- [ ] 앱 카테고리 선택
- [ ] 앱 설명 작성
- [ ] 스크린샷 준비
- [ ] 앱 아이콘 준비
- [ ] 그래픽 이미지 준비
- [ ] 개인정보처리방침 URL 입력
- [ ] 데이터 보안 섹션 작성
- [ ] 콘텐츠 등급 설문 작성
- [ ] 타겟 연령층 설정
- [ ] 앱 액세스 정보 작성

## 4. Android release AAB 준비

추가된 워크플로우:

```txt
.github/workflows/android-release-aab.yml
```

필요한 GitHub Secrets:

```txt
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

절차:

1. Android release keystore 생성
2. keystore 파일을 base64로 변환
3. GitHub 저장소 Secrets에 등록
4. Actions에서 `Android Release AAB` 수동 실행
5. `chitchat-release-aab` artifact 다운로드
6. Play Console에 업로드

## 5. 아직 위험한 부분

### localStorage 기반 가입

현재 계정은 진짜 로그인 계정이 아니라 기기 저장소 기반입니다. 앱 삭제, 앱 데이터 삭제, WebView 저장소 초기화 시 계정이 사라질 수 있습니다.

정식 운영 전 권장:

- [ ] 이메일/소셜 로그인 도입
- [ ] 서버 세션 또는 토큰 기반 인증 도입
- [ ] 프로필과 계정의 영구 연결

### 실시간 방식

현재 채팅은 폴링 기반입니다. 초기 MVP에서는 가능하지만 이용자가 늘면 비용과 UX 문제가 생길 수 있습니다.

향후 후보:

- [ ] Cloudflare Durable Objects
- [ ] WebSocket
- [ ] Supabase Realtime 또는 별도 실시간 서버

### 운영/신고

채팅앱은 운영 리스크가 큽니다.

정식 운영 전 권장:

- [ ] 신고 관리 화면 최종 점검
- [ ] 차단 기능 최종 점검
- [ ] 운영자 계정 보호
- [ ] 금지 콘텐츠 정책 명확화
- [ ] 반복 신고/악성 이용자 제한 로직 강화

## 6. 다음 작업 순서 추천

1. 앱 아이콘/스플래시 추가
2. Android 뒤로가기 버튼 처리
3. 개인정보처리방침/이용약관 실제 정보 반영
4. release keystore 생성 방법 문서화
5. release AAB 워크플로우 실제 실행 테스트
6. Play Console 등록 자료 작성
