import WidgetKit
import SwiftUI

// App Group으로 앱↔위젯 데이터 공유
let appGroup = "group.com.bakle.app"

// 앱(JS 브릿지)이 shared UserDefaults의 후보 목록(recipeCandidates)에 저장하는 항목.
// 이미지는 후보에 넣지 않고, "오늘 것" 1장만 별도 키(todayImagePath)로 저장한다.
struct DailyRecipe: Codable {
  let id: String
  let title: String
  let cookbook: String?
}

struct RecipeEntry: TimelineEntry {
  let date: Date
  let recipe: DailyRecipe?
  let imagePath: String? // 오늘 항목에만 채워짐(그날 이미지). 그 외 날짜는 nil(이모지 폴백).
}

// shared UserDefaults에서 후보 "전체"를 읽어, 날짜 시드로 그날 하나를 고른다.
// 앱을 열지 않아도 위젯이 매일 스스로 다른 레시피를 표시하게 하는 핵심.
func readTodayRecipe(for date: Date = Date()) -> DailyRecipe? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: "recipeCandidates"),
        let data = raw.data(using: .utf8),
        let list = try? JSONDecoder().decode([DailyRecipe].self, from: data),
        !list.isEmpty
  else { return nil }

  let cal = Calendar.current
  let comps = cal.dateComponents([.year, .month, .day], from: date)
  let seed = (comps.year ?? 0) * 10000 + (comps.month ?? 0) * 100 + (comps.day ?? 0)
  let idx = ((seed % list.count) + list.count) % list.count
  return list[idx]
}

// 앱이 미리 받아둔 "오늘 이미지" 로컬 경로.
func readTodayImagePath() -> String? {
  guard let defaults = UserDefaults(suiteName: appGroup) else { return nil }
  let p = defaults.string(forKey: "todayImagePath")
  return (p?.isEmpty == false) ? p : nil
}

// 오늘 항목(제목+북+이미지)을 "한 세트"로 저장한 것을 읽는다.
// 제목과 이미지가 항상 같은 레시피가 되도록(리스트 idx 재계산으로 어긋나는 문제 방지).
struct TodaySet: Codable {
  let id: String
  let title: String
  let cookbook: String?
  let imagePath: String?
}
func readTodaySet() -> TodaySet? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: "todayRecipe"),
        let data = raw.data(using: .utf8),
        let set = try? JSONDecoder().decode(TodaySet.self, from: data)
  else { return nil }
  return set
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> RecipeEntry {
    RecipeEntry(date: Date(), recipe: DailyRecipe(id: "", title: "오늘의 레시피", cookbook: nil), imagePath: nil)
  }

  // 오늘 엔트리: JS가 저장한 todayRecipe 세트(제목+이미지 일치)를 우선 사용.
  // 없으면 후보 리스트에서 계산(구버전 폴백).
  func todayEntry(date: Date) -> RecipeEntry {
    if let set = readTodaySet() {
      return RecipeEntry(
        date: date,
        recipe: DailyRecipe(id: set.id, title: set.title, cookbook: set.cookbook),
        imagePath: (set.imagePath?.isEmpty == false) ? set.imagePath : nil
      )
    }
    return RecipeEntry(date: date, recipe: readTodayRecipe(), imagePath: readTodayImagePath())
  }

  func getSnapshot(in context: Context, completion: @escaping (RecipeEntry) -> Void) {
    completion(todayEntry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<RecipeEntry>) -> Void) {
    // 앞으로 14일치 엔트리(텍스트는 매일 자동 순환). 오늘(offset 0)은 제목-이미지 일치 세트,
    // 그 외 날짜는 후보 순환(제목만, 이미지 없음).
    let cal = Calendar.current
    let startOfToday = cal.startOfDay(for: Date())
    var entries: [RecipeEntry] = []
    for dayOffset in 0..<14 {
      guard let day = cal.date(byAdding: .day, value: dayOffset, to: startOfToday) else { continue }
      if dayOffset == 0 {
        entries.append(todayEntry(date: day))
      } else {
        entries.append(RecipeEntry(date: day, recipe: readTodayRecipe(for: day), imagePath: nil))
      }
    }
    // 마지막 엔트리 이후(14일 뒤) 타임라인 갱신 요청 → 그때 앱이 안 열렸어도 다시 순환.
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
        // 좌측 상단 B 브랜드 마크 — 이미지 위라 흰색.
        Text("B")
          .font(.system(size: 18, weight: .heavy, design: .rounded))
          .foregroundColor(.white)
          .shadow(color: .black.opacity(0.25), radius: 2, y: 1)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .padding(family == .systemSmall ? 12 : 16)
        // 그라디언트/이미지는 backgroundLayer(containerBackground)에서 처리 → 여기선 텍스트만.
        VStack(alignment: .leading, spacing: 3) {
          Text("오늘의 레시피")
            .font(.caption2).fontWeight(.semibold)
            .foregroundColor(.white.opacity(0.85))
          Text(recipe.title)
            .font(family == .systemSmall ? .subheadline : .headline)
            .fontWeight(.bold)
            .foregroundColor(.white)
            .lineLimit(2)
          if let cookbook = recipe.cookbook, !cookbook.isEmpty {
            Text(cookbook)
              .font(.caption2)
              .foregroundColor(.white.opacity(0.8))
              .lineLimit(1)
          }
        }
        // 그라디언트를 배경 레이어로 옮기며 채움 요소가 사라져 텍스트가 위젯 전체로 안 늘어남 →
        // 위젯 전체를 채우고 하단좌측 정렬로 이전 레이아웃 복원.
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
  }
}
