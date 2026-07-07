import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {IconArrowLeft} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {useTranslation} from '@contexts/LanguageContext';

export default function TermsScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <Text style={styles.title}>{t('terms.title')}</Text>
            <Text style={styles.updated}>{t('terms.lastUpdated')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section1Title')}</Text>
            <Text style={styles.body}>{t('terms.section1Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section2Title')}</Text>
            <Text style={styles.body}>{t('terms.section2Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section3Title')}</Text>
            <Text style={styles.body}>{t('terms.section3Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section4Title')}</Text>
            <Text style={styles.body}>{t('terms.section4Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section5Title')}</Text>
            <Text style={styles.body}>{t('terms.section5Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section6Title')}</Text>
            <Text style={styles.body}>{t('terms.section6Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section7Title')}</Text>
            <Text style={styles.body}>{t('terms.section7Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section8Title')}</Text>
            <Text style={styles.body}>{t('terms.section8Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section9Title')}</Text>
            <Text style={styles.body}>{t('terms.section9Body')}</Text>

            <Text style={styles.sectionTitle}>{t('terms.section10Title')}</Text>
            <Text style={styles.body}>{t('terms.section10Body')}</Text>
          </ContentContainer>

          <View style={{height: 80}} />
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
      paddingBottom: 40,
    },
    title: {
      fontFamily: Typography.headline.small.fontFamily,
      fontSize: Typography.headline.small.fontSize,
      fontWeight: Typography.headline.small.fontWeight as '600',
      lineHeight: Typography.headline.small.lineHeight,
      color: colors['foreground/on-surface'],
      marginTop: FONT_BASELINE_OFFSET,
      marginBottom: Spacing.sm,
    },
    updated: {
      fontFamily: Typography.body.small.fontFamily,
      fontSize: Typography.body.small.fontSize,
      fontWeight: Typography.body.small.fontWeight as '400',
      lineHeight: Typography.body.small.lineHeight,
      color: colors['foreground/on-surface-muted'],
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontFamily: Typography.title.medium.fontFamily,
      fontSize: Typography.title.medium.fontSize,
      fontWeight: Typography.title.medium.fontWeight as '700',
      lineHeight: Typography.title.medium.lineHeight,
      color: colors['foreground/on-surface'],
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
      marginStart: FONT_BASELINE_OFFSET,
    },
    body: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      fontWeight: Typography.body.medium.fontWeight as '400',
      lineHeight: Typography.body.medium.lineHeight,
      color: colors['foreground/on-surface-var'],
    },
  });
