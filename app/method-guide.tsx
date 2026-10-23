import {PageScrollView} from '@components/Page';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {ContentContainer, Card, CardItem} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {MetaLine} from '@components/MetaLine';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconAdd, IconClose, IconEdit} from '@components/Icon/IconIndex';
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
  // 기본 3단(넓은 화면) — 폰은 칸이 좁아 설명이 안 보이니 1단, 그 사이는 2단
  const {width} = useWindowDimensions();
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const rows: typeof methods[] = [];
  for (let i = 0; i < methods.length; i += columns) rows.push(methods.slice(i, i + columns));

  // 용어 카드 — 회고 카드(ReviewCard)와 같은 구성: 공통 Card 안에 머리줄(아이콘·이름·편집) + 본문(설명)
  const renderTerm = (m: (typeof methods)[number]) => (
  <Animated.View
    key={m.id ?? m.name}
    style={[styles.termCard, m.name === target && [styles.targetCard, {backgroundColor: highlight.interpolate({inputRange: [0, 1], outputRange: ['transparent', colors['fill/accent'] as string]})}]]}
    onLayout={e => onCardLayout(m.name, e.nativeEvent.layout.y)}>
    <Card style={styles.termCardFill}>
      <ListItem
        onPress={openMethod ? () => openMethod(m, {withViewAll: false}) : undefined}
        // 어드민 — 길게 눌러 바로 고치기
        onLongPress={openTermEditor ? () => openTermEditor(m) : undefined}
        title={m.name}
        // 머리줄과 설명 사이 구분선 없이 한 덩어리로
        showDivider={false}
        trailing={openTermEditor ? {type: 'iconButton', icon: IconEdit, variant: 'ghost-secondary', size: 'medium', onPress: () => openTermEditor(m)} : undefined}
      />
      {/* 본문 — 머리줄 바로 아래(위 여백 없이). ListItem은 위아래 여백을 늘 줘서 흰 칸(CardItem)에 좌우·아래만 준다 */}
      <CardItem style={styles.termBodyItem}>
        <Pressable disabled={!openMethod} onPress={openMethod ? () => openMethod(m, {withViewAll: false}) : undefined}>
          <View style={styles.termBody}>
            {/* 링크로 찾아온 공법은 설명 전체, 나머지는 4줄 자리(카드 높이 통일) */}
            <Text style={[styles.termText, m.name !== target && styles.termTextFixed]} numberOfLines={m.name === target ? 0 : 4}>{m.description}</Text>
            {/* 맨 아래 메타 — 분류(제과·제빵) */}
            <MetaLine items={[TABS.find(x => x.id === (m.category ?? 'pastry'))?.label]} textStyle={styles.termMeta} />
          </View>
        </Pressable>
      </CardItem>
    </Card>
  </Animated.View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <PageScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* 리스트 화면 — 페이지 좌우 여백 없음, 줄이 안쪽 16을 갖는다 */}
          <ContentContainer horizontalPadding={false}>
            {/* 제과/제빵 — 앱바 아래 왼쪽 토날 피커(탭 대신). 메뉴는 피커 기준 왼쪽 정렬로 아래에 */}
            <View style={styles.pickerWrap}>
              <Selector
                label={TABS.find(x => x.id === category)?.label ?? ''}
                showDropdown
                // 시험 일정 상단과 같은 피커(둥근 필)
                variant="circle"
                forcePressed={categoryMenu}
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

            {/* 단마다 카드 — 폰 1단, 넓으면 2·3단. 같은 줄 카드는 높이를 맞춘다 */}
            <View style={styles.grid}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {Array.from({length: columns}).map((_, ci) => (
                    <View key={ci} style={styles.gridCell}>{row[ci] ? renderTerm(row[ci]) : null}</View>
                  ))}
                </View>
              ))}
            </View>
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
    grid: {paddingHorizontal: Spacing.md, gap: Spacing.md},
    gridRow: {flexDirection: 'row', gap: Spacing.md},
    gridCell: {flex: 1, minWidth: 0},
    termCard: {flex: 1},
    termCardFill: {flex: 1},
    termText: {...Typography.body.medium, color: _colors['foreground/on-surface-var']},
    termBody: {gap: Spacing.sm},
    // 좌우는 머리줄 글자 시작선과 같게 — ListItem 바깥 12 + 글 칸 안쪽 8 = 20
    termBodyItem: {flex: 1, paddingHorizontal: Spacing.smd + Spacing.sm, paddingBottom: Spacing.md},
    termMeta: {...Typography.caption.large, color: _colors['foreground/on-surface-muted']},
    // 카드 높이 통일 — 설명이 짧아도 4줄 자리를 잡는다(줄마다·줄끼리 모두 같은 높이)
    termTextFixed: {minHeight: (Typography.body.medium.lineHeight as number) * 4},
    // 흰 카드가 칸 높이를 채워 줄마다 높이가 맞게
    targetCard: {
      borderRadius: Radius['radius-lg'],
    },
    // 피커 + 메뉴 — 메뉴가 목록 위로 뜨게(드롭다운 z-index 3종)
    pickerWrap: {
      marginLeft: Spacing.md,
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
