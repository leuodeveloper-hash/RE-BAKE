import {MetaLine} from '@components/MetaLine';
import React, {useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import {LinearGradient} from 'expo-linear-gradient';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {IconButton} from '@components/IconButton';
import {EmptyState} from '@components/EmptyState';
import {emptyRetrospectiveMessage} from '@components/RecipeGroups/groupAxis';
import {IconArrowRight, IconChartNoAxesGantt, IconChevronLeft, IconChevronRight} from '@components/Icon/IconIndex';
import {Typography} from '@constants/typography';
import {type SemanticColors, PrimitiveColors} from '@constants/tokens';
import {getElevation} from '@constants/elevation';
import {triggerHaptic} from '@utils/haptics';
import {PACK_WIDTH, type PackCardData, type PackOriginRect} from './RecipePack';

/**
 * 회고 노트 팩 — 노란 정사각 노트 카드 (레시피 북과 동일 사이즈).
 * 레이아웃: [위] 흰 종이 박스(회고 내용) → [아래] 통합 푸터: 라벨 + ‹ › 페이징(항상 표시, 없으면 disable).
 * 회고는 색 구분이 없어 표지는 낮은 크림(cream/96)으로 고정.
 */

/** 회고 노트 폭 — 레시피 북과 동일 (BOOK_PACK_WIDTH) */
export const NOTE_WIDTH = Math.round(PACK_WIDTH * 1.44); // 317
const NOTE_SIZE = Math.round(188 * 1.44); // 271 (책 표지와 동일, 정사각)

export interface RetrospectiveNoteProps {
  /** 미리볼 회고들 — 각 항목의 title/paperPreview를 종이 박스에 표시, ‹ ›로 페이징 */
  cards?: PackCardData[];
  /** 하단 좌측 라벨 (기본: 'n개의 회고') */
  metaText?: string;
  /** 탭 시 호출 (확대 애니메이션 원점 — 전체 회고 열기) */
  onPress?: (rect: PackOriginRect) => void;
  /** 카드 기울기(deg) — 캐러셀에선 0 */
  rotate?: number;
  count?: number;
  /** 빈 노트 */
  emptyCover?: boolean;
  /** 누르면 지금 보고 있는 카드 순서로 호출 — 있으면 onPress 대신 */
  onCardPress?: (index: number) => void;
  /** 예시 내용 — 종이를 흐리게 그린다 */
  example?: boolean;
  /** 사진 카드 형태 — [사진·태그·뱃지] 위, [날짜·회고·→] 아래 (첫 카드만) */
  photoCard?: boolean;
}

export function RetrospectiveNote({
  cards,
  metaText,
  onPress,
  rotate = 0,
  emptyCover,
  onCardPress,
  example,
  photoCard,
}: RetrospectiveNoteProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const ref = useRef<View>(null);
  const [index, setIndex] = useState(0);

  const entries = cards ?? [];
  const total = entries.length;
  const isEmpty = emptyCover || total === 0;
  const current = entries[Math.min(index, Math.max(0, total - 1))];
  const canPrev = !isEmpty && index > 0;
  const canNext = !isEmpty && index < total - 1;

  const handlePress = () => {
    if (onCardPress && total > 0) {
      triggerHaptic('light');
      onCardPress(Math.min(index, total - 1));
      return;
    }
    if (!onPress) return;
    triggerHaptic('light');
    const node = ref.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => onPress({x, y, width, height}));
    } else {
      onPress({x: 0, y: 0, width: 0, height: 0});
    }
  };

  const noteShadow = getElevation('normal', isDark ? 'dark' : 'light');
  const paperShadow = getElevation('subtle', isDark ? 'dark' : 'light');

  // 사진 카드: 베이지 노트 박스 안에 두 덩이 — [썸네일 4:3] / [글: 이름 · 메타 · 회고 · →].
  if (photoCard && !isEmpty && current) {
    const [mainText, ...restLines] = current.paperPreview ?? [];
    // 레시피북·공법·회차는 썸네일 위(품목명 위), 종이엔 날짜만
    const meta = current.dateText ?? '';
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        style={({pressed}) => [styles.container, {width: NOTE_WIDTH}, pressed && {opacity: 0.9}]}>
        <View style={[styles.noteCard, styles.photoNoteCard, noteShadow, {width: NOTE_SIZE, transform: [{rotate: `${rotate}deg`}]}, example && styles.paperExample]}>
          {/* 1) 썸네일 */}
          <View style={styles.thumbBox}>
            {current.imageUrl ? (
              <Image
                source={typeof current.imageUrl === 'string' ? {uri: current.imageUrl} : current.imageUrl}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
                <IconChartNoAxesGantt width={28} height={28} color={colors['custom/light-blue-var']} />
              </View>
            )}
            {/* 품목명만 썸네일 위에 — 나머지(메타·회고)는 아래 종이에 */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
              style={styles.thumbGradient}
              pointerEvents="none"
            />
            <View style={styles.thumbText}>
              {/* 한 줄: 레시피북 · 공법 · 회차("1/1회차") → 그 아래 품목명 */}
              {((current.tags ?? []).length || metaText) ? (
                <MetaLine items={[...(current.tags ?? []), metaText]} textStyle={styles.thumbMeta} />
              ) : null}
              <Text style={styles.thumbTitle} numberOfLines={1}>{current.title}</Text>
            </View>
          </View>
          {/* 2) 글 */}
          <View style={[styles.textBlock, paperShadow]}>
            {meta ? <Text style={styles.blockMeta} numberOfLines={1}>{meta}</Text> : null}
            <Text style={styles.reviewMain} numberOfLines={2}>{mainText}</Text>
            {restLines[0] ? <Text style={styles.reviewSub} numberOfLines={1}>{restLines[0]}</Text> : null}
            <IconArrowRight width={20} height={20} color={colors['foreground/on-surface']} style={styles.arrow} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      style={({pressed}) => [styles.container, {width: NOTE_WIDTH}, pressed && {opacity: 0.9}]}>
      <View style={[styles.noteCard, noteShadow, {width: NOTE_SIZE, height: NOTE_SIZE, transform: [{rotate: `${rotate}deg`}]}]}>
        {/* 위: 흰 종이 박스 (회고 내용) */}
        {/* 종이 그림자는 가장 낮은 단계(subtle) — 노트 위에 살짝 얹힌 정도 */}
        <View style={[styles.paper, paperShadow, isEmpty && styles.paperEmpty, example && styles.paperExample]}>
          {isEmpty ? (
            <EmptyState variant="simple" title={emptyRetrospectiveMessage(t)} />
          ) : (
            <>
              {/* 우상단 작은 썸네일 — 어떤 레시피의 회고인지 한눈에 */}
              {current?.imageUrl ? (
                <Image
                  source={typeof current.imageUrl === 'string' ? {uri: current.imageUrl} : current.imageUrl}
                  style={styles.thumb}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : null}
              <Text style={[styles.contentTitle, current?.imageUrl ? styles.contentTitleWithThumb : null]} numberOfLines={2}>{current?.title}</Text>
              {(current?.paperPreview ?? []).slice(0, 3).map((line, i) => (
                <View key={i} style={styles.previewRow}>
                  <View style={styles.dot} />
                  <Text style={styles.previewText} numberOfLines={1}>{line}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* 아래: 통합 푸터 — 라벨 + ‹ › (항상 표시, 없으면 disable) */}
        <View style={styles.footer}>
          <Text style={styles.meta} numberOfLines={1}>
            {metaText ?? (total > 0 ? t('retrospectiveNote.noteCount', {count: total}) : t('retrospectiveNote.emptyNote'))}
          </Text>
          <View style={styles.pager}>
            <IconButton
              icon={IconChevronLeft}
              variant="ghost-secondary"
              size="small"
              disabled={!canPrev}
              onPress={() => setIndex(i => Math.max(0, i - 1))}
            />
            <IconButton
              icon={IconChevronRight}
              variant="ghost-secondary"
              size="small"
              disabled={!canNext}
              onPress={() => setIndex(i => Math.min(total - 1, i + 1))}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    width: PACK_WIDTH,
    alignItems: 'center',
  },
  noteCard: {
    backgroundColor: PrimitiveColors['cream/96'],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors['border/muted'],
    padding: 10,
  },
  // 흰 종이 박스
  paper: {
    flex: 1,
    backgroundColor: colors['surface/bright'],
    borderRadius: 17,
    padding: 17,
    gap: 7,
  },
  thumb: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors['fill/faint'],
  },
  // 썸네일 자리만큼 제목을 비운다
  contentTitleWithThumb: {
    paddingRight: 48,
  },
  contentTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: colors['foreground/on-surface'],
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors['foreground/on-surface-muted'],
  },
  previewText: {
    flex: 1,
    fontFamily: 'Pretendard-Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: colors['foreground/on-surface-muted'],
  },
  // ── 사진 카드 (베이지 노트 박스 안 두 덩이) ──
  // 들어가는 기준 6px — 바깥 여백·두 덩이 사이 모두 6. 안쪽 모서리는 24-6=18
  photoNoteCard: {
    padding: 6,
  },
  thumbBox: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors['fill/faint'],
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 글 덩이 — 예전 노트처럼 흰 종이 박스
  textBlock: {
    marginTop: 6,
    backgroundColor: colors['surface/bright'],
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  thumbGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  thumbText: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    gap: 2,
  },
  thumbMeta: {
    ...Typography.label.small,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  thumbTitle: {
    ...Typography.title.medium,
    // title.medium(16)과 large(20) 사이 — 사진 위 품목명은 살짝 크게
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  blockMeta: {
    ...Typography.label.small,
    color: colors['foreground/on-surface-muted'],
  },
  reviewMain: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    marginTop: 4,
    paddingRight: 24,
  },
  reviewSub: {
    ...Typography.body.small,
    color: colors['foreground/on-surface-muted'],
    paddingRight: 24,
  },
  arrow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
  // 예시 회고 — 실제 기록이 아님을 흐리게 드러낸다
  paperExample: {
    opacity: 0.5,
  },
  paperEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 통합 푸터: 라벨 + 좌우 페이징
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  meta: {
    flex: 1,
    paddingLeft: 10,
    fontFamily: 'Pretendard-Medium',
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: colors['foreground/on-surface'],
  },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
