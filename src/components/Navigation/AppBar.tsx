import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {
  IconAdd,
  IconCircleInfo,
  IconFilter,
  IconSearch,
  IconEllipsisVertical,
} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {NavPillButton} from './NavPillButton';
import {Selector} from '@components/Selector';
import {GlassContainer} from '@components/Container';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {FloatingNavBar, navPillStyle} from './FloatingNavBar';

export interface AppBarProps {
  title?: string;
  /** centered 모드: 좌측 아이콘 + 중앙 타이틀 + 우측 아이콘 */
  centered?: boolean;
  /** centered 모드 좌측 아이콘 */
  leftIcon?: React.FC<SvgProps>;
  onLeftPress?: () => void;
  /** centered 모드 우측 아이콘 */
  rightIcon?: React.FC<SvgProps>;
  onRightPress?: () => void;
  onTitlePress?: () => void;
  /** 기본 타이틀 셀렉터 앞 아이콘 (선택된 축 아이콘 — 메뉴와 동일 표시) */
  titleIcon?: React.FC<SvgProps>;
  titleIconColor?: string;
  onAddPress?: () => void;
  onFilterPress?: () => void;
  /** 필터(뷰 전환) 버튼 아이콘 — 현재 뷰의 아이콘을 노출 (기본: IconFilter) */
  filterIcon?: React.FC<SvgProps>;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  /** ⓘ 정보 버튼 (예: 공법 설명 페이지 진입) */
  onInfoPress?: () => void;
  showDropdown?: boolean;
  showAddButton?: boolean;
  showSearchButton?: boolean;
  showInfoButton?: boolean;
  showFilterButton?: boolean;
  showMenuButton?: boolean;
  filterMenuOpen?: boolean;
  menuOpen?: boolean;
  /** 좌측 캡슐 아래 메뉴 */
  titleMenu?: React.ReactNode;
  /** 우측 캡슐 아래 메뉴 */
  rightMenu?: React.ReactNode;
  /** 좌측 타이틀을 커스텀 노드로 대체 (예: 브레드크럼). 지정 시 title/Selector 대신 렌더 */
  titleNode?: React.ReactNode;
  /** 뒤로가기와 타이틀/셀렉터 사이에 끼우는 노드(예: 작성자 칩). 셀렉터를 대체하지 않고 나란히 추가 */
  titleLeadingNode?: React.ReactNode;
}

export function AppBar({
  title,
  centered = false,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  onTitlePress,
  titleIcon,
  titleIconColor,
  onAddPress,
  onFilterPress,
  filterIcon = IconFilter,
  onMenuPress,
  onSearchPress,
  onInfoPress,
  showDropdown = true,
  showAddButton = true,
  showSearchButton = false,
  showInfoButton = false,
  showFilterButton = true,
  showMenuButton = true,
  filterMenuOpen = false,
  menuOpen = false,
  titleMenu,
  rightMenu,
  titleNode,
  titleLeadingNode,
}: AppBarProps) {
  const themedStyles = useThemedStyles(createThemedStyles);
  const {t} = useTranslation();
  const resolvedTitle = title ?? t('appBar.allRecipeBooks');

  if (centered) {
    return (
      <View style={themedStyles.centeredContainer}>
        <View style={themedStyles.centeredSide}>
          {leftIcon && (
            <NavPillButton icon={leftIcon} onPress={onLeftPress} />
          )}
        </View>
        <Text style={themedStyles.centeredTitle}>{resolvedTitle}</Text>
        <View style={themedStyles.centeredSide}>
          {rightIcon && (
            <NavPillButton icon={rightIcon} onPress={onRightPress} />
          )}
        </View>
      </View>
    );
  }

  const hasRightButtons = showAddButton || showSearchButton || showInfoButton || showFilterButton || showMenuButton;

  const leftContent = titleNode ?? (
    <GlassContainer contentStyle={styles.titlePill}>
      {/* 리딩노드(작성자 로고 배지 등)는 셀렉터와 같은 알약 안에 함께 넣는다.
          Breadcrumb.leading과 동일한 톤으로 셀렉터에 붙인다. */}
      {titleLeadingNode ? <View style={styles.titleLeading}>{titleLeadingNode}</View> : null}
      <Selector
        label={resolvedTitle}
        showDropdown={showDropdown}
        onPress={onTitlePress}
        variant="ghost"
      />
    </GlassContainer>
  );

  return (
    <FloatingNavBar
      left={
        // 뒤로가기 버튼이 있으면 셀렉터 알약 앞에 나란히 배치.
        leftIcon ? (
          <View style={styles.leftRow}>
            <NavPillButton icon={leftIcon} onPress={onLeftPress} />
            {leftContent}
          </View>
        ) : leftContent
      }
      right={
        hasRightButtons ? (
          <GlassContainer contentStyle={navPillStyle}>
            {showAddButton && (
              <IconButton
                icon={IconAdd}
                onPress={onAddPress}
                variant="ghost-primary"
                size="medium"
              />
            )}
            {showSearchButton && (
              <IconButton
                icon={IconSearch}
                onPress={onSearchPress}
                variant="ghost-primary"
                size="medium"
              />
            )}
            {showInfoButton && (
              <IconButton
                icon={IconCircleInfo}
                onPress={onInfoPress}
                variant="ghost-primary"
                size="medium"
              />
            )}
            {showFilterButton && (
              <IconButton
                icon={filterIcon}
                onPress={onFilterPress}
                variant="ghost-primary"
                size="medium"
                forcePressed={filterMenuOpen}
              />
            )}
            {showMenuButton && (
              <IconButton
                icon={IconEllipsisVertical}
                onPress={onMenuPress}
                variant="ghost-primary"
                size="medium"
                forcePressed={menuOpen}
              />
            )}
          </GlassContainer>
        ) : undefined
      }
      leftMenu={titleMenu}
      rightMenu={rightMenu}
    />
  );
}

const styles = StyleSheet.create({
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titlePill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  // 아바타와 셀렉터 사이 간격 (Breadcrumb.leading과 동일). 음수 마진은 겹침 유발해 금지.
  titleLeading: {
    marginLeft: 6,
    marginRight: -2,
  },
});

const createThemedStyles = (colors: SemanticColors) => StyleSheet.create({
  centeredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  centeredSide: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    letterSpacing: Typography.title.medium.letterSpacing,
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
});
