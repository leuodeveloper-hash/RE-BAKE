import {PageScrollView} from '@components/Page';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer} from '@components/Container';
import {RecipeCard} from '@components/Recipe/RecipeCard/RecipeCard';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {IconAdd, IconClose, IconProcess} from '@components/Icon/IconIndex';
import {type MethodCategory} from '@constants/bakingMethods';
import {useDictionary} from '@hooks/useDictionary';
import {goBackOr} from '@utils/navigation';
import {useRecipeLink} from '@contexts/RecipeLinkContext';

export default function MethodGuideRoute() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const {t} = useTranslation();
  // ?name=시폰법 — 본문 공법 링크로 들어오면 그 공법이 있는 탭을 고르고, 카드까지 내려가 잠깐 강조
  const {name: target} = useLocalSearchParams<{name?: string}>();
  // 사전 — 기본 용어 + 어드민이 고친·추가한 항목(서버). 바뀌면 바로 다시 그린다
  const dictionary = useDictionary();
  const [category, setCategory] = useState<MethodCategory>(
    target && dictionary.find(m => m.name === target)?.category === 'bakery' ? 'bakery' : 'pastry',
  );
  const scrollRef = useRef<ScrollView>(null);
  const [categoryMenu, setCategoryMenu] = useState(false);
  // 항목을 누르면 사전 시트(이미 사전이라 '전체 보기' 버튼은 없이)
  const {openMethod, openTermEditor} = useRecipeLink();
  const cardY = useRef<Record<string, number>>({});
  const highlight = useRef(new Animated.Value(0)).current;
  const scrolledTo = useRef<string | null>(null);
  const onCardLayout = (name: string, y: number) => {
    cardY.current[name] = y;
    if (name !== target || scrolledTo.current === target) return;
    scrolledTo.current = target;
    scrollRef.current?.scrollTo({y: Math.max(0, y - Spacing.md), animated: true});
    highlight.setValue(1);
    Animated.timing(highlight, {toValue: 0, duration: 1600, delay: 400, useNativeDriver: false}).start();
  };
  // 같은 화면에서 다른 공법으로 다시 들어오면 다시 찾기
  useEffect(() => { scrolledTo.current = null; }, [target]);

  const TABS = useMemo(() => [
    {id: 'pastry', label: t('methodGuide.pastry')},
    {id: 'bakery', label: t('methodGuide.bakery')},
  ], [t]);

  const methods = dictionary.filter(m => (m.category ?? 'pastry') === category);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <PageScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          <ContentContainer>
            {/* 제과/제빵 — 앱바 아래 왼쪽 토날 피커(탭 대신). 메뉴는 피커 기준 왼쪽 정렬로 아래에 */}
            <View style={styles.pickerWrap}>
              <Selector
                label={TABS.find(x => x.id === category)?.label ?? ''}
                showDropdown
                variant="tonal"
                onPress={() => setCategoryMenu(v => !v)}
              />
              <Menu
                items={TABS}
                selectedId={category}
                visible={categoryMenu}
                onSelect={id => { setCategoryMenu(false); setCategory(id as MethodCategory); }}
                onClose={() => setCategoryMenu(false)}
                style={styles.pickerMenu}
              />
            </View>

            {methods.map((m, i) => (
              <Animated.View
                key={m.id ?? m.name}
                onLayout={e => onCardLayout(m.name, e.nativeEvent.layout.y)}
                style={m.name === target ? [styles.targetCard, {backgroundColor: highlight.interpolate({inputRange: [0, 1], outputRange: ['transparent', colors['fill/accent'] as string]})}] : undefined}>
                <RecipeCard
                  key={m.id ?? m.name}
                  onPress={openMethod ? () => openMethod(m, {withViewAll: false}) : undefined}
                  // 어드민 — ⋮(길게 누르기도 같음)로 바로 고치기
                  onMenuPress={openTermEditor ? () => openTermEditor(m) : undefined}
                  title={m.name}
                  customSubtitle={m.description}
                  // 링크로 찾아온 공법은 설명 전체를 보여준다
                  subtitleNumberOfLines={m.name === target ? undefined : 2}
                  layout="list"
                  placeholderIcon={IconProcess}
                  placeholderIconColor={colors['custom/lime-var']}
                  hideDivider={i === methods.length - 1}
                />
              </Animated.View>
            ))}
          </ContentContainer>
        </PageScrollView>
      </SafeAreaView>

      <FloatingNavBar
        title={t('methodGuide.title')}
        left={
          <NavPillButton icon={IconClose} onPress={() => goBackOr(router)} />
        }
        // 어드민 — 용어 추가(보던 분류로)
        right={openTermEditor ? <NavPillButton icon={IconAdd} onPress={() => openTermEditor(null, category)} /> : undefined}
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
    targetCard: {
      borderRadius: Radius['radius-lg'],
    },
    // 피커 + 메뉴 — 메뉴가 목록 위로 뜨게(드롭다운 z-index 3종)
    pickerWrap: {
      alignSelf: 'flex-start',
      marginBottom: Spacing.md,
      zIndex: 20,
      elevation: 20,
      overflow: 'visible',
    },
    pickerMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: Spacing.xs,
      zIndex: 20,
    },
  });
