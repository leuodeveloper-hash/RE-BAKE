import React, {useMemo} from 'react';
import {Platform, StyleProp, ViewStyle} from 'react-native';
import {RecipePdfData, generateRecipeHtml} from '@utils/generateRecipeHtml';

/** HTML 소스의 기본 가로 폭 (생성된 HTML 본문 너비) */
const HTML_SOURCE_WIDTH = 600;

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
    const paper = scrollEnabled
      ? 'body { background: #e9eaec !important; padding: 16px !important; } .recipe-page { background: #fff !important; padding: 28px 24px !important; margin: 0 auto 16px !important; border-radius: 8px; min-height: 0 !important; aspect-ratio: auto 210 / 297; }'
      : '';
    return html.replace(
      '</style>',
      `body { zoom: ${scale}; } ${paper}</style>`,
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
