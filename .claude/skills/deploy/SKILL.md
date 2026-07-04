---
name: deploy
description: Bakecycle 웹/안드로이드 배포. 웹은 expo export → Firebase Hosting, 안드로이드는 EAS 클라우드 없이 로컬 gradle로 내부배포용 APK 생성. "배포", "deploy", "웹 배포", "안드로이드 배포/APK", "Firebase Hosting 올려줘" 같은 요청에 사용. iOS 빌드는 범위 밖(별도).
---

# Bakecycle 배포 (web / android)

이 프로젝트(`bakecycle`, slug `rebake`, Firebase `bakecycle-b82b5`)를 **웹**과 **안드로이드 내부배포 APK**로 배포한다.
PeakUp의 배포 방식(웹: `expo export -p web` → `dist` → Firebase Hosting / 안드로이드: 내부배포 APK)을 본 프로젝트에 맞춘 것이다.

## 🚫 절대 규칙 — EAS 클라우드 빌드 금지

- `eas build` (클라우드)를 **절대 실행하지 않는다.** 사용자가 명시적으로 금지함.
- 안드로이드 APK는 **로컬 gradle**로만 만든다 (`./gradlew`). `eas build --local`도 사용자가 직접 원할 때만.
- iOS는 이 스킬 범위가 아니다 (로컬 Xcode 빌드는 메모리의 EAS Build Rules 참고).

## 0. 대상 결정

인자(`$ARGUMENTS`)로 대상을 정한다:
- `web` → 웹만
- `android` → 안드로이드 APK만
- 인자 없음 / `all` / `둘 다` → 웹 + 안드로이드 모두

빌드는 시간이 걸리므로, 무엇을 할지 한 줄로 알리고 진행한다. 두 대상 모두면 **웹 먼저, 안드로이드 다음**(순차)으로 한다.

## 1. 웹 배포 → Firebase Hosting

작업 트리(현재 코드)를 그대로 export하므로 커밋 없이도 최신 변경이 반영된다.

```bash
npm run deploy:web
```

이 스크립트는 `expo export -p web` (→ `dist/` 생성) 후 `firebase deploy --only hosting`을 실행한다.
- Hosting 설정: `firebase.json` (`public: dist`, SPA rewrite `** → /index.html`)
- 대상 프로젝트: `.firebaserc` 의 `bakecycle-b82b5`

### 웹 preflight
- `firebase login:list` 로 로그인 확인. 미로그인이면 `firebase login` 안내(대화형이라 사용자가 직접).
- export 실패(번들 에러) 시 `firebase deploy`는 자동으로 건너뛰어진다(`&&`) — 에러 로그를 그대로 사용자에게 전달.
- 배포 성공 시 출력되는 **Hosting URL**을 사용자에게 전달한다.

### 웹 검증
배포 후 호스팅 URL을 `WebFetch`로 열어 200/HTML이 내려오는지 가볍게 확인(가능하면).

## 2. 안드로이드 내부배포 APK (로컬 gradle, EAS 없음)

네이티브 `android/` 디렉터리가 이미 있으므로 prebuild 없이 바로 gradle 빌드한다.
release 빌드는 **debug 키로 서명**(`android/app/build.gradle`의 `release { signingConfig signingConfigs.debug }`)되어 있어
→ **내부배포/테스트 설치 전용**이고 Play Store 업로드는 불가하다 (사용자가 선택한 "APK 내부배포"에 부합).

```bash
cd android && ./gradlew assembleRelease
```

- 산출물: `android/app/build/outputs/apk/release/app-release.apk`
- 빠른 확인용 디버그 APK가 필요하면: `./gradlew assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk`
- 클린 빌드: `./gradlew clean assembleRelease`
- 릴리즈 APK는 JS 번들을 빌드 시점에 포함하므로, 현재 작업 트리의 JS 변경이 그대로 들어간다(커밋 불필요).

### 안드로이드 preflight / 주의
- JDK 17 필요(Expo SDK 54 기준). 빌드 실패 시 `java -version` 확인.
- 버전: 로컬 gradle은 `android/app/build.gradle`의 `versionCode`/`versionName`을 사용한다(EAS의 remote 버전과 무관). 내부배포라 보통 그대로 둬도 되지만, 새 빌드를 구분하려면 `versionCode`를 올린다.
- 빌드 완료 후 APK **절대경로**와 크기를 사용자에게 전달한다.
- 설치 안내(연결된 기기/에뮬레이터): `adb install -r android/app/build/outputs/apk/release/app-release.apk`

## 3. 마무리 보고

- 한 일(웹/안드로이드 각각 성공 여부)을 명확히 보고. 실패 시 로그 그대로 전달, 성공이면 URL/APK 경로를 적는다.
- 빌드를 건너뛴 단계가 있으면 그 사실을 밝힌다.
- 커밋/푸시는 사용자가 요청할 때만.
