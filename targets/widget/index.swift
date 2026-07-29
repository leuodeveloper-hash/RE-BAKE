import WidgetKit
import SwiftUI

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

func entryFor(date: Date, sets: [DailySet]) -> RecipeEntry {
  let seed = seedFor(date)
  if let s = sets.first(where: { $0.seed == seed }) {
    return RecipeEntry(
      date: date,
      recipe: DailyRecipe(id: s.id, title: s.title, cookbook: s.cookbook),
      imagePath: (s.imagePath?.isEmpty == false) ? s.imagePath : nil
    )
  }
  return RecipeEntry(date: date, recipe: nil, imagePath: nil)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> RecipeEntry {
    RecipeEntry(date: Date(), recipe: DailyRecipe(id: "", title: "오늘의 레시피", cookbook: nil), imagePath: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (RecipeEntry) -> Void) {
    completion(entryFor(date: Date(), sets: readDailySets()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<RecipeEntry>) -> Void) {
    // 날짜별 세트(제목+이미지 일치)를 각 날짜 00:00 엔트리로. 매일 자정에 다음 세트로 전환.
    let cal = Calendar.current
    let startOfToday = cal.startOfDay(for: Date())
    let sets = readDailySets()
    var entries: [RecipeEntry] = []
    for dayOffset in 0..<14 {
      guard let day = cal.date(byAdding: .day, value: dayOffset, to: startOfToday) else { continue }
      entries.append(entryFor(date: day, sets: sets))
    }
    // 14일 뒤 갱신 요청 → 앱이 안 열렸어도 다시 준비된 만큼 순환.
    let refreshDate = cal.date(byAdding: .day, value: 14, to: startOfToday) ?? Date()
    completion(Timeline(entries: entries, policy: .after(refreshDate)))
  }
}

struct BakleWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    let recipe = entry.recipe
    let hasRecipe = recipe.map { !$0.id.isEmpty } ?? false
    // 탭 → 앱의 레시피 상세로 딥링크. id 없으면 앱만 열기.
    let url = URL(string: recipe.flatMap { $0.id.isEmpty ? nil : "bakle://recipe/\($0.id)" } ?? "bakle://")!

    ZStack(alignment: .bottomLeading) {
      if hasRecipe, let recipe = recipe {
        // 좌측 상단 흰색 로고
        Image("logo")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: family == .systemSmall ? 22 : 26, height: family == .systemSmall ? 22 : 26)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .padding(family == .systemSmall ? 12 : 16)
        // 하단 좌측: 제목만
        Text(recipe.title)
          .font(family == .systemSmall ? .subheadline : .headline)
          .fontWeight(.bold)
          .foregroundColor(.white)
          .lineLimit(2)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
          .padding(family == .systemSmall ? 12 : 16)
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
    .supportedFamilies([.systemSmall, .systemMedium])
    // 시스템 기본 콘텐츠 여백 제거 → 이미지가 가장자리까지 차고, 텍스트 패딩은 body의 .padding만 적용
    // (시스템 여백 + 내 패딩이 겹쳐 "너무 넓게" 보이던 문제 해결)
    .contentMarginsDisabled()
  }
}
