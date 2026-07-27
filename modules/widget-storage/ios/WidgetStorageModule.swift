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
