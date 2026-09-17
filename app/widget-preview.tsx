import React, {useCallback, useState} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {Tabs} from '@components/Tabs';
import {InlineBanner} from '@components/InlineBanner';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {IconArrowLeft, IconClockFilled, IconUndo} from '@components/Icon/IconIndex';
import {previewExamWidget, restoreExamWidget, type WidgetPreviewCase, type PreviewDiscipline} from '@utils/examWidgetSync';

/**
 * 위젯 미리보기 (어드민 전용 도구).
 *
 * 접수·시험 D-day 배너는 실제 날짜가 와야 보이므로 확인이 어렵다.
 * 여기서 상태를 고르면 위젯 데이터를 그 상태로 덮어쓰고 새로고침하므로,
 * 홈 화면으로 나가면 바로 확인할 수 있다.
 *
 * 실제 시험 데이터를 덮어쓰기 때문에, 확인이 끝나면 "실제 일정으로 되돌리기"를 눌러야 한다.
 */

interface PreviewItem {
  kind: WidgetPreviewCase;
  titleKey: string;
}

const PREVIEW_ITEMS: PreviewItem[] = [
  {kind: 'registrationTomorrow', titleKey: 'widgetPreview.registrationTomorrow'},
  {kind: 'registrationToday', titleKey: 'widgetPreview.registrationToday'},
  {kind: 'examTomorrow', titleKey: 'widgetPreview.examTomorrow'},
  {kind: 'examToday', titleKey: 'widgetPreview.examToday'},
];

export default function WidgetPreviewRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();
  const [active, setActive] = useState<WidgetPreviewCase | null>(null);
  const [discipline, setDiscipline] = useState<PreviewDiscipline>('pastry');

  const handlePreview = useCallback((kind: WidgetPreviewCase) => {
    if (Platform.OS !== 'ios') {
      showSnackbar(t('widgetPreview.iosOnly'));
      return;
    }
    previewExamWidget(kind, discipline);
    setActive(kind);
    showSnackbar(t('widgetPreview.applied'));
  }, [showSnackbar, t, discipline]);

  const handleRestore = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      showSnackbar(t('widgetPreview.iosOnly'));
      return;
    }
    await restoreExamWidget();
    setActive(null);
    showSnackbar(t('widgetPreview.restored'));
  }, [showSnackbar, t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer style={styles.section}>
            <InlineBanner label={t('widgetPreview.guide')} />
          </ContentContainer>

          <ContentContainer style={styles.section}>
            <SectionHeader title={t('widgetPreview.discipline')} />
            <Tabs
              tabs={[
                {id: 'pastry', label: t('widgetPreview.pastry')},
                {id: 'baking', label: t('widgetPreview.baking')},
              ]}
              selectedId={discipline}
              onSelect={id => {
                const next = id as PreviewDiscipline;
                setDiscipline(next);
                // 이미 적용된 상태가 있으면 새 종목으로 다시 적용 — 토글만 눌러도 위젯이 바뀐다
                if (active && Platform.OS === 'ios') previewExamWidget(active, next);
              }}
              fullWidth
            />
          </ContentContainer>

          <ContentContainer style={styles.section}>
            <SectionHeader title={t('widgetPreview.states')} />
            <Card>
              {PREVIEW_ITEMS.map((item, i) => (
                <ListItem
                  key={item.kind}
                  title={t(item.titleKey)}
                  leading={{type: 'icon', icon: IconClockFilled}}
                  showDivider={i < PREVIEW_ITEMS.length - 1}
                  onPress={() => handlePreview(item.kind)}
                  // 지금 적용된 상태를 표시 — 어떤 걸 눌렀는지 잊기 쉽다
                  trailing={active === item.kind ? {type: 'icon', icon: IconClockFilled} : undefined}
                />
              ))}
            </Card>
          </ContentContainer>

          <ContentContainer style={styles.section}>
            <Card>
              <ListItem
                title={t('widgetPreview.restore')}
                leading={{type: 'icon', icon: IconUndo}}
                showDivider={false}
                onPress={handleRestore}
              />
            </Card>
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        left={<NavPillButton icon={IconArrowLeft} onPress={() => router.back()} />}
      />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/normal'],
    },
    safeArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: Spacing.xl,
    },
    section: {
      marginBottom: Spacing.lg,
    },
  });
