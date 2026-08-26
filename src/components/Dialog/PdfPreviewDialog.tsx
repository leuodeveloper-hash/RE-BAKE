import React, {useCallback} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
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

// Dialog content area = 312 - 16*2 = 280px
const CONTENT_WIDTH = 280;
const PREVIEW_HEIGHT = 380;

export function PdfPreviewDialog({
  visible,
  onClose,
  data,
  html: htmlProp,
  filename: filenameProp,
  onExported,
}: PdfPreviewDialogProps) {
  const styles = useThemedStyles(createStyles);
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
      <View style={styles.previewContainer}>
        {visible && (data || htmlProp) ? (
          <RecipeHtmlPreview
            data={data}
            html={htmlProp}
            width={CONTENT_WIDTH}
            height={PREVIEW_HEIGHT}
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
      height: PREVIEW_HEIGHT,
      borderRadius: Radius['radius-md'],
      overflow: 'hidden',
      backgroundColor: colors['surface/dim'],
    },
  });
