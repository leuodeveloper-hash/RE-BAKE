import WidgetKit
import SwiftUI

// App Group으로 앱↔위젯 데이터 공유
let appGroup = "group.com.bakle.app"

// 앱(JS 브릿지)이 shared UserDefaults에 저장하는 오늘의 레시피 후보 1건.
// 후보 풀 중 "그날의 하나"는 앱이 골라 저장하고, 위젯은 그대로 표시만 한다.
struct DailyRecipe: Codable {
  let id: String
  let title: String
  let cookbook: String?
  let imagePath: String? // App Group 컨테이너 내 로컬 이미지 파일 경로(없을 수 있음)
}

struct RecipeEntry: TimelineEntry {
  let date: Date
  let recipe: DailyRecipe?
}

// shared UserDefaults에서 오늘의 레시피 읽기
func readTodayRecipe() -> DailyRecipe? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: "todayRecipe"),
        let data = raw.data(using: .utf8),
        let recipe = try? JSONDecoder().decode(DailyRecipe.self, from: data)
  else { return nil }
  return recipe
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> RecipeEntry {
    RecipeEntry(date: Date(), recipe: DailyRecipe(id: "", title: "오늘의 레시피", cookbook: nil, imagePath: nil))
  }

  func getSnapshot(in context: Context, completion: @escaping (RecipeEntry) -> Void) {
    completion(RecipeEntry(date: Date(), recipe: readTodayRecipe()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<RecipeEntry>) -> Void) {
    let entry = RecipeEntry(date: Date(), recipe: readTodayRecipe())
    // 매일 오전 9시에 다음 갱신 (앱이 백그라운드에서 못 밀어줘도 위젯이 스스로 리로드 요청)
    let cal = Calendar.current
    var next = cal.date(bySettingHour: 9, minute: 0, second: 0, of: Date())!
    if next <= Date() {
      next = cal.date(byAdding: .day, value: 1, to: next)!
    }
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct BakleWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    let recipe = entry.recipe
    // 탭 → 앱의 레시피 상세로 딥링크. id 없으면 앱만 열기.
    let url = URL(string: recipe.flatMap { $0.id.isEmpty ? nil : "bakle://recipe/\($0.id)" } ?? "bakle://")!

    ZStack {
      Color("$widgetBackground")
      content(recipe: recipe)
        .padding(family == .systemSmall ? 12 : 16)
    }
    .widgetURL(url)
  }

  @ViewBuilder
  func content(recipe: DailyRecipe?) -> some View {
    if let recipe = recipe, !recipe.id.isEmpty {
      HStack(spacing: family == .systemSmall ? 0 : 14) {
        VStack(alignment: .leading, spacing: 6) {
          Text("오늘의 레시피 🥐")
            .font(.caption2)
            .foregroundColor(Color("$accent"))
            .lineLimit(1)
          Text(recipe.title)
            .font(family == .systemSmall ? .headline : .title3)
            .fontWeight(.bold)
            .foregroundColor(.primary)
            .lineLimit(family == .systemSmall ? 3 : 2)
          if let cookbook = recipe.cookbook, !cookbook.isEmpty {
            Text(cookbook)
              .font(.caption)
              .foregroundColor(.secondary)
              .lineLimit(1)
          }
          Spacer(minLength: 0)
        }
        if family != .systemSmall {
          thumbnail(recipe: recipe)
        }
      }
    } else {
      // 후보가 아직 동기화되지 않은 상태
      VStack(alignment: .leading, spacing: 6) {
        Text("오늘의 레시피 🥐")
          .font(.caption2)
          .foregroundColor(Color("$accent"))
        Text("앱을 열어 오늘의 레시피를 받아보세요")
          .font(.subheadline)
          .foregroundColor(.secondary)
          .lineLimit(3)
        Spacer(minLength: 0)
      }
    }
  }

  @ViewBuilder
  func thumbnail(recipe: DailyRecipe) -> some View {
    if let path = recipe.imagePath, let uiImage = UIImage(contentsOfFile: path) {
      Image(uiImage: uiImage)
        .resizable()
        .aspectRatio(contentMode: .fill)
        .frame(width: 84, height: 84)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    } else {
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .fill(Color("$accent").opacity(0.12))
        .frame(width: 84, height: 84)
        .overlay(Text("🥐").font(.system(size: 34)))
    }
  }
}

@main
struct BakleWidget: Widget {
  let kind: String = "BakleWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        BakleWidgetEntryView(entry: entry)
          .containerBackground(Color("$widgetBackground"), for: .widget)
      } else {
        BakleWidgetEntryView(entry: entry)
      }
    }
    .configurationDisplayName("오늘의 레시피")
    .description("매일 오전 9시, 오늘의 레시피를 추천해드려요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
