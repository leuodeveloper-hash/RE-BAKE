import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {RecipeCard} from '@components/Recipe/RecipeCard/RecipeCard';
import {Tabs} from '@components/Tabs';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {IconArrowLeft, IconProcess} from '@components/Icon/IconIndex';
import {PASTRY_METHODS, BAKERY_METHODS, type MethodCategory} from '@constants/bakingMethods';

export default function MethodGuideRoute() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const {t} = useTranslation();
  const [category, setCategory] = useState<MethodCategory>('pastry');

  const TABS = useMemo(() => [
    {id: 'pastry', label: t('methodGuide.pastry')},
    {id: 'bakery', label: t('methodGuide.bakery')},
  ], [t]);

  const methods = category === 'pastry' ? PASTRY_METHODS : BAKERY_METHODS;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={{height: 80}} />

          <ContentContainer>
            <View style={styles.tabsWrap}>
              <Tabs
                tabs={TABS}
                selectedId={category}
                onSelect={(id) => setCategory(id as MethodCategory)}
                fullWidth
              />
            </View>

            {methods.map((m, i) => (
              <RecipeCard
                key={m.name}
                title={m.name}
                customSubtitle={m.description}
                subtitleNumberOfLines={2}
                layout="list"
                placeholderIcon={IconProcess}
                placeholderIconColor={colors['custom/lime-var']}
                hideDivider={i === methods.length - 1}
              />
            ))}
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      <FloatingNavBar
        title={t('methodGuide.title')}
        left={
          <NavPillButton icon={IconArrowLeft} onPress={() => router.back()} />
        }
      />
    </View>
  );
}

const createStyles = (_colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: _colors['surface/dim'],
    },
    safeArea: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 80,
    },
    tabsWrap: {
      marginBottom: Spacing.md,
    },
  });
