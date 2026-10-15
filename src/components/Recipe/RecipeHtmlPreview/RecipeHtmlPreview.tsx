import React, {useMemo} from 'react';
import {Platform, StyleProp, ViewStyle} from 'react-native';
import {RecipePdfData, generateRecipeHtml} from '@utils/generateRecipeHtml';

/** HTML 소스의 기본 가로 폭 (생성된 HTML 본문 너비) */
// 미리보기 문서 폭 = A4 폭(210mm ≈ 794px) + 둘레 회색 여백(16×2) — 실제 인쇄와 같은 폭으로 그려야
// 글씨 크기·줄바꿈이 종이 대비 같은 비율로 보인다(600px로 그리면 글씨가 종이에 비해 커 보였다)
const A4_PX = 794;
const PAPER_GAP = 16;
const HTML_SOURCE_WIDTH = A4_PX + PAPER_GAP * 2;

let NativeWebView: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch {}
}

export interface RecipeHtmlPreviewProps {
  /** 미리보기에 표시할 레시피 데이터 (html 미제공 시 사용) */
  data?: RecipePdfData;
  /** 직접 전달하는 HTML (data 대신 사용) */
  html?: string;
  /** 미리보기 가로 폭 (px). HTML이 이 폭에 맞춰 zoom 처리됨 */
  width: number;
  /** 미리보기 세로 높이 (px). 초과분은 잘림 */
  height: number;
  /** 사용자 스크롤 허용 여부 (기본: false) */
  scrollEnabled?: boolean;
  /** 컨테이너 스타일 (border, borderRadius 등) */
  style?: StyleProp<ViewStyle>;
}

/**
 * 레시피 PDF용 HTML을 WebView/iframe으로 그대로 렌더하는 공통 미리보기.
 * PdfPreviewDialog와 RecipeCard 썸네일이 동일한 generateRecipeHtml 결과를 사용하도록 한다.
 */
export function RecipeHtmlPreview({data, html: htmlProp, width, height, scrollEnabled = false, style}: RecipeHtmlPreviewProps) {
  const previewHtml = useMemo(() => {
    const scale = width / HTML_SOURCE_WIDTH;
    const html = htmlProp ?? (data ? generateRecipeHtml(data) : '');
    if (!html) return '';
    // 크게 보는 미리보기(스크롤)는 종이 한 장처럼 — 흰 종이, 둘레 여백. 작게 줄이면 글이 종이 끝에 붙어 잘려 보였다
    // 종이 비율(A4)은 '최소' 높이 — min-height:0이면 높이가 A4로 고정돼, 긴 레시피 글이 종이 밖으로
    // 흘러나와 다음 장 글자 위에 겹쳤다. min-height:auto면 내용만큼 늘어난다.
    const paper = scrollEnabled
      // 종이 안쪽 여백은 인쇄와 같은 14mm(PDF 문서 값 그대로) — 미리보기만 따로 덮어쓰면 비율이 달라졌다
      ? `body { background: #e9eaec !important; padding: ${PAPER_GAP}px !important; } .recipe-page { background: #fff !important; width: ${A4_PX}px !important; max-width: none !important; margin: 0 auto ${PAPER_GAP}px !important; border-radius: 8px; min-height: auto !important; aspect-ratio: auto 210 / 297; }`
      : '';
    // 아이폰(WKWebView)은 CSS zoom을 걸면 글자 줄 높이 계산이 틀어지고, 작은 글씨를 시스템이
    // 멋대로 키워(text autosizing) 줄이 서로 겹쳐 보였다.
    // 네이티브는 zoom 대신 "600px 폭 문서를 화면 폭에 맞춰 축소"하는 뷰포트로 줄이고, 글자 자동 확대를 끈다.
    // 웹(iframe)은 크롬에서 zoom이 정상이라 그대로 둔다.
    const noAutosize = 'html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }';
    if (Platform.OS !== 'web') {
      return html
        .replace(
          /<meta name="viewport"[^>]*>/,
          `<meta name="viewport" content="width=${HTML_SOURCE_WIDTH}, initial-scale=${scale}, maximum-scale=${scale}, user-scalable=no"/>`,
        )
        .replace('</style>', `${noAutosize} ${paper}</style>`);
    }
    return html.replace(
      '</style>',
      `${noAutosize} body { zoom: ${scale}; } ${paper}</style>`,
    );
  }, [data, htmlProp, width, scrollEnabled]);

  if (!previewHtml) return null;

  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      srcDoc: previewHtml,
      style: {
        width,
        height,
        border: 'none',
        display: 'block',
        pointerEvents: scrollEnabled ? 'auto' : 'none',
      },
      // @ts-ignore — style prop passed through to wrapping for native parity; ignored on web iframe
      'data-style': style,
    });
  }

  if (!NativeWebView) return null;

  return (
    <NativeWebView
      originWhitelist={['*']}
      source={{html: previewHtml}}
      style={[{width, height}, style]}
      scrollEnabled={scrollEnabled}
      pointerEvents={scrollEnabled ? 'auto' : 'none'}
    />
  );
}
