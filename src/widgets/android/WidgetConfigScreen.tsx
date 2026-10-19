import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import type {WidgetConfigurationScreenProps} from 'react-native-android-widget';
import {ThemeProvider} from '@contexts/ThemeContext';
import {LanguageProvider, useTranslation} from '@contexts/LanguageContext';
import {Card} from '@components/Container';
import {MenuItem} from '@components/Menu';
import {Button} from '@components/Button';
import {SectionHeader} from '@components/SectionHeader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {
  DEFAULT_WIDGET_CONFIG, readWidgetChoices, readWidgetConfig, saveWidgetConfig,
  type AndroidWidgetConfig, type AndroidWidgetDday,
} from './androidWidgetData';
import {render} from './widgetTaskHandler';

/**
 * 안드로이드 위젯 설정 — 위젯을 놓을 때·길게 눌러 '설정'할 때 뜬다.
 * 아이폰 위젯 편집과 같은 선택지: 레시피북(전체/북), D-day(가까운 시험/제과/제빵/내 D-day).
 * 앱 화면 밖에서 따로 뜨는 화면이라 테마·언어 공급자를 여기서 감싼다.
 */
export function WidgetConfigScreen(props: WidgetConfigurationScreenProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ConfigBody {...props} />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ConfigBody({widgetInfo, renderWidget, setResult}: WidgetConfigurationScreenProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [cfg, setCfg] = useState<AndroidWidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [choices, setChoices] = useState<{cookbooks: string[]; ddays: AndroidWidgetDday[]}>({cookbooks: [], ddays: []});

  useEffect(() => {
    readWidgetConfig(widgetInfo.widgetId).then(setCfg);
    readWidgetChoices().then(setChoices);
  }, [widgetInfo.widgetId]);

  const save = async () => {
    await saveWidgetConfig(widgetInfo.widgetId, cfg);
    renderWidget(await render(widgetInfo));
    setResult('ok');
  };

  const books = [{id: '', label: t('widgetConfig.allCookbooks')}, ...choices.cookbooks.map(b => ({id: b, label: b}))];
  const ddays = [
    {id: 'auto', label: t('widgetConfig.nearestExam')},
    {id: 'exam:pastry', label: t('widgetConfig.pastryExam')},
    {id: 'exam:baking', label: t('widgetConfig.bakingExam')},
    ...choices.ddays.map(d => ({id: d.id, label: d.title})),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('widgetConfig.title')}</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title={t('widgetConfig.cookbook')} />
        <Card style={styles.card}>
          {books.map(o => (
            <MenuItem key={o.id || 'all'} id={o.id || 'all'} label={o.label} selected={cfg.cookbook === o.id}
              onPress={() => setCfg(c => ({...c, cookbook: o.id}))} />
          ))}
        </Card>
        <SectionHeader title={t('widgetConfig.dday')} />
        <Card style={styles.card}>
          {ddays.map(o => (
            <MenuItem key={o.id} id={o.id} label={o.label} selected={cfg.dday === o.id}
              onPress={() => setCfg(c => ({...c, dday: o.id}))} />
          ))}
        </Card>
      </ScrollView>
      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="soft" style={styles.flex} onPress={() => setResult('cancel')} />
        <Button label={t('widgetConfig.done')} variant="filled" style={styles.flex} onPress={save} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors['surface/normal']},
  title: {...Typography.title.medium, color: colors['foreground/on-surface'], textAlign: 'center', paddingVertical: Spacing.md},
  content: {paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm},
  card: {padding: Spacing.xs},
  actions: {flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md},
  flex: {flex: 1},
});
