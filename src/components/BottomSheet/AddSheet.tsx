import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {
  IconAdd,
  IconOpenbook,
  IconCamera,
  IconImport,
  IconClose,
} from '@components/Icon/IconIndex';
import {IconButton} from '@components/Layout';

export interface AddSheetItem {
  id: string;
  label: string;
  description: string;
  icon: React.FC<SvgProps>;
  onPress?: () => void;
}

// 추가 메뉴 아이템 (기본값)
const DEFAULT_ADD_ITEMS: AddSheetItem[] = [
  {
    id: 'recipe',
    label: '새 레시피',
    description: '직접 레시피를 작성합니다',
    icon: IconAdd,
  },
  {
    id: 'import',
    label: '레시피 가져오기',
    description: '텍스트나 링크에서 레시피를 가져옵니다',
    icon: IconImport,
  },
  {
    id: 'scan',
    label: '레시피 스캔',
    description: '카메라로 레시피를 스캔합니다',
    icon: IconCamera,
  },
  {
    id: 'cookbook',
    label: '새 요리책',
    description: '레시피를 담을 요리책을 만듭니다',
    icon: IconOpenbook,
  },
];

export interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  items?: AddSheetItem[];
  onItemPress?: (item: AddSheetItem) => void;
}

export function AddSheet({
  visible,
  onClose,
  items = DEFAULT_ADD_ITEMS,
  onItemPress,
}: AddSheetProps) {
  const handleItemPress = (item: AddSheetItem) => {
    if (item.onPress) {
      item.onPress();
    }
    if (onItemPress) {
      onItemPress(item);
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>추가하기</Text>
          <IconButton
            icon={IconClose}
            variant="ghost-secondary"
            size="small"
            onPress={onClose}
          />
        </View>

        {/* 메뉴 아이템들 */}
        <View style={styles.itemsContainer}>
          {items.map(item => {
            const IconComponent = item.icon;
            return (
              <Pressable
                key={item.id}
                style={({pressed}) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => handleItemPress(item)}>
                <View style={styles.iconContainer}>
                  <IconComponent
                    width={24}
                    height={24}
                    color={SemanticColorsLight['foreground-onsurface']}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.md,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  itemsContainer: {
    gap: Spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius['radius-lg'],
    gap: Spacing.md,
  },
  itemPressed: {
    backgroundColor: SemanticColorsLight['background-statelayers-surfacehover'],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius['radius-md'],
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontFamily: Typography.body.large.fontFamily,
    fontSize: Typography.body.large.fontSize,
    fontWeight: '600',
    lineHeight: Typography.body.large.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  itemDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
  },
});
