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


  /// 오늘의 레시피를 어느 북에서 고를지 — 비우면 전체에서 돈다
  @Parameter(title: "레시피북")
  var cookbook: CookbookOption?

  /// 띄울 D-day — 제과·제빵 시험 일정, 또는 앱에서 만든 내 D-day 중 하나(한 목록)
  @Parameter(title: "D-day")
  var dday: DdayOption?
}

/// 앱에서 만든 내 D-day(최대 5개) — 앱이 `widgetDdays`에 [{id,title,date}]로 넣어 둔다
struct WidgetDday: Codable {
  let id: String
  let title: String
  let date: String
}

func readWidgetDdays() -> [WidgetDday] {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: "widgetDdays"),
        let data = raw.data(using: .utf8),
        let list = try? JSONDecoder().decode([WidgetDday].self, from: data)
  else { return [] }
  return list
}

/// 위젯 편집의 D-day 고르기 — 제과·제빵 시험 일정(exam:종목)과 내가 만든 D-day를 한 목록으로
struct DdayOption: AppEntity {
  let id: String
  let title: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "D-day"
  static var defaultQuery = DdayQuery()

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)")
  }

  /// 시험 일정이면 종목, 내 D-day면 nil
  var discipline: ExamDiscipline? {
    id.hasPrefix("exam:") ? ExamDiscipline(rawValue: String(id.dropFirst(5))) : nil
  }

  static let pastry = DdayOption(id: "exam:pastry", title: "제과기능사 시험")
  static let baking = DdayOption(id: "exam:baking", title: "제빵기능사 시험")
}

struct DdayQuery: EntityQuery {
  private func all() -> [DdayOption] {
    [DdayOption.pastry, DdayOption.baking] + readWidgetDdays().map { DdayOption(id: $0.id, title: $0.title) }
  }

  func entities(for identifiers: [String]) async throws -> [DdayOption] {
    let list = all()
    return identifiers.compactMap { id in list.first { $0.id == id } }
  }

  func suggestedEntities() async throws -> [DdayOption] { all() }

  func defaultResult() async -> DdayOption? { DdayOption.pastry }
}

/// 위젯에 띄울 레시피북 — 앱이 저장한 목록에서 고른다.
///
/// 종목(제과/제빵)만으로 가르면 북이 늘어날 때마다 코드를 고쳐야 한다.
/// 앱이 `widgetCookbooks`에 현재 북 목록을 넣어 두고, 위젯 편집 화면이 그걸 읽는다.
struct CookbookOption: AppEntity {
  let id: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "레시피북"
  static var defaultQuery = CookbookQuery()

  var displayRepresentation: DisplayRepresentation {
    // 빈 id는 "전체" — 고르지 않았을 때의 기본
    DisplayRepresentation(title: "\(id.isEmpty ? "전체" : id)")
  }
}

struct CookbookQuery: EntityQuery {
  /// 앱이 App Group에 저장한 북 목록. 없으면 "전체" 하나만.
  private func allBooks() -> [String] {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let raw = defaults.string(forKey: "widgetCookbooks"),
          let data = raw.data(using: .utf8),
          let books = try? JSONDecoder().decode([String].self, from: data)
    else { return [] }
    return books
  }

  func entities(for identifiers: [String]) async throws -> [CookbookOption] {
    identifiers.map(CookbookOption.init(id:))
  }

  func suggestedEntities() async throws -> [CookbookOption] {
    [CookbookOption(id: "")] + allBooks().map(CookbookOption.init(id:))
  }

  func defaultResult() async -> CookbookOption? {
    CookbookOption(id: "")
  }
}
