import React from 'react';
import {StyleSheet} from 'react-native';
import {
  IconAdd,
  IconFilter,
  IconEllipsisVertical,
} from '@components/Icon/IconIndex';
import {IconButton} from './IconButton';
import {Selector} from './Selector';
import {GlassContainer} from './GlassContainer';
import {FloatingNavBar, navPillStyle} from './FloatingNavBar';

export interface AppBarProps {
  title?: string;
  onTitlePress?: () => void;
  onAddPress?: () => void;
  onFilterPress?: () => void;
  onMenuPress?: () => void;
  showDropdown?: boolean;
  showAddButton?: boolean;
  showFilterButton?: boolean;
  showMenuButton?: boolean;
  filterMenuOpen?: boolean;
  menuOpen?: boolean;
}

export function AppBar({
  title = '모든 요리책',
  onTitlePress,
  onAddPress,
  onFilterPress,
  onMenuPress,
  showDropdown = true,
  showAddButton = true,
  showFilterButton = true,
  showMenuButton = true,
  filterMenuOpen = false,
  menuOpen = false,
}: AppBarProps) {
  const hasRightButtons = showAddButton || showFilterButton || showMenuButton;

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
