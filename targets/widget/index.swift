import WidgetKit
import SwiftUI
import UIKit   // UIFontDescriptor — OpenType feature(tnum/ss01) 활성화용

// App Group으로 앱↔위젯 데이터 공유
let appGroup = "group.com.bakle.app"

struct DailyRecipe: Codable {
  let id: String
  let title: String
  let cookbook: String?
}

struct RecipeEntry: TimelineEntry {
  let date: Date
  let recipe: DailyRecipe?
  let imagePath: String?
  /// 다가오는 시험 — 없으면 nil (배너를 그리지 않는다)
  let exam: UpcomingExam?
}

/// 앱이 저장한 "다가오는 시험" 한 건.
/// 날짜를 그대로 받아 위젯이 스스로 D-day를 계산한다 —
/// 남은 일수를 앱에서 미리 계산해 넣으면 앱을 안 여는 동안 숫자가 멈춘다.
struct UpcomingExam: Codable {
  let examDate: String        // 'YYYY-MM-DD'
  let label: String           // '제과 실기' 등
  let round: String           // '2026년 1회' 등
  let registrationStart: String
}

func readUpcomingExam() -> UpcomingExam? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: "upcomingExam"),
        !raw.isEmpty,
        let data = raw.data(using: .utf8),
        let exam = try? JSONDecoder().decode(UpcomingExam.self, from: data)
  else { return nil }
  return exam
}

/// 'YYYY-MM-DD' → 그날 00:00 (로컬 타임존)
func parseExamDate(_ s: String) -> Date? {
  let f = DateFormatter()
  f.dateFormat = "yyyy-MM-dd"
  f.timeZone = TimeZone.current
  // ISO 문자열(시각 포함)이 올 수도 있으므로 앞 10자만 쓴다
  return f.date(from: String(s.prefix(10)))
}

// MARK: - 서체
//
// 위젯은 앱과 별개 번들이라 앱에 등록된 폰트를 쓸 수 없다 → Info.plist(UIAppFonts)로
// 위젯 번들에도 Pretendard를 포함했다.
//
// SwiftUI의 .custom()은 OpenType feature를 켜지 못하므로, UIFontDescriptor로
// 직접 활성화한다.
// - salt(stylistic alternates): 디자인 시안이 지정한 대체 글리프.
//   Pretendard에서 salt는 숫자 1·3·4·6·9의 모양을 바꾼다(ss01은 이 숫자들을
//   건드리지 않으므로 시안과 달라진다 — 둘은 별개 피처다).
// - tnum(고정폭 숫자): 타이머가 1초마다 덜덜 떨리는 걸 막는다. .monospacedDigit()은
//   시스템 폰트용이라 커스텀 폰트에는 듣지 않는다.
enum WidgetFont {
  /// Pretendard + salt + tabular figures. relativeTo로 손쉬운 사용의 글자 크기를 따른다.
  ///
  /// - Parameter tabularNumbers: 고정폭 숫자. 타이머처럼 매초 바뀌는 곳에만 켠다.
  ///   D-day처럼 고정된 숫자엔 자간이 어색해질 수 있어 기본은 끔.
  static func pretendard(
    _ name: String,
    size: CGFloat,
    relativeTo textStyle: Font.TextStyle,
    tabularNumbers: Bool = false
  ) -> Font {
    guard let base = UIFont(name: name, size: size) else {
      // 폰트가 번들에 없으면 조용히 시스템 폰트로 — 위젯이 빈 화면이 되는 것보다 낫다
      return .system(size: size, weight: .semibold).monospacedDigit()
    }
    // salt → kStylisticAlternativesType / kStylisticAltOneOnSelector(=2).
    // ssNN과 달리 salt는 "대체 글리프 켜기" 하나뿐이다.
    var settings: [[UIFontDescriptor.FeatureKey: Int]] = [
      [.type: kStylisticAlternativesType, .selector: kStylisticAltOneOnSelector],
    ]
    if tabularNumbers {
      // 고정폭 숫자 (kNumberSpacingType / kMonospacedNumbersSelector)
      settings.append([.type: kNumberSpacingType, .selector: kMonospacedNumbersSelector])
    }
    let descriptor = base.fontDescriptor.addingAttributes([.featureSettings: settings])
    return Font(UIFont(descriptor: descriptor, size: size)).leading(.tight)
  }
}

/// 접수 시작 시각. 날짜만 오면 09:00으로 본다 —
/// 앱의 알림 로직(examNotifications.ts)과 같은 규칙이라야 안내가 어긋나지 않는다.
func parseRegistrationStart(_ s: String) -> Date? {
  guard !s.isEmpty else { return nil }
  let cal = Calendar.current
  // 시각이 포함된 ISO면 그대로, 날짜만이면 09:00
  let iso = ISO8601DateFormatter()
  iso.formatOptions = [.withInternetDateTime]
  if s.count > 10, let d = iso.date(from: s) { return d }
  guard let day = parseExamDate(s) else { return nil }
  return cal.date(bySettingHour: 9, minute: 0, second: 0, of: day)
}

/// 오늘 기준 남은 일수. 지났으면 nil.
func daysUntil(_ examDate: Date, from now: Date) -> Int? {
  let cal = Calendar.current
  let a = cal.startOfDay(for: now)
  let b = cal.startOfDay(for: examDate)
  guard let d = cal.dateComponents([.day], from: a, to: b).day, d >= 0 else { return nil }
  return d
}

// 앱(JS)이 저장한 날짜별 세트: seed(YYYYMMDD)로 그날의 제목+북+이미지가 한 세트.
// 미리 받아둔 이미지라 다음날도 빈칸 없이 텍스트-이미지가 항상 일치한다.
struct DailySet: Codable {
  let seed: Int
  let id: String
  let title: String
  let cookbook: String?
  let imagePath: String?
}

func readDailySets() -> [DailySet] {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: "dailySets"),
        let data = raw.data(using: .utf8),
        let sets = try? JSONDecoder().decode([DailySet].self, from: data)
  else { return [] }
  return sets
}

func seedFor(_ date: Date) -> Int {
  let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
  return (c.year ?? 0) * 10000 + (c.month ?? 0) * 100 + (c.day ?? 0)
}

// 앱이 저장한 imagePath(파일명)를 런타임의 App Group 컨테이너 절대경로로 변환.
// 앱은 파일명만 저장한다 — 컨테이너 절대경로는 UUID가 포함돼 앱 재설치/업데이트/기기마다
// 달라, 저장된 절대경로를 위젯이 읽으면 안 맞아 이미지가 안 뜨는 문제가 있었음.
// (하위호환: 예전 데이터가 절대경로('/'로 시작)면 그대로 사용)
func resolveImagePath(_ stored: String?) -> String? {
  guard let s = stored, !s.isEmpty else { return nil }
  if s.hasPrefix("/") { return s } // 구버전 절대경로 호환
  guard let container = FileManager.default
    .containerURL(forSecurityApplicationGroupIdentifier: appGroup)
  else { return nil }
  return container.appendingPathComponent("widget").appendingPathComponent(s).path
}

func entryFor(date: Date, sets: [DailySet], exam: UpcomingExam?) -> RecipeEntry {
  let seed = seedFor(date)
  if let s = sets.first(where: { $0.seed == seed }) {
    return RecipeEntry(
      date: date,
      recipe: DailyRecipe(id: s.id, title: s.title, cookbook: s.cookbook),
      imagePath: resolveImagePath(s.imagePath),
      exam: exam
    )
  }
  return RecipeEntry(date: date, recipe: nil, imagePath: nil, exam: exam)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> RecipeEntry {
    RecipeEntry(date: Date(), recipe: DailyRecipe(id: "", title: "오늘의 레시피", cookbook: nil), imagePath: nil, exam: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (RecipeEntry) -> Void) {
    completion(entryFor(date: Date(), sets: readDailySets(), exam: readUpcomingExam()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<RecipeEntry>) -> Void) {
    // 날짜별 세트(제목+이미지 일치)를 각 날짜 00:00 엔트리로. 매일 자정에 다음 세트로 전환.
    let cal = Calendar.current
    let startOfToday = cal.startOfDay(for: Date())
    let sets = readDailySets()
    // 시험 정보는 하루 단위로 D-day가 바뀐다. 엔트리마다 같은 값을 넣되,
    // 각 엔트리의 date를 기준으로 뷰가 남은 일수를 다시 계산한다.
    let exam = readUpcomingExam()
    var entries: [RecipeEntry] = []
    for dayOffset in 0..<14 {
      guard let day = cal.date(byAdding: .day, value: dayOffset, to: startOfToday) else { continue }
      entries.append(entryFor(date: day, sets: sets, exam: exam))
    }
    // 접수 시작 시각(보통 09:00) 엔트리를 끼워 넣는다. 자정 단위 엔트리만 있으면
    // 접수가 시작돼도 그날 저녁까지 배너가 "접수 D-0"에 머문다.
    if let exam,
       let regStart = parseRegistrationStart(exam.registrationStart),
       regStart > Date(),
       let horizon = cal.date(byAdding: .day, value: 14, to: startOfToday),
       regStart < horizon {
      entries.append(entryFor(date: regStart, sets: sets, exam: exam))
      entries.sort { $0.date < $1.date }
    }
    // 14일 뒤 갱신 요청 → 앱이 안 열렸어도 다시 준비된 만큼 순환.
    let refreshDate = cal.date(byAdding: .day, value: 14, to: startOfToday) ?? Date()
    completion(Timeline(entries: entries, policy: .after(refreshDate)))
  }
}

struct BakleWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  // 크기별 스케일 — 아이패드의 large/extraLarge에서 medium 값을 그대로 쓰면
  // 로고·제목이 지나치게 작아 보인다.
  private var logoSize: CGFloat {
    switch family {
    case .systemSmall: return 22
    case .systemMedium: return 26
    case .systemLarge: return 32
    default: return 40 // extraLarge
    }
  }
  private var contentPadding: CGFloat {
    switch family {
    case .systemSmall: return 12
    case .systemMedium: return 16
    case .systemLarge: return 20
    default: return 24
    }
  }
  /// 제목 서체 — 배너와 같은 Pretendard로 통일한다(하나만 시스템 폰트면 어색하다)
  private var titleFont: Font {
    switch family {
    case .systemSmall:  return WidgetFont.pretendard("Pretendard-Bold", size: 15, relativeTo: .subheadline)
    case .systemMedium: return WidgetFont.pretendard("Pretendard-Bold", size: 17, relativeTo: .headline)
    case .systemLarge:  return WidgetFont.pretendard("Pretendard-Bold", size: 22, relativeTo: .title2)
    default:            return WidgetFont.pretendard("Pretendard-Bold", size: 28, relativeTo: .title)
    }
  }

  /// 접수·시험 D-day 배너.
  /// 접수 전이면 접수 기준, 접수가 시작됐으면 시험 기준. D-1 이하는 강조색.
  @ViewBuilder
  private func examBanner(_ exam: UpcomingExam) -> some View {
    // 접수가 아직이면 접수 기준, 접수가 시작됐으면 시험 기준으로 안내한다.
    // (접수 마감을 놓치면 시험 자체를 못 보므로 접수가 먼저다)
    let regStart = parseRegistrationStart(exam.registrationStart)
    let regPending = regStart.map { $0 > entry.date } ?? false
    let targetDate = regPending ? regStart : parseExamDate(exam.examDate)

    // 카운트다운은 "아직 오지 않은 시각"이 있어야 성립한다.
    // 접수는 시작 시각(보통 09:00)이 있어 그때까지 셀 수 있지만,
    // 시험은 데이터에 날짜만 있어(examDate='YYYY-MM-DD' → 자정) 당일 낮에는
    // 이미 지난 시각이라 타이머가 0:00에 멈춘다. → 접수일 때만 타이머를 쓴다.
    let countdownDate: Date? = regPending ? regStart : nil

    if let targetDate,
       let days = daysUntil(targetDate, from: entry.date) {
      let prefix = regPending ? "접수" : exam.label
      // 라벨(작게) 위, D-day(크게) 아래. 36pt는 캡슐 배경에 어울리지 않아
      // 배경 없이 이미지 위에 바로 얹고, 가독성은 그림자로 확보한다.
      VStack(alignment: .leading, spacing: -2) {
        HStack(spacing: 4) {
          Text(prefix)
            // 시안: Pretendard 500 10pt
            .font(WidgetFont.pretendard("Pretendard-Medium", size: 10, relativeTo: .caption2))
            .foregroundColor(.white)
            .lineLimit(1)
          // 접수 시작까지 남은 시간을 초 단위로 — OS가 앱 없이도 갱신한다.
          if days == 0, let countdownDate, countdownDate > entry.date {
            Text(countdownDate, style: .timer)
              // 매초 바뀌므로 고정폭 숫자 — 안 그러면 폭이 흔들린다
              .font(WidgetFont.pretendard("Pretendard-Medium", size: 10,
                                          relativeTo: .caption2, tabularNumbers: true))
              .foregroundColor(.white)
              .fixedSize()
          }
        }
        // 당일은 "D-day". 숫자와 같은 표기 체계라 D-2 → D-1 → D-day로 이어진다.
        Text(days == 0 ? "D-day" : "D-\(days)")
          // 시안: Pretendard Regular(400) 36pt. Bold로 하면 시안보다 훨씬 굵어진다.
          .font(WidgetFont.pretendard("Pretendard-Regular", size: 36, relativeTo: .largeTitle))
          .foregroundColor(.white)
          // "D-day"는 "D-3"보다 훨씬 넓어 작은 위젯에서 넘친다.
          // fixedSize로 밀어내지 말고 한 줄 유지하며 필요한 만큼만 줄인다.
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      // 시안: 0 2px 20px rgba(0,0,0,0.54).
      // SwiftUI radius는 CSS blur의 약 절반이라 20px → radius 10.
      .shadow(color: .black.opacity(0.54), radius: 10, y: 2)
    }
  }

  var body: some View {
    let recipe = entry.recipe
    let hasRecipe = recipe.map { !$0.id.isEmpty } ?? false
    // 탭 → 앱의 레시피 상세로 딥링크. id 없으면 앱만 열기.
    let url = URL(string: recipe.flatMap { $0.id.isEmpty ? nil : "bakle://recipe/\($0.id)" } ?? "bakle://")!

    ZStack(alignment: .bottomLeading) {
      if hasRecipe, let recipe = recipe {
        // 우측 상단 흰색 로고
        Image("logo")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: logoSize, height: logoSize)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
          .padding(contentPadding)
        // 하단 좌측: 시험이 있으면 D-day, 없으면 레시피 제목.
        // (둘을 같이 쌓으면 작은 위젯에서 자리가 모자라 D-day가 잘린다)
        Group {
          if let exam = entry.exam {
            examBanner(exam)
          } else {
            Text(recipe.title)
              .font(titleFont)
              .foregroundColor(.white)
              .lineLimit(2)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .padding(contentPadding)
      } else {
        VStack(spacing: 6) {
          Text("🥐").font(.system(size: 36))
          Text("앱을 열어 오늘의 레시피를 받아보세요")
            .font(.caption)
            .foregroundColor(.secondary)
            .multilineTextAlignment(.center)
            .lineLimit(3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
      }
    }
    .widgetURL(url)
  }

  // 오늘 레시피 이미지(로컬) + 하단 그라디언트. containerBackground에 넣어 위젯 가장자리까지 채운다.
  // (그라디언트를 body에 두면 콘텐츠 패딩 안쪽에만 깔려 어긋남 → 배경 레이어에 함께.)
  @ViewBuilder
  static func backgroundLayer(imagePath: String?) -> some View {
    ZStack {
      if let path = imagePath, let uiImage = UIImage(contentsOfFile: path) {
        Image(uiImage: uiImage)
          .resizable()
          .aspectRatio(contentMode: .fill)
      } else {
        Color("$widgetBackground")
      }
      LinearGradient(
        gradient: Gradient(colors: [.clear, .black.opacity(0.15), .black.opacity(0.75)]),
        startPoint: .center, endPoint: .bottom
      )
    }
  }
}

@main
struct BakleWidget: Widget {
  let kind: String = "BakleWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      // 이미지가 위젯 전체(가장자리까지)를 채우도록 배경 자체를 containerBackground로.
      // 위젯 타깃은 iOS18+ 이므로 항상 이 경로.
      BakleWidgetEntryView(entry: entry)
        .containerBackground(for: .widget) {
          BakleWidgetEntryView.backgroundLayer(imagePath: entry.imagePath)
        }
    }
    .configurationDisplayName("오늘의 레시피")
    .description("매일 새로운 오늘의 레시피를 추천해드려요.")
    // 아이패드는 홈 화면 위젯이 large/extraLarge 중심이라 small/medium만 지원하면
    // 선택지가 거의 없다. 큰 크기까지 지원해 아이패드에서도 정상 배치되게 한다.
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
    // 시스템 기본 콘텐츠 여백 제거 → 이미지가 가장자리까지 차고, 텍스트 패딩은 body의 .padding만 적용
    // (시스템 여백 + 내 패딩이 겹쳐 "너무 넓게" 보이던 문제 해결)
    .contentMarginsDisabled()
  }
}

// MARK: - Xcode Canvas 프리뷰
//
// 접수/시험 단계는 실제 날짜가 와야 보이므로, 날짜를 고정한 가짜 엔트리로 각 상태를 만든다.
// Xcode에서 이 파일을 열고 Canvas(⌥⌘↩)를 켜면 아래 상태들이 한 번에 렌더된다.
#if DEBUG
private func previewEntry(
  now: Date,
  examDate: String,
  registrationStart: String,
  label: String = "제과 실기"
) -> RecipeEntry {
  RecipeEntry(
    date: now,
    recipe: DailyRecipe(id: "preview", title: "통밀 캉파뉴", cookbook: "나의 레시피"),
    imagePath: nil,
    exam: UpcomingExam(
      examDate: examDate,
      label: label,
      round: "2026년 1회",
      registrationStart: registrationStart
    )
  )
}

/// 특정 날짜/시각을 만든다 (프리뷰 전용)
private func previewDate(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 12, _ min: Int = 0) -> Date {
  var c = DateComponents()
  c.year = y; c.month = m; c.day = d; c.hour = h; c.minute = min
  return Calendar.current.date(from: c) ?? Date()
}

#Preview("접수 D-5", as: .systemMedium) {
  BakleWidget()
} timeline: {
  previewEntry(now: previewDate(2026, 3, 1), examDate: "2026-04-10", registrationStart: "2026-03-06")
}

#Preview("접수 당일(타이머)", as: .systemMedium) {
  BakleWidget()
} timeline: {
  // 09:00 접수 시작 2시간 전 → 카운트다운이 보인다
  previewEntry(now: previewDate(2026, 3, 6, 7, 0), examDate: "2026-04-10", registrationStart: "2026-03-06")
}

#Preview("시험 D-30(접수 후)", as: .systemMedium) {
  BakleWidget()
} timeline: {
  previewEntry(now: previewDate(2026, 3, 11), examDate: "2026-04-10", registrationStart: "2026-03-06")
}

#Preview("시험 D-1(강조)", as: .systemMedium) {
  BakleWidget()
} timeline: {
  previewEntry(now: previewDate(2026, 4, 9), examDate: "2026-04-10", registrationStart: "2026-03-06")
}

#Preview("시험 당일(타이머)", as: .systemMedium) {
  BakleWidget()
} timeline: {
  previewEntry(now: previewDate(2026, 4, 10, 6, 0), examDate: "2026-04-10", registrationStart: "2026-03-06")
}

#Preview("배너 없음", as: .systemMedium) {
  BakleWidget()
} timeline: {
  RecipeEntry(
    date: Date(),
    recipe: DailyRecipe(id: "preview", title: "통밀 캉파뉴", cookbook: "나의 레시피"),
    imagePath: nil,
    exam: nil
  )
}

#Preview("작은 위젯", as: .systemSmall) {
  BakleWidget()
} timeline: {
  previewEntry(now: previewDate(2026, 4, 9), examDate: "2026-04-10", registrationStart: "2026-03-06")
}
#endif
