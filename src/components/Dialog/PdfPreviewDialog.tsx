import React, {useCallback} from 'react';
import {Platform, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Spacing} from '@constants/spacing';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {RecipeHtmlPreview} from '@components/Recipe/RecipeHtmlPreview';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {
  RecipePdfData,
  generateRecipeHtml,
} from '@utils/generateRecipeHtml';

export interface PdfPreviewDialogProps {
  visible: boolean;
  onClose: () => void;
  /** 단일 레시피 데이터 (html 미제공 시 사용) */
  data?: RecipePdfData;
  /** 직접 전달하는 HTML (data 대신 사용) */
  html?: string;
  /** 파일명 (html 직접 전달 시 사용, 기본값: 'recipes') */
  filename?: string;
  /** 내보내기 완료 — 등급별 사용 횟수를 세는 데 쓴다 */
  onExported?: () => void;
}

// 팝업 내용 폭 = 카드 312 − 내용 좌우 여백(lg)×2 — 16으로 잡아 280이면 실제 내용 폭보다 넓어 오른쪽으로 삐져나갔다
const CONTENT_WIDTH = 312 - Spacing.lg * 2;
// 미리보기 높이 — 화면이 허락하는 만큼(380은 한 화면에 몇 줄 안 보여 잘려 보였다)
// 팝업 머리(헤더)·버튼·위아래 여백을 뺀 높이 — 안전영역(노치·홈 막대)까지 빼야 화면 밖으로 안 넘친다
const DIALOG_CHROME = 200;
// 미리보기 칸 = 종이(A4) 한 장 높이 — 미리보기 둘레 여백(원본 16px)이 축소 배율만큼 줄어든 값을 더한다.
// 화면이 작으면 안전영역 안으로 줄인다(넘치는 건 스크롤)
const ONE_PAGE_HEIGHT = (() => {
  const pad = (16 * CONTENT_WIDTH) / 600;
  return Math.round((CONTENT_WIDTH - pad * 2) * (297 / 210) + pad * 2);
})();
const previewHeight = (windowHeight: number, safeTop = 0, safeBottom = 0) =>
  Math.max(240, Math.min(ONE_PAGE_HEIGHT, windowHeight - safeTop - safeBottom - DIALOG_CHROME));

export function PdfPreviewDialog({
  visible,
  onClose,
  data,
  html: htmlProp,
  filename: filenameProp,
  onExported,
}: PdfPreviewDialogProps) {
  const styles = useThemedStyles(createStyles);
  const {height: windowHeight} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pvH = previewHeight(windowHeight, insets.top, insets.bottom);
  const {t} = useTranslation();
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
    onExported?.();
    onClose();
  }, [html, pdfFilename, onClose, onExported]);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('pdfPreview.title')}
      headerType="center"
      showCloseButton
      actions={
        <>
          <Button label={t('pdfPreview.cancel')} variant="soft" onPress={onClose} />
          <Button label={t('pdfPreview.download')} variant="filled" onPress={handleDownload} />
        </>
      }>
      <View style={[styles.previewContainer, {height: pvH}]}>
        {visible && (data || htmlProp) ? (
          <RecipeHtmlPreview
            data={data}
            html={htmlProp}
            width={CONTENT_WIDTH}
            height={pvH}
            scrollEnabled
          />
        ) : null}
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    previewContainer: {
      width: CONTENT_WIDTH,
      borderRadius: Radius['radius-md'],
      overflow: 'hidden',
      backgroundColor: colors['surface/dim'],
    },
  });
