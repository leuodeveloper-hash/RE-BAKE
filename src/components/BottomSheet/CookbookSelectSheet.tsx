import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {BottomSheet} from './BottomSheet';
import {CookbookDialog} from '@components/Dialog';
import {IconAdd, IconBookFilled} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {getColorVarKey} from '@components/ColorPicker';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColorsV2} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface CookbookSelectSheetProps {
  visible: boolean;
  onClose: () => void;
  cookbooks: string[];
  cookbookColors?: Record<string, AvatarColor>;
  selectedCookbook?: string;
  onSelect: (cookbookName: string) => void;
  /** 레시피 북 추가 콜백 — 있으면 "레시피 북 추가" 버튼 표시 */
  onAddCookbook?: (name: string, color: AvatarColor) => void;
  /** 아이콘 커스텀 (기본: IconBookFilled) */
  bookIcon?: React.FC<SvgProps>;
  /** 각 항목 우측 trailing 렌더링 (오버플로우 버튼 등) */
  renderItemTrailing?: (name: string) => React.ReactNode;
  /** 각 항목 onLayout 콜백 (오버플로우 메뉴 위치 계산용) */
  onItemLayout?: (name: string, event: LayoutChangeEvent) => void;
  /** '그룹 없음' 항목 레이블 (기본: '레시피 북 없음') */
  ungroupedLabel?: string;
  /** '레시피 북 추가' 팝업의 공식 레시피 북 토글 기본값 (둘러보기 레시피 생성 시 true) */
  initialOfficial?: boolean;
  /** BottomSheet 내부 오버레이/메뉴 등 추가 요소 */
  children?: React.ReactNode;
}

export function CookbookSelectSheet({
  visible,
  onClose,
  cookbooks,
  cookbookColors,
  selectedCookbook,
  onSelect,
  onAddCookbook,
  bookIcon,
  renderItemTrailing,
  onItemLayout,
  ungroupedLabel = '레시피 북 없음',
  initialOfficial = false,
  children,
}: CookbookSelectSheetProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const BookIcon = bookIcon || IconBookFilled;
  const [showDialog, setShowDialog] = useState(false);

  const handleAddPress = useCallback(() => {
    // 시트(Modal)를 먼저 닫고, 닫힘 애니메이션이 끝난 뒤 다이얼로그(Modal)를 연다.
    // 중첩 Modal을 동시에 전환하면 RN에서 뒤 Modal이 안 뜨는 문제 방지.
    onClose();
    setTimeout(() => setShowDialog(true), 300);
  }, [onClose]);

  const handleDialogConfirm = useCallback((name: string, color: AvatarColor) => {
    setShowDialog(false);
    onAddCookbook?.(name, color);
  }, [onAddCookbook]);

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title="레시피 북" headerType="center">
        <View>
          <Pressable
            style={({pressed}: {pressed: boolean}) => [
              styles.item,
              !selectedCookbook && styles.itemSelected,
              pressed && styles.itemPressed,
            ]}
            onPress={() => onSelect('__none__')}
          >
            <BookIcon width={20} height={20} color={colors['foreground/on-surface-muted']} />
            <Text style={styles.itemLabel}>{ungroupedLabel}</Text>
          </Pressable>
          {cookbooks.map(name => {
            const cbColor = cookbookColors?.[name] as AvatarColor | undefined;
            return (
              <Pressable
                key={name}
                onLayout={onItemLayout ? (e) => onItemLayout(name, e) : undefined}
                style={({pressed}: {pressed: boolean}) => [
                  styles.item,
                  selectedCookbook === name && styles.itemSelected,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => onSelect(name)}
              >
                <BookIcon
                  width={20}
                  height={20}
                  color={colors[getColorVarKey(cbColor || 'brown')]}
                />
                <Text style={styles.itemLabel}>{name}</Text>
                {renderItemTrailing?.(name)}
              </Pressable>
            );
          })}
          {onAddCookbook && (
            <Pressable
              style={({pressed}: {pressed: boolean}) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
              onPress={handleAddPress}
            >
              <IconAdd width={20} height={20} color={colors['foreground/on-surface-muted']} />
              <Text style={styles.itemLabel}>레시피 북 추가</Text>
            </Pressable>
          )}
        </View>
        {children}
      </BottomSheet>

      {onAddCookbook && (
        <CookbookDialog
          visible={showDialog}
          onClose={() => setShowDialog(false)}
          onConfirm={handleDialogConfirm}
          initialOfficial={initialOfficial}
        />
      )}
    </>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    borderRadius: Radius['radius-md'],
  },
  itemSelected: {
    backgroundColor: colors['state/pressed'],
  },
  itemPressed: {
    backgroundColor: colors['state/pressed'],
  },
  itemLabel: {
    flex: 1,
    fontFamily: Typography.body.large.fontFamily,
    fontSize: Typography.body.large.fontSize,
    fontWeight: Typography.body.large.fontWeight as '500',
    lineHeight: Typography.body.large.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
  },
});
