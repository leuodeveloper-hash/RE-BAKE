import ExpoModulesCore
import WidgetKit

// App Group의 shared UserDefaults에 값을 쓰고 위젯을 갱신하는 최소 네이티브 모듈.
// (@bacons/apple-targets의 ExtensionStorage가 Expo SDK54와 platform 불일치로 링크되지
//  않아, 동일 역할을 하는 자체 모듈로 대체.)
public class WidgetStorageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetStorage")

    // 문자열 값을 App Group UserDefaults에 저장.
    Function("setString") { (key: String, value: String, appGroup: String) in
      UserDefaults(suiteName: appGroup)?.set(value, forKey: key)
    }

    // 키 제거.
    Function("remove") { (key: String, appGroup: String) in
      UserDefaults(suiteName: appGroup)?.removeObject(forKey: key)
    }

    // 홈 화면에 설치된 위젯 목록. 설치 안내를 보여줄지 판단하는 데 쓴다.
    // getCurrentConfigurations는 콜백이라 AsyncFunction으로 노출한다.
    //
    // 주의: 실패를 "설치 안 됨"으로 단정하면 안 된다. 시뮬레이터나 권한 문제로
    // 에러가 날 수 있어, 그 경우 installed를 nil로 두고 호출부가 "알 수 없음"으로
    // 다루게 한다 — 이미 설치한 사람에게 설치 안내를 띄우는 것이 더 나쁘다.
    AsyncFunction("getInstalledWidgets") { (promise: Promise) in
      guard #available(iOS 14.0, *) else {
        promise.resolve(["supported": false, "installed": nil, "widgets": [String]()])
        return
      }
      WidgetCenter.shared.getCurrentConfigurations { result in
        switch result {
        case .success(let infos):
          // family는 Int(rawValue)가 아니라 사람이 읽을 이름으로 — 호출부에서
          // small/medium/large를 구분해 안내 문구를 다르게 쓸 수 있다.
          let widgets = infos.map { info -> [String: Any] in
            let family: String
            switch info.family {
            case .systemSmall: family = "small"
            case .systemMedium: family = "medium"
            case .systemLarge: family = "large"
            case .systemExtraLarge: family = "extraLarge"
            default: family = "other"
            }
            return ["kind": info.kind, "family": family]
          }
          promise.resolve([
            "supported": true,
            "installed": !widgets.isEmpty,
            "widgets": widgets,
          ])
        case .failure(let error):
          // 조회 실패 — 설치 여부를 알 수 없다(설치 안 됨과 구분해야 한다)
          promise.resolve([
            "supported": true,
            "installed": nil,
            "widgets": [String](),
            "error": error.localizedDescription,
          ])
        }
      }
    }

    // 위젯 타임라인 갱신. name 주면 해당 kind만, 없으면 전체.
    Function("reloadWidget") { (name: String?) in
      if #available(iOS 14.0, *) {
        if let name = name, !name.isEmpty {
          WidgetCenter.shared.reloadTimelines(ofKind: name)
        } else {
          WidgetCenter.shared.reloadAllTimelines()
        }
      }
    }
  }
}
