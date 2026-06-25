# Google Play 정식 출시 체크리스트

마지막 갱신: 2026-06-25

## 현재 준비 상태

- [x] 앱 이름: 플러팅
- [x] Android 패키지명: `com.flirting.app`
- [x] Cloudflare Pages + Functions + D1 + R2 구조
- [x] Capacitor Android 프로젝트
- [x] 앱 아이콘·스플래시 원본
- [x] 개인정보처리방침·이용약관 페이지
- [x] Android Debug APK workflow
- [x] Android Release AAB workflow
- [x] HMAC 서명 Bearer 세션
- [x] 신고·차단·관리자 처리 화면
- [x] 회원 탈퇴와 데이터 삭제
- [x] Web Verify와 Web E2E workflow
- [x] D1 Migrations Apply와 Schema Inspect workflow

## 1. 앱 기능 검증

자동화됨:

- [x] 가입 성공·실패
- [x] 토크 작성 실패 초안 보존
- [x] 모달 포커스 복원
- [x] 직접대화 중복 요청 방지
- [x] 메시지 실패 입력값 보존
- [x] 채팅방 나가기 취소·실패·성공
- [x] 회원 탈퇴 실패·성공
- [x] 프로필 저장 실패
- [x] 프로필 사진 업로드 실패
- [x] 포인트 보상 실패
- [x] 마이룸 로드 실패 저장 차단

실제 환경에서 확인 필요:

- [ ] 실제 프로필 사진 업로드·삭제
- [ ] 실제 채팅 이미지 업로드·관리자 삭제
- [ ] 실제 직접대화 포인트 차감·실패 환불
- [ ] 실제 신고 상태·메모·정지·정지 해제
- [ ] 실제 회원 탈퇴 D1·R2 삭제
- [ ] 네트워크 전환과 앱 재시작
- [ ] Android 키보드와 입력창 위치
- [ ] Android 뒤로가기
- [ ] 알림 권한과 알림 동작을 도입할 경우 실기기 확인

## 2. Cloudflare 운영 환경

- [ ] Production `AUTH_SECRET` 등록
- [ ] Preview `AUTH_SECRET` 등록
- [ ] Production `ADMIN_PROFILE_IDS` 등록
- [ ] Preview `ADMIN_PROFILE_IDS` 등록
- [ ] GitHub Secrets `CLOUDFLARE_ACCOUNT_ID` 등록
- [ ] GitHub Secrets `CLOUDFLARE_API_TOKEN` 등록
- [ ] Preview D1 backup/export
- [ ] Preview migration 1~6 적용
- [ ] Preview D1 Schema Inspect 성공
- [ ] Preview Pages Auth Smoke 성공
- [ ] Preview Pages API Smoke 성공
- [ ] Preview 관리자·탈퇴 수동 회귀 성공
- [ ] Production D1 backup/export
- [ ] Production migration 1~6 적용
- [ ] Production D1 Schema Inspect 성공
- [ ] Production Pages Auth Smoke 성공
- [ ] Production Pages API Smoke 성공

## 3. 정책·법적 문서

현재 페이지:

```txt
/privacy.html
/terms.html
```

출시 전 실제 값으로 교체:

- [ ] 운영자명 또는 사업자명
- [ ] 문의 이메일
- [ ] 개인정보 보호책임자 정보
- [ ] 사업자등록번호가 있다면 추가
- [ ] 데이터 보관·삭제 기간 최종 확인
- [ ] 유료 기능의 결제·환불·청약철회 조항
- [ ] 신고·제재·이의신청 절차
- [ ] 미성년자 및 20세 이상 이용 제한 문구 일치

## 4. Google Play Console

- [ ] Google Play 개발자 계정 생성
- [ ] 앱 카테고리 선택
- [ ] 개인정보처리방침 URL 입력
- [ ] Data Safety 작성
- [ ] 콘텐츠 등급 설문
- [ ] 타겟 연령층 설정
- [ ] 앱 액세스·심사 안내 작성
- [ ] 휴대폰 스크린샷 준비
- [ ] 512×512 아이콘 준비
- [ ] 1024×500 피처 그래픽 준비
- [ ] 스토어 설명 최종 교정

## 5. Android release AAB

필요한 GitHub Secrets:

```txt
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

- [ ] release keystore 생성
- [ ] keystore 안전한 별도 백업
- [ ] GitHub Secrets 등록
- [ ] Android Release AAB workflow 성공
- [ ] AAB artifact 다운로드
- [ ] Play Console 내부 테스트 업로드
- [ ] 내부 테스트 링크로 실기기 설치
- [ ] 버전 업데이트 설치 확인
- [ ] 앱 이름·아이콘·스플래시 확인

## 6. 정식 출시 차단 조건

다음 항목 중 하나라도 미완료면 정식 Production 출시를 보류합니다.

- [ ] Preview와 Production migration 1~6 적용·검증
- [ ] Pages Auth/API Smoke 성공
- [ ] 회원 탈퇴와 관리자 제재 실제 환경 회귀 성공
- [ ] 개인정보처리방침·이용약관 실제 운영 정보 반영
- [ ] release AAB 서명·설치 검증
- [ ] Data Safety·콘텐츠 등급 작성
- [ ] 스토어 이미지 준비
- [ ] 고객 문의와 신고 처리 채널 확정

정식 로그인·계정 복구는 서비스 정책 결정 항목입니다. 도입하지 않고 출시할 경우 기기 변경과 앱 데이터 삭제 후 복구가 불가능하다는 점을 가입 화면·약관·고객지원 문서에 명확히 고지해야 합니다.

## 7. 출시 후 우선 과제

- 오류 수집과 장애 알림
- D1 정기 백업과 복원 훈련
- 관리자 운영 로그 확장
- 결제 PG와 광고 SDK 연동
- 계정 복구 가능한 로그인 도입 검토
- 이용자 증가 시 폴링 대체 실시간 구조 검토

## 관련 문서

- `docs/09-release-aab-and-keystore.md`
- `docs/10-safety-and-operation-policy.md`
- `docs/13-security-hardening-status.md`
- `docs/14-d1-migration-runbook.md`
- `docs/16-web-e2e.md`
- `docs/17-release-readiness-audit.md`
