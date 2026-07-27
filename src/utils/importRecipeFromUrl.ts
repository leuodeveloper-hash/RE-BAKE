/**
 * 외부 레시피 사이트(만개의레시피 등) URL에서 레시피를 가져온다.
 * schema.org/Recipe JSON-LD를 파싱 — 대부분의 레시피 사이트가 SEO용으로 제공한다.
 *
 * CORS: 웹(브라우저)에선 대상 사이트가 CORS를 안 열어두면 직접 fetch가 막힌다.
 * 네이티브(iOS/Android)는 same-origin 정책이 없어 그대로 fetch 가능.
 * 웹은 실패 시 사용자에게 안내(앱에서 시도)하도록 에러를 던진다.
 */

export interface ImportedRecipe {
  title: string;
  servings?: string;
  imageUrl?: string;
  ingredients: {name: string; amount: string}[];
  steps: {description: string; photo?: string}[];
  /** 원본 URL (레퍼런스 링크로 저장용) */
  sourceUrl: string;
}

/** 재료 문자열("돼지고기 삼겹살 600g")을 이름/양으로 분리. 뒤쪽 수량 토큰을 amount로. */
function splitIngredient(raw: string): {name: string; amount: string} {
  const s = raw.trim();
  // 끝에서부터 '숫자(+분수/소수) + 단위' 패턴을 양으로 분리 (예: 600g, 2스푼, 1/2컵, 1대, 약간)
  const m = s.match(/^(.*?)[\s]*([\d.\/]+\s*[a-zA-Z가-힣]*|약간|적당량|조금|톡톡)$/);
  if (m && m[1].trim()) {
    return {name: m[1].trim(), amount: m[2].trim()};
  }
  return {name: s, amount: ''};
}

/** JSON-LD image 필드(문자열/배열/객체)에서 첫 URL 추출 */
function firstImage(image: any): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return firstImage(image[0]);
  if (typeof image === 'object' && image.url) return image.url;
  return undefined;
}

/** recipeInstructions(문자열/배열/HowToSection 등)를 평탄한 스텝 목록으로 */
function parseInstructions(instr: any): {description: string; photo?: string}[] {
  const out: {description: string; photo?: string}[] = [];
  const pushStep = (node: any) => {
    if (!node) return;
    if (typeof node === 'string') {
      const text = node.trim();
      if (text) out.push({description: text});
      return;
    }
    const type = node['@type'];
    if (type === 'HowToSection' && Array.isArray(node.itemListElement)) {
      node.itemListElement.forEach(pushStep);
      return;
    }
    // HowToStep 등
    const text = (node.text || node.name || '').trim();
    if (text) out.push({description: text, photo: firstImage(node.image)});
  };
  if (Array.isArray(instr)) instr.forEach(pushStep);
  else if (typeof instr === 'string') {
    // 줄바꿈으로 나눈 단일 문자열
    instr.split(/\n+/).forEach(line => pushStep(line));
  } else pushStep(instr);
  return out;
}

/** HTML 문자열에서 schema.org/Recipe JSON-LD 객체를 찾아 반환 */
function findRecipeJsonLd(html: string): any | null {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return null;
  for (const block of blocks) {
    const json = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    let data: any;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    // 단일 객체 / @graph 배열 / 배열 모두 대응
    const candidates: any[] = [];
    const collect = (d: any) => {
      if (!d) return;
      if (Array.isArray(d)) d.forEach(collect);
      else if (typeof d === 'object') {
        if (Array.isArray(d['@graph'])) d['@graph'].forEach(collect);
        candidates.push(d);
      }
    };
    collect(data);
    const recipe = candidates.find(d => {
      const type = d['@type'];
      return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
    });
    if (recipe) return recipe;
  }
  return null;
}

/** JSON-LD Recipe 객체 → ImportedRecipe */
function toImported(recipe: any, sourceUrl: string): ImportedRecipe {
  const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
    .map((s: any) => (typeof s === 'string' ? splitIngredient(s) : null))
    .filter(Boolean) as {name: string; amount: string}[];
  const steps = parseInstructions(recipe.recipeInstructions);
  const yieldRaw = recipe.recipeYield;
  const servings = Array.isArray(yieldRaw) ? String(yieldRaw[0] ?? '') : (yieldRaw != null ? String(yieldRaw) : undefined);
  return {
    title: (recipe.name || '').trim(),
    servings: servings?.trim() || undefined,
    imageUrl: firstImage(recipe.image),
    ingredients,
    steps,
    sourceUrl,
  };
}

/**
 * URL에서 레시피를 가져온다. JSON-LD Recipe가 없으면 에러.
 * @throws 파싱 실패 / 네트워크 실패 / CORS 차단 시
 */
export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('INVALID_URL');
  }
  // 웹(브라우저)은 CORS 때문에 외부 사이트 직접 fetch 불가 → 같은 오리진의 프록시(/importProxy) 경유.
  // 네이티브(iOS/Android)는 CORS가 없어 대상 URL을 직접 fetch.
  const isWeb = typeof document !== 'undefined';
  const fetchUrl = isWeb ? `/importProxy?url=${encodeURIComponent(trimmed)}` : trimmed;
  let html: string;
  try {
    const res = await fetch(fetchUrl, {
      headers: {
        // 일부 사이트가 봇 UA를 차단 → 일반 브라우저 UA로 (네이티브 직접 fetch 시)
        'User-Agent': 'Mozilla/5.0 (compatible; BakleImporter/1.0)',
      },
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    html = await res.text();
  } catch (e: any) {
    throw new Error(e?.message?.includes('HTTP_') ? e.message : 'FETCH_FAILED');
  }
  const recipe = findRecipeJsonLd(html);
  if (!recipe) throw new Error('NO_RECIPE_DATA');
  const imported = toImported(recipe, trimmed);
  if (!imported.title && imported.ingredients.length === 0 && imported.steps.length === 0) {
    throw new Error('NO_RECIPE_DATA');
  }
  return imported;
}
