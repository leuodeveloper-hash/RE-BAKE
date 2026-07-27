---
name: ios-icon
description: Bakecycle iOS 앱 아이콘·네이티브 반영. 앱 아이콘/스플래시/앱 설정을 바꾼 뒤 `expo prebuild`로 네이티브 ios/ 프로젝트에 반영한다. "앱 아이콘 바꿔줘/안 바뀌어", "아이콘 반영", "prebuild", "스플래시 바꿔줘" 같은 요청에 사용. 실제 iOS 빌드/설치는 사용자가 Xcode에서 수동으로 하므로 범위 밖.
---

# Bakecycle iOS 앱 아이콘 / 네이티브 반영

앱 아이콘(및 스플래시·앱 설정)을 바꾼 뒤 **네이티브 `ios/` 프로젝트에 반영**하는 절차.
빌드/설치는 사용자가 Xcode에서 직접 하므로(메모리 `feedback_ios_manual_xcode_build` 참고), 이 스킬은 **prebuild 반영까지**만 담당한다.

## 🔑 핵심 (비자명 — 사용자도 몰랐던 포인트)

- **`assets/icon.png`만 바꿔선 iOS 아이콘이 안 바뀐다.** 반드시 아래 prebuild로 네이티브에 재생성해야 함.
- iOS 아이콘 실물은 `ios/Bakle/Images.xcassets/AppIcon.appiconset/*.png`. 여기가 갱신돼야 실제로 반영.

## 0. 대상 소스 확인

- 아이콘 소스: `app.json`의 `expo.icon`(현재 `./assets/icon.png`). iOS 전용이면 `expo.ios.icon`.
- 바꾸려는 새 아이콘이 이미 `assets/icon.png`(또는 지정 경로)에 들어와 있는지 먼저 확인.
  아직이면 새 이미지를 그 경로에 넣어야 함(1024×1024 권장, 투명 배경 지양 — iOS는 알파 무시/검게).

## 1. 네이티브 반영 (prebuild)

```bash
npx expo prebuild -p ios
```

- `AppIcon.appiconset`을 `app.json` 아이콘 기준으로 재생성한다.
- ⚠️ 인자에 em-dash(`—`) 등 이상한 문자 붙이지 말 것 — `Invalid project root` 에러남. 명령은 위 그대로.
- prebuild는 네이티브 `ios/` 디렉터리를 갱신한다. 커밋된 네이티브 수정(예: Info.plist 커스텀)이 있으면 덮어써질 수 있으니, diff 확인 후 필요한 커스텀은 다시 반영.

## 2. 반영 검증

```bash
# 네이티브 아이콘이 asset보다 최신이면 반영된 것
find ios -path "*AppIcon*" -name "*.png" -newer assets/icon.png | head -1 \
  && echo "→ 네이티브 아이콘 갱신됨" || echo "→ 반영 안 됨(prebuild 재실행)"
ls -la ios/Bakle/Images.xcassets/AppIcon.appiconset/*.png
```

## 3. 사용자에게 전달 (빌드는 사용자 몫)

- 반영 완료 사실만 알리고, **Xcode 빌드 절차는 설명하지 않는다**(사용자가 항상 수동).
- **비자명한 주의점만** 짧게: iOS 아이콘 캐시가 끈질기므로
  - Xcode에서 **Clean Build Folder (⇧⌘K)** 후 빌드
  - 그래도 안 바뀌면 **기기에서 앱 삭제 후 재설치**
- 🚫 EAS 클라우드 빌드 금지(메모리 EAS Build Rules). iOS는 로컬 Xcode 빌드가 기본.

## 참고

- iOS 수동 빌드 기조: 메모리 `feedback_ios_manual_xcode_build`
- Xcode 프로젝트에 의존성/파일 추가가 필요하면 `xcode-project-setup` 스킬 사용(이 스킬 범위 밖).
