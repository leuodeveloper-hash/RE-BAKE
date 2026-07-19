import React from 'react';
import {Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {SectionHeader} from '@components/SectionHeader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconArrowLeft} from '@components/Icon/IconIndex';

/**
 * "홈 화면 위젯" 안내 화면. 로그인 없이도 접근 가능(시험 알림과 동일).
 * 위젯은 iOS 홈 화면에서 직접 추가하므로, 추가 방법을 단계별로 안내한다.
 */
export default function WidgetGuideRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();

  const steps = [
    t('widgetGuide.step1'),
    t('widgetGuide.step2'),
    t('widgetGuide.step3'),
    t('widgetGuide.step4'),
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <SectionHeader title={t('widgetGuide.title')} />
            <Card>
              {steps.map((step, i) => (
                <ListItem
                  key={i}
                  title={step}
                  leading={{type: 'number', value: i + 1}}
                  showDivider={i < steps.length - 1}
                />
              ))}
            </Card>
            <Text style={styles.helper}>
              {Platform.OS === 'android'
                ? t('widgetGuide.androidHelper')
                : t('widgetGuide.helper')}
            </Text>
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
      backgroundColor: colors['surface/dim'],
    },
    safeArea: {flex: 1},
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: 80},
    helper: {
      ...Typography.body.small,
      color: colors['foreground/on-surface-muted'],
      paddingHorizontal: Spacing.smd,
      marginTop: Spacing.smd,
    },
  });
