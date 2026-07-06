import React, {useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {IconButton} from '@components/IconButton';
import {EmptyState} from '@components/EmptyState';
import {emptyRetrospectiveMessage} from '@components/RecipeGroups/groupAxis';
import {IconChevronLeft, IconChevronRight} from '@components/Icon/IconIndex';
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
}

export function RetrospectiveNote({
  cards,
  metaText,
  onPress,
  rotate = 0,
  emptyCover,
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

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      style={({pressed}) => [styles.container, {width: NOTE_WIDTH}, pressed && {opacity: 0.9}]}>
      <View style={[styles.noteCard, noteShadow, {width: NOTE_SIZE, height: NOTE_SIZE, transform: [{rotate: `${rotate}deg`}]}]}>
        {/* 위: 흰 종이 박스 (회고 내용) */}
        <View style={[styles.paper, isEmpty && styles.paperEmpty]}>
          {isEmpty ? (
            <EmptyState variant="simple" title={emptyRetrospectiveMessage(t)} />
          ) : (
            <>
              <Text style={styles.contentTitle} numberOfLines={2}>{current?.title}</Text>
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
    boxShadow: '0px 4px 12px -2px rgba(14, 14, 13, 0.12)',
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
