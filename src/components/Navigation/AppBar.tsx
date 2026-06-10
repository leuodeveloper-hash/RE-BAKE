import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {
  IconAdd,
  IconFilter,
  IconSearch,
  IconEllipsisVertical,
} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Selector} from '@components/Selector';
import {GlassContainer} from '@components/Container';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
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
  onAddPress?: () => void;
  onFilterPress?: () => void;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  showDropdown?: boolean;
  showAddButton?: boolean;
  showSearchButton?: boolean;
  showFilterButton?: boolean;
  showMenuButton?: boolean;
  filterMenuOpen?: boolean;
  menuOpen?: boolean;
  /** 좌측 캡슐 아래 메뉴 */
  titleMenu?: React.ReactNode;
  /** 우측 캡슐 아래 메뉴 */
  rightMenu?: React.ReactNode;
}

export function AppBar({
  title = '모든 레시피 북',
  centered = false,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  onTitlePress,
  onAddPress,
  onFilterPress,
  onMenuPress,
  onSearchPress,
  showDropdown = true,
  showAddButton = true,
  showSearchButton = false,
  showFilterButton = true,
  showMenuButton = true,
  filterMenuOpen = false,
  menuOpen = false,
  titleMenu,
  rightMenu,
}: AppBarProps) {
  const themedStyles = useThemedStylesV2(createThemedStyles);

  if (centered) {
    return (
      <View style={themedStyles.centeredContainer}>
        <View style={themedStyles.centeredSide}>
          {leftIcon && (
            <IconButton
              icon={leftIcon}
              variant="ghost-secondary"
              size="medium"
              onPress={onLeftPress}
            />
          )}
        </View>
        <Text style={themedStyles.centeredTitle}>{title}</Text>
        <View style={themedStyles.centeredSide}>
          {rightIcon && (
            <IconButton
              icon={rightIcon}
              variant="ghost-secondary"
              size="medium"
              onPress={onRightPress}
            />
          )}
        </View>
      </View>
    );
  }

  const hasRightButtons = showAddButton || showSearchButton || showFilterButton || showMenuButton;

  return (
    <FloatingNavBar
      left={
        <GlassContainer contentStyle={styles.titlePill}>
          <Selector
            label={title}
            showDropdown={showDropdown}
            onPress={onTitlePress}
            variant="ghost"
          />
        </GlassContainer>
      }
      right={
        hasRightButtons ? (
          <GlassContainer contentStyle={navPillStyle}>
            {showAddButton && (
              <IconButton
                icon={IconAdd}
                onPress={onAddPress}
                variant="ghost-secondary"
                size="medium"
              />
            )}
            {showSearchButton && (
              <IconButton
                icon={IconSearch}
                onPress={onSearchPress}
                variant="ghost-secondary"
                size="medium"
              />
            )}
            {showFilterButton && (
              <IconButton
                icon={IconFilter}
                onPress={onFilterPress}
                variant="ghost-secondary"
                size="medium"
                forcePressed={filterMenuOpen}
              />
            )}
            {showMenuButton && (
              <IconButton
                icon={IconEllipsisVertical}
                onPress={onMenuPress}
                variant="ghost-secondary"
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
  titlePill: {
    height: 44,
    justifyContent: 'center',
    padding: 2,
  },
});

const createThemedStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  centeredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
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
