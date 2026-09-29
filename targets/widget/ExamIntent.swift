import AppIntents
import WidgetKit

/// 위젯이 어느 종목을 보여줄지 — 홈 화면에서 위젯을 길게 눌러 "위젯 편집"으로 바꾼다.
///
/// 제과·제빵은 접수일이 달라 한 칸에 몰아넣으면 급한 쪽이 다른 쪽을 가린다.
/// 위젯을 두 종류로 늘리는 대신(갤러리가 지저분해진다) 같은 위젯을 두 개 놓고
/// 각각 다른 종목을 고르게 한다 — iOS 기본 동작이라 따로 배울 것이 없다.
enum ExamDiscipline: String, AppEnum {
  case pastry
  case baking

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "종목"

  static var caseDisplayRepresentations: [ExamDiscipline: DisplayRepresentation] = [
    .pastry: "제과기능사",
    .baking: "제빵기능사",
  ]

  /// 앱(JS)이 저장하는 키와 반드시 같아야 한다 — examWidgetSync.ts의 storageKey()
  var storageKey: String { "upcomingExam_\(rawValue)" }
}

struct ExamWidgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "시험 종목"
  static var description = IntentDescription("위젯에 표시할 시험 종목을 고릅니다.")

  @Parameter(title: "종목", default: .pastry)
  var discipline: ExamDiscipline
}
