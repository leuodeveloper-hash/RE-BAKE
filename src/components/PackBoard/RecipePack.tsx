import React, {useRef} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {StackedThumbnail} from '@components/Recipe/RecipeCard';
import {IconLockFilled, IconEyeClosed} from '@components/Icon/IconIndex';
import {type SemanticColors, PrimitiveColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {getElevation} from '@constants/elevation';
import {triggerHaptic} from '@utils/haptics';
import {useTranslation} from '@contexts/LanguageContext';

export const PACK_WIDTH = 220;
/** 레시피 북(책) 팩 폭 — 책만 1.44배 (표지/썸넬/폰트도 동일 비율) */
export const BOOK_PACK_WIDTH = Math.round(PACK_WIDTH * 1.44); // 317
const STACK_HEIGHT = 188; // 카드 키운 만큼 스택 높이도 키움
const THUMB_SIZE = 214; // 팩 카드 크기

// 더미 카드 팬 효과 (뒤 → 앞). 장수별로 좌우 대칭이 되도록 구성.
type Fan = {x: number; y: number; rotate: number};
function fanFor(count: number): Fan[] {
  if (count <= 1) return [{x: 0, y: 0, rotate: 0}];
  if (count === 2) {
    // 좌우 완전 대칭 (한쪽 쏠림 방지)
    return [
      {x: -14, y: 0, rotate: -8},
      {x: 14, y: 0, rotate: 8},
    ];
  }
  // 3장: 뒤 좌/우 대칭 + 정면 중앙(맨 위)
  return [
    {x: -18, y: 5, rotate: -8},
    {x: 18, y: 5, rotate: 8},
    {x: 0, y: 0, rotate: 0},
  ];
}

export interface PackOriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackCardData {
  /** 원격 uri 문자열 또는 require() 로컬 에셋 모듈 */
  imageUrl?: string | number;
  /** 종이에 표시할 레시피 제목 */
  title: string;
  /** 종이를 채울 레시피 미리보기 텍스트 (재료/도구/스텝) */
  paperPreview?: string[];
}

export interface RecipePackProps {
  /** 공법명 */
  title: string;
  /** 서브타이틀 (예: "제과기능사 · 3개") */
  subtitle: string;
  /** 대표 레시피 카드 (최대 3장: 이미지+레시피 종이) */
  cards: PackCardData[];
  /** 탭 시 호출 (확대 애니메이션 원점으로 카드 화면 좌표 전달) */
  onPress?: (rect: PackOriginRect) => void;
  /** 카드 스택 기울기 (deg). 텍스트는 기울지 않고 스택에만 적용 */
  rotate?: number;
  /** 뱃지 pill에 표시할 숫자 (2 이상일 때만 표시 — 회차/개수) */
  count?: number;
  /** pill을 상단(기본) 대신 하단에 배치 (회차 종이용) */
  pillBottom?: boolean;
  /** 뱃지 위치 — 좌상(기본)/우상/좌하/우하/하단중앙. 보드에서 팩별 랜덤 배치용 */
  pillCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  /** pill 페이드용 진행값 (0=숨김 → 1=보임). 회차 종이 접힐 때 서서히 사라지게 */
  pillProgress?: SharedValue<number>;
  /** 뱃지(pill) 왼쪽 아이콘 — 회고 노트/그룹 등 팩 종류 구분용 */
  icon?: React.FC<SvgProps>;
  /** 뱃지 아이콘 색상 */
  iconColor?: string;
  /** 잠긴 레시피 — 뱃지에 자물쇠 표시 */
  locked?: boolean;
  /** 'book' = 레시피 북 전용 책 형태, 'note' = 회고 노트 형태(PackBoard에서 RetrospectiveNote로 렌더) */
  variant?: 'default' | 'book' | 'note';
  /** 책 표지 하단 좌측 부가정보 (예: "3개의 레시피") */
  footerLeft?: string;
  /** 책 표지 하단 우측 부가정보 (예: "2개의 회고") */
  footerRight?: string;
  /** 빈 레시피 북(투명 일러스트 표지) — 표지 배경/테두리/그림자 제거하고 일러스트만 띄움 */
  emptyCover?: boolean;
  /** 비공개(숨김) — 책 표지에 자물쇠 뱃지 (어드민 전용 공식 북 표시) */
  hidden?: boolean;
}

export function RecipePack({title, cards, onPress, rotate = 0, count, pillBottom, pillCorner, pillProgress, icon: PillIcon, iconColor, locked, variant = 'default', footerLeft, footerRight, emptyCover, hidden}: RecipePackProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const pillAnim = useAnimatedStyle(() => ({opacity: pillProgress ? pillProgress.value : 1}));
  const colors = useColors();
  const {isDark} = useTheme();
  // 뱃지(pill) 그림자: 경계가 보이되 부드럽게 (너무 진하면 지저분해 보임)
  const pillShadow = {
    boxShadow: isDark
      ? '0px 2px 12px 0px rgba(0, 0, 0, 0.42)'
      : '0px 2px 12px 0px rgba(14, 14, 13, 0.16)',
  } as const;
  const ref = useRef<View>(null);

  // 최소 1장, 최대 3장 (뒤 카드부터 그려 마지막이 위로)
  const shown = (cards.length > 0 ? cards : [{title}]).slice(0, 3);
  // 종이: 레시피 1개이거나 썸네일 없을 때만 표시 (여러 개 + 썸네일 있으면 숨김)
  const multi = shown.length > 1;

  const handlePress = () => {
    if (!onPress) return;
    triggerHaptic('light');
    const node = ref.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => onPress({x, y, width, height}));
    } else {
      onPress({x: 0, y: 0, width: 0, height: 0});
    }
  };

  // 제목 뱃지 (책/일반 공통)
  const pillContent = (
    <View style={[styles.pill, pillShadow]}>
      {locked
        ? <IconLockFilled width={13} height={13} color={colors['foreground/on-surface-muted']} />
        : PillIcon && <PillIcon width={13} height={13} color={iconColor ?? colors['foreground/on-surface-muted']} />}
      <Text style={styles.pillLabel} numberOfLines={1}>{title}</Text>
      {count != null && count > 1 && <Text style={styles.pillCount}>{count}</Text>}
    </View>
  );

  // 레시피 북 전용: 정사각 그레이 표지에 제목(쿡북 색 글자)을 얹은 포스터 형태 + 중앙 썸넬. 뱃지 없음.
  if (variant === 'book') {
    const BOOK_W = Math.round(188 * 1.44); // 271 (책만 1.44배)
    const BOOK_H = BOOK_W; // 정사각
    const BOOK_IMG = Math.round(85 * 1.44); // 122 (표지 안 정사각 썸넬)
    const titleColor = iconColor ?? colors['foreground/on-surface'];
    // 표지 배경: 색상별 틴트 없이 모든 책을 옅은 크림(cream/96)으로 통일. (글자색만 레시피북 색 유지)
    const coverBg = PrimitiveColors['cream/96'];
    // 그림자 토큰 두 번째 (normal)
    const bookShadow = getElevation('normal', isDark ? 'dark' : 'light');
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        style={({pressed}) => [styles.container, {width: BOOK_PACK_WIDTH}, pressed && {opacity: 0.85, transform: [{scale: 0.97}]}]}>
        <View style={[styles.bookCover, bookShadow, {width: BOOK_W, height: BOOK_H, backgroundColor: coverBg, transform: [{rotate: `${rotate}deg`}]}]}>
          {/* 썸넬 중앙 */}
          <StackedThumbnail
            size={BOOK_IMG}
            fill
            bare
            transparent={emptyCover}
            imageUrl={shown[0].imageUrl}
            colors={colors}
            paperTitle={shown[0].title}
            paperPreview={shown[0].paperPreview}
            radius={0}
            showPaper={!shown[0].imageUrl}
          />
          {/* 제목 — 썸넬 상단에 살짝 겹치게 (absolute) */}
          <Text style={[styles.bookTitle, {color: titleColor}]} numberOfLines={2}>{title}</Text>
          {/* 부가정보 — 하단 좌·중·우 (레퍼런스 풋터): 레시피 수 · 브랜드 · 회고 수 */}
          <View style={styles.bookFooter} pointerEvents="none">
            <Text style={[styles.bookMeta, {flex: 1, textAlign: 'left', color: titleColor}]} numberOfLines={2}>{footerLeft ?? t('recipePack.recipeCount', {count: count ?? shown.length})}</Text>
            <Text style={[styles.bookMeta, {flex: 1, textAlign: 'center', color: titleColor}]} numberOfLines={2}>{t('recipePack.brandName')}</Text>
            <Text style={[styles.bookMeta, {flex: 1, textAlign: 'right', color: titleColor}]} numberOfLines={2}>{footerRight ?? ''}</Text>
          </View>
          {/* 비공개(숨김) 표시 — 표지 우상단 자물쇠 */}
          {hidden && (
            <View style={styles.bookHiddenBadge} pointerEvents="none">
              <IconEyeClosed width={16} height={16} color={titleColor} />
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      style={({pressed}) => [styles.container, pressed && {opacity: 0.85, transform: [{scale: 0.97}]}]}>
      <View style={[styles.stack, {transform: [{rotate: `${rotate}deg`}]}]}>
        {(() => { const fanArr = fanFor(shown.length); return shown.map((card, i) => {
          const fan = fanArr[i] ?? fanArr[fanArr.length - 1];
          return (
            <View
              key={i}
              style={[
                styles.thumbWrap,
                {transform: [{translateX: fan.x}, {translateY: fan.y}, {rotate: `${fan.rotate}deg`}]},
              ]}>
              <StackedThumbnail
                size={THUMB_SIZE}
                imageUrl={card.imageUrl}
                colors={colors}
                paperTitle={card.title}
                paperPreview={card.paperPreview}
                radius={8}
                // 이미지만 있는 카드(미리보기 없음) 뒤엔 빈 종이를 그리지 않음
                showPaper={(!multi && !!card.paperPreview) || !card.imageUrl}
              />
            </View>
          );
        }); })()}
        {/* 썸네일 위 pill 뱃지 (라벨 + 개수) — Figma 75166:53685 */}
        <Animated.View
          style={[
            pillBottom
              ? styles.pillWrapBottom
              : pillCorner === 'top-right'
                ? styles.pillWrapTopRight
                : pillCorner === 'bottom-left'
                  ? styles.pillWrapBottom
                  : pillCorner === 'bottom-right'
                    ? styles.pillWrapBottomRight
                    : pillCorner === 'bottom-center'
                      ? styles.pillWrapBottomCenter
                      : styles.pillWrap,
            pillAnim,
          ]}
          pointerEvents="none">
          {pillContent}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    width: PACK_WIDTH,
    alignItems: 'center',
  },
  stack: {
    width: PACK_WIDTH,
    height: STACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrap: {
    position: 'absolute',
  },
  pillWrap: {
    position: 'absolute',
    left: -4,
    top: 36,
    alignItems: 'flex-start',
  },
  pillWrapBottom: {
    position: 'absolute',
    left: -4,
    bottom: 36,
    alignItems: 'flex-start',
  },
  pillWrapBottomRight: {
    position: 'absolute',
    right: -4,
    bottom: 36,
    alignItems: 'flex-end',
  },
  pillWrapTopRight: {
    position: 'absolute',
    right: -4,
    top: 36,
    alignItems: 'flex-end',
  },
  pillWrapBottomCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
  },
  // 레시피 북 책 표지 (3:4) — 색은 레시피 북 색(iconColor) 주입
  // 포스터형 표지: 정사각 진한 그레이 배경, 썸넬 중앙 + 제목(쿡북 색)을 썸넬에 살짝 걸침
  bookCover: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimitiveColors['cream/96'], // 크림 계열 표지 배경(밝게)
    borderWidth: 1,
    borderColor: colors['border/muted'],
  },
  bookHiddenBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  bookTitle: {
    position: 'absolute',
    top: 43,
    left: 19,
    right: 19,
    fontFamily: 'Pretendard-Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.24,
    textAlign: 'center',
  },
  bookFooter: {
    position: 'absolute',
    bottom: 14,
    left: 19,
    right: 19,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookMeta: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 7,
    lineHeight: 9.8,
    letterSpacing: 0.3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 1000,
    backgroundColor: colors['surface/normal'],
    maxWidth: PACK_WIDTH - 16,
  },
  pillLabel: {
    fontFamily: Typography.label['large - semibold'].fontFamily,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: colors['foreground/on-surface'],
    flexShrink: 1,
  },
  pillCount: {
    fontFamily: Typography.label['large - semibold'].fontFamily,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: colors['foreground/on-surface-muted'],
  },
});
