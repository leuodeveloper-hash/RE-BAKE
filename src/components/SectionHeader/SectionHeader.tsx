import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {IconChevronRight} from '@components/Icon/IconIndex';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {SvgProps} from 'react-native-svg';
import {IconButton} from '@components/IconButton';
import {Menu, type MenuItemData, type MenuSection} from '@components/Menu/Menu';
import {IconEllipsisVertical} from '@components/Icon/IconIndex';

/** 진도 게이지 너비 */
const PROGRESS_WIDTH = 64;

/**
 * 타이틀 톤.
 * - 'muted'(기본): 목록 위 구분선 같은 가벼운 머리말
 * - 'strong': 그 섹션 자체가 콘텐츠일 때(스탬프북의 레시피북 등)
 */
export type SectionHeaderVariant = 'muted' | 'strong';

export interface SectionHeaderProps {
  /** 섹션 타이틀 */
  title: string;
  variant?: SectionHeaderVariant;
  /** 브레드크럼 (타이틀 > 브레드크럼) */
  breadcrumb?: string;
  /** 브레드크럼 구분 아이콘 */
  breadcrumbIcon?: React.FC<SvgProps>;
  /** 우측 액션 라벨 (예: '편집') */
  actionLabel?: string;
  /** 우측 액션 콜백 */
  onAction?: () => void;
  /** 타이틀 앞 아이콘 (예: 레시피북 아이콘) */
  leadingIcon?: React.FC<SvgProps>;
  leadingIconColor?: string;
  /**
   * 진행도 — 주면 타이틀 옆에 게이지와 "done/total"이 보인다.
   * total이 0이면(분모가 없는 묶음) 감춘다.
   */
  progress?: {done: number; total: number};
  /** 헤더 전체를 눌러 이동할 때 — 우측에 › 가 붙는다 */
  onPress?: () => void;
  style?: ViewStyle;
  /** 타이틀 바로 오른쪽에 붙는 요소 — 과정 묶음 타이머 등 */
  titleTrailing?: React.ReactNode;
  /** 오른쪽 오버플로우(⋮) 메뉴 — 주면 '편집' 글자 버튼 대신 ⋮ 버튼 + 메뉴(편집·타이머 설정 등) */
  menuItems?: MenuItemData[];
  onMenuSelect?: (id: string) => void;
  /** 메뉴 항목 위에 붙는 묶음(레이블 + 컨트롤 등) — 예: 재료 '비율 조절' 슬라이더. 항목(편집 등)은 그 아래 */
  menuExtraSections?: MenuSection[];
  /** 메뉴 열림/닫힘 — 감싼 쪽이 이 헤더를 맨 위 레이어로 올릴 때(다음 헤더·타이머에 가리지 않게) */
  onMenuOpenChange?: (open: boolean) => void;
  /** 메뉴 열림을 바깥에서 정할 때(제어) — 주면 이 값을 따르고 바뀔 땐 onMenuOpenChange로 알린다 */
  menuOpen?: boolean;
  /** 오른쪽 액션(편집) 왼쪽에 붙는 요소 — 스위치 등 */
  actionExtra?: React.ReactNode;
}

export function SectionHeader({
  menuItems,
  menuExtraSections,
  onMenuSelect,
  onMenuOpenChange,
  menuOpen: menuOpenProp,
  titleTrailing,
  actionExtra,
  title,
  variant = 'muted',
  breadcrumb,
  breadcrumbIcon: BreadcrumbIcon,
  actionLabel,
  onAction,
  leadingIcon: LeadingIcon,
  leadingIconColor,
  progress,
  onPress,
  style,
}: SectionHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const showProgress = !!progress && progress.total > 0;
  const [menuOpenState, setMenuOpenState] = useState(false);
  // 바깥에서 열고 닫을 수 있다(menuOpen을 주면 그 값을 따른다 — 예: 배수 글자를 눌러 메뉴 열기)
  const menuOpen = menuOpenProp ?? menuOpenState;
  const setMenuOpen = (v: boolean | ((p: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(menuOpen) : v;
    if (next === menuOpen) return;
    if (menuOpenProp === undefined) setMenuOpenState(next);
    onMenuOpenChange?.(next);
  };
  // 항목이 없어도(편집 권한 없음) 비율 조절 같은 묶음이 있으면 ⋮ 메뉴를 둔다
  const hasMenu = !!menuItems?.length || !!menuExtraSections?.length;
  const Wrapper = onPress ? Pressable : View;

  return (
    // 메뉴가 열리면 아래 콘텐츠보다 위로(드롭다운 z-index)
    <Wrapper style={[styles.container, menuOpen && styles.containerMenuOpen, style]} onPress={onPress}>
      <View style={styles.leadRow}>
        {LeadingIcon && (
          <LeadingIcon
            width={20}
            height={20}
            color={leadingIconColor ?? colors['foreground/on-surface-muted']}
          />
        )}
        {breadcrumb && BreadcrumbIcon ? (
          <View style={styles.breadcrumbRow}>
            <Text style={[styles.title, variant === 'strong' && styles.titleStrong]}>{title}</Text>
            <BreadcrumbIcon width={8} height={8} color={colors['foreground/on-surface-muted']} />
            <Text style={[styles.title, variant === 'strong' && styles.titleStrong]}>{breadcrumb}</Text>
          </View>
        ) : (
          <Text style={[styles.title, variant === 'strong' && styles.titleStrong]}>{title}</Text>
        )}
        {titleTrailing}
        {showProgress && (
          <>
            {/* 게이지 — 숫자만으로는 얼마나 남았는지 한눈에 안 온다 */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${Math.round((progress!.done / progress!.total) * 100)}%`},
                ]}
              />
            </View>
            <Text style={styles.action}>{progress!.done}/{progress!.total}</Text>
          </>
        )}
        {onPress && (
          <IconChevronRight width={16} height={16} color={colors['foreground/on-surface-muted']} />
        )}
      </View>
      {(actionExtra || hasMenu || (onAction && actionLabel)) ? (
        <View style={styles.actionRow}>
          {actionExtra}
          {hasMenu ? (
            <View style={styles.menuAnchor}>
              <IconButton icon={IconEllipsisVertical} variant="ghost-secondary" size="small" forcePressed={menuOpen} onPress={() => setMenuOpen(v => !v)} />
              <Menu
                // 묶음(비율 조절 등)이 위, 항목(편집 등)은 아래
                sections={[...(menuExtraSections ?? []), ...(menuItems?.length ? [{items: menuItems, dividerBefore: !!menuExtraSections?.length}] : [])]}
                visible={menuOpen}
                onSelect={id => { setMenuOpen(false); onMenuSelect?.(id); }}
                onClose={() => setMenuOpen(false)}
                style={styles.menu}
              />
            </View>
          ) : onAction && actionLabel ? (
            <Pressable onPress={onAction} hitSlop={8}>
              <Text style={styles.action}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Wrapper>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  containerMenuOpen: {
    zIndex: 1000,
    elevation: 1000,
  },
  menuAnchor: {
    // ⋮ 버튼은 아이콘 둘레에 누를 자리(여백)가 있어 간격(16)이 더 벌어져 보인다 — 그만큼 당긴다
    marginLeft: -Spacing.sm,
    overflow: 'visible',
    zIndex: 1000,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: Spacing.xs,
    zIndex: 1000,
    elevation: 1000,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  container: {
    // 고정 높이가 아니라 최소 높이 — 게이지·아이콘이 들어가면 줄이 커진다
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.smd,
  },
  title: {
    fontFamily: Typography.caption.large.fontFamily,
    fontSize: Typography.caption.large.fontSize,
    fontWeight: Typography.caption.large.fontWeight as '500',
    lineHeight: Typography.caption.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
  titleStrong: {
    color: colors['foreground/on-surface'],
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  progressTrack: {
    width: PROGRESS_WIDTH,
    height: 6,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['fill/faint'],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['foreground/on-surface-muted'],
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  action: {
    fontFamily: Typography.caption.large.fontFamily,
    fontSize: Typography.caption.large.fontSize,
    fontWeight: Typography.caption.large.fontWeight as '500',
    lineHeight: Typography.caption.large.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },
});
