import React, {useCallback} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {
  RecipePdfData,
  generateRecipeHtml,
} from '@utils/generateRecipeHtml';
import {IconImport} from '@components/Icon/IconIndex';

export interface PdfPreviewDialogProps {
  visible: boolean;
  onClose: () => void;
  /** 단일 레시피 데이터 (html 미제공 시 사용) */
  data?: RecipePdfData;
  /** 직접 전달하는 HTML (data 대신 사용) */
  html?: string;
  /** 파일명 (html 직접 전달 시 사용, 기본값: 'recipes') */
  filename?: string;
}

// Dialog content area = 312 - 16*2 = 280px
const CONTENT_WIDTH = 280;
const HTML_WIDTH = 600;
const SCALE = CONTENT_WIDTH / HTML_WIDTH;
const PREVIEW_HEIGHT = 380;

// Native-only: WebView (react-native-webview has web support, safe to resolve)
let NativeWebView: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch {}
}

export function PdfPreviewDialog({
  visible,
  onClose,
  data,
  html: htmlProp,
  filename: filenameProp,
}: PdfPreviewDialogProps) {
  const styles = useThemedStyles(createStyles);
  const html = htmlProp ?? (data ? generateRecipeHtml(data) : '');
  const pdfFilename = filenameProp ?? data?.title ?? 'recipes';

  const handleDownload = useCallback(async () => {
    if (Platform.OS === 'web') {
      const titleHtml = html.replace(
        '<head>',
        `<head><title>${pdfFilename}</title>`,
      );

      // 부모 페이지 title을 교체 (Chrome은 iframe print 시 부모 title을 파일명으로 사용)
      const originalTitle = document.title;
      document.title = pdfFilename;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.opacity = '0';
      document.body.appendChild(printFrame);

      // document.write로 iframe에 직접 HTML 작성 (title 포함)
      const frameDoc =
        printFrame.contentDocument ??
        printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(titleHtml);
        frameDoc.close();
      }

      // 렌더링 대기 후 인쇄 (print()는 대화상자 닫힐 때까지 블로킹)
      await new Promise<void>(resolve => {
        setTimeout(() => {
          printFrame.contentWindow?.print();
          resolve();
        }, 300);
      });

      // 인쇄 대화상자 닫힌 후 복원
      document.title = originalTitle;
      setTimeout(() => document.body.removeChild(printFrame), 1000);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Print = require('expo-print');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sharing = require('expo-sharing');
      const {uri} = await Print.printToFileAsync({html});
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${pdfFilename}.pdf`,
        UTI: 'com.adobe.pdf',
      });
    }
    onClose();
  }, [html, pdfFilename, onClose]);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconImport}
      avatarColor="gray"
      title="PDF 미리보기"
      showCloseButton
      actions={
        <>
          <Button label="취소" variant="soft" onPress={onClose} />
          <Button label="다운로드" variant="filled" onPress={handleDownload} />
        </>
      }>
      <View style={styles.previewContainer}>
        {visible && <PreviewContent html={html} />}
      </View>
    </Dialog>
  );
}

function PreviewContent({html}: {html: string}) {
  // body에 zoom 적용하여 축소 미리보기
  const previewHtml = html.replace(
    '</style>',
    `body { zoom: ${SCALE}; }</style>`,
  );

  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      srcDoc: previewHtml,
      style: {
        width: CONTENT_WIDTH,
        height: PREVIEW_HEIGHT,
        border: 'none',
        display: 'block',
      },
    });
  }

  if (!NativeWebView) return null;

  return (
    <NativeWebView
      originWhitelist={['*']}
      source={{html: previewHtml}}
      style={{width: CONTENT_WIDTH, height: PREVIEW_HEIGHT}}
      scrollEnabled
    />
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    previewContainer: {
      width: CONTENT_WIDTH,
      height: PREVIEW_HEIGHT,
      borderRadius: Radius['radius-md'],
      overflow: 'hidden',
      backgroundColor: colors['surface-surfacedim'],
    },
  });
