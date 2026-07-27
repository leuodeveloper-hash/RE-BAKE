import React, {useRef, useState} from 'react';
import {Animated, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {RecipePack, BOOK_PACK_WIDTH} from './RecipePack';
import {RetrospectiveNote} from './RetrospectiveNote';
import type {PackBoardItem} from './PackBoard';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconShare, IconLink} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';

const GAP = 24;
// 가운데 카드 외 양옆은 축소·반투명으로 살짝만 보이게
const SIDE_SCALE = 0.82;
const SIDE_OPACITY = 0.55;

export interface CookbookCarouselProps {
  items: PackBoardItem[];
  /** 현재 가운데 책을 스토리로 공유 (없으면 버튼 숨김) */
  onShareStory?: (item: PackBoardItem) => void;
  /** 현재 가운데 책 링크 복사 (없으면 버튼 숨김) */
  onShareLink?: (item: PackBoardItem) => void;
}

/**
 * 레시피 북 전용 센터 카드 캐러셀.
 * 가운데 한 권을 크게, 양옆을 살짝 보여주며 한 권씩 스냅 스크롤.
 * 카드 탭 시 RecipePack이 자기 위치를 measure해 onPress(rect)로 펼침을 띄운다(기존 동작).
 * 책 표지 아래에 스토리 공유 / 링크 복사 버튼(콜백 있을 때).
 */
export function CookbookCarousel({items, onShareStory, onShareLink}: CookbookCarouselProps) {
  const {width} = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  const ITEM_W = BOOK_PACK_WIDTH;
  const SNAP = ITEM_W + GAP;
  const sidePad = Math.max(0, (width - ITEM_W) / 2);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SNAP));
  };

  const activeItem = items[activeIndex];
  // 공유는 실제 레시피 북(book variant)에만 — 회고 노트 등은 제외
  const showShare = !!activeItem && activeItem.variant !== 'note' && (!!onShareStory || !!onShareLink);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{paddingHorizontal: sidePad, alignItems: 'center'}}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: true},
        )}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}>
        {items.map((item, i) => {
          const center = i * SNAP;
          const inputRange = [center - SNAP, center, center + SNAP];
          const scale = scrollX.interpolate({inputRange, outputRange: [SIDE_SCALE, 1, SIDE_SCALE], extrapolate: 'clamp'});
          const opacity = scrollX.interpolate({inputRange, outputRange: [SIDE_OPACITY, 1, SIDE_OPACITY], extrapolate: 'clamp'});
          return (
            <Animated.View
              key={item.id}
              style={{
                width: ITEM_W,
                marginRight: i === items.length - 1 ? 0 : GAP,
                transform: [{scale}],
                opacity,
              }}>
              {item.variant === 'note'
                ? <RetrospectiveNote {...item} rotate={0} />
                : <RecipePack {...item} rotate={0} />}
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* 책 표지 아래 공유 액션 — 원형 아이콘 + 라벨 (아바타식) */}
      {showShare && (
        <View style={styles.shareRow}>
          {onShareStory && (
            <Pressable style={styles.shareItem} onPress={() => onShareStory(activeItem)}>
              <View style={styles.shareCircle}>
                <AppIcon icon={IconShare} size="sm" color={colors['foreground/on-surface']} />
              </View>
              <Text style={styles.shareLabel}>{t('cookbookCarousel.shareStory')}</Text>
            </Pressable>
          )}
          {onShareLink && (
            <Pressable style={styles.shareItem} onPress={() => onShareLink(activeItem)}>
              <View style={styles.shareCircle}>
                <AppIcon icon={IconLink} size="sm" color={colors['foreground/on-surface']} />
              </View>
              <Text style={styles.shareLabel}>{t('cookbookCarousel.copyLink')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  shareItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shareCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors['surface/container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    color: colors['foreground/on-surface-muted'],
  },
});
