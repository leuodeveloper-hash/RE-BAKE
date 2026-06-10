import React, {useEffect, useRef, useState} from 'react';
import {Animated, BackHandler, Dimensions, Easing, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {FloatingNavBar, navPillStyle, NAV_PILL_HEIGHT} from '@components/Navigation';
import {GlassContainer, MAX_CONTENT_WIDTH} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconChevronLeft} from '@components/Icon/IconIndex';
import {parseSession} from '@utils/session';
import {buildPaperPreview} from '@utils/recipePaperPreview';
import type {Recipe} from '../../types/recipe';
import {PackBoard, type PackBoardItem} from './PackBoard';
import type {PackOriginRect} from './RecipePack';

export interface MethodExpandOverlayProps {
  method: string;
  /** 전체 공법 목록 (오버레이 안에서 셀렉트로 전환) */
  methods: {method: string; items: Recipe[]}[];
  origin: PackOriginRect;
  onClose: () => void;
  onRecipePress?: (recipeId: string) => void;
}

export function MethodExpandOverlay({method, methods, origin, onClose, onRecipePress}: MethodExpandOverlayProps) {
  const styles = useThemedStylesV2(createStyles);
  const progress = useRef(new Animated.Value(0)).current;
  const [closing, setClosing] = useState(false);
  const [boardWidth, setBoardWidth] = useState(0);
  const [active, setActive] = useState(method);
  const [showMethodMenu, setShowMethodMenu] = useState(false);

  const recipes = methods.find(m => m.method === active)?.items ?? [];
  const methodMenuItems = methods.map(m => ({id: m.method, label: m.method}));

  const {width: W, height: H} = Dimensions.get('window');
  const originCx = origin.x + origin.width / 2;
  const originCy = origin.y + origin.height / 2;
  const startScale = origin.width > 0 ? Math.max(0.12, origin.width / W) : 0.2;

  // 도착 화면: 해당 공법 레시피들을 흩뿌림 (각 레시피 = 카드 1장)
  // 서브타이틀: 북이름 · N개의 회차 (회차 2개 이상일 때만)
  const items: PackBoardItem[] = recipes.map(r => {
    const total = parseSession(r.session).total;
    const sessionLabel = total > 1 ? `${total}개의 회차` : '';
    const subtitle = [r.cookbook || '', sessionLabel].filter(Boolean).join(' · ');
    return {
      id: r.id,
      title: r.title,
      subtitle,
      cards: [{imageUrl: r.imageUri, title: r.title, paperPreview: buildPaperPreview(r)}],
      onPress: () => onRecipePress?.(r.id),
    };
  });

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    Animated.timing(progress, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  // Android 하드웨어 뒤로가기
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  });

  const handleBoardLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== boardWidth) setBoardWidth(w);
  };

  // 배경(다른 팩)이 빠르게 사라지는 페이드
  const panelOpacity = progress.interpolate({inputRange: [0, 0.35, 1], outputRange: [0, 1, 1]});

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View style={[styles.panel, {opacity: panelOpacity}]}>
        <FloatingNavBar
          left={
            <View style={styles.navLeftRow}>
              <GlassContainer contentStyle={navPillStyle}>
                <IconButton icon={IconChevronLeft} onPress={close} variant="ghost-secondary" size="medium" />
              </GlassContainer>
              <View>
                <GlassContainer contentStyle={navPillStyle}>
                  <Selector
                    label={active}
                    showDropdown
                    onPress={() => setShowMethodMenu(prev => !prev)}
                  />
                </GlassContainer>
                <Menu
                  items={methodMenuItems}
                  selectedId={active}
                  onSelect={id => { setShowMethodMenu(false); setActive(id); }}
                  visible={showMethodMenu}
                  style={styles.methodMenu}
                />
              </View>
            </View>
          }
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.boardWrap} onLayout={handleBoardLayout}>
            {boardWidth > 0 && <PackBoard items={items} width={boardWidth} entrance={!closing} />}
          </View>
          {recipes.length === 0 && <Text style={styles.empty}>레시피가 없습니다.</Text>}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  root: {
    zIndex: 100,
    elevation: 100,
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors['surface/normal'],
  },
  navLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titlePill: {
    ...navPillStyle,
    paddingHorizontal: Spacing.md,
  },
  navTitle: {
    ...Typography.label['large - semibold'],
    color: colors['foreground/on-surface'],
  },
  methodMenu: {
    position: 'absolute',
    top: NAV_PILL_HEIGHT + Spacing.xs,
    left: 0,
    zIndex: 20,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: 80,
    paddingBottom: 120,
  },
  boardWrap: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  empty: {
    ...Typography.label.large,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
