import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle} from 'react-native';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {SvgProps} from 'react-native-svg';
import {GlassContainer} from '@components/Container';
import {TextInput} from '@components/TextInput';
import {IconSearch, IconChevronLeft} from '@components/Icon/IconIndex';
import {AppIcon} from '@components/Icon/AppIcon';
import {useColors} from '@contexts/ThemeContext';
import {MenuItem} from './MenuItem';
import {Subheader} from './Subheader';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {Typography} from '@constants/typography';

export interface MenuItemData {
  id: string;
  label: string;
  icon?: React.FC<SvgProps>;
  iconColor?: string;
  /** 체크박스 표시 (undefined이면 체크박스 없음) */
  checked?: boolean;
  /** 하위 메뉴가 있는 항목 (우측 화살표 표시) */
  hasChildren?: boolean;
  /** 우측 텍스트 (예: 재료 양) */
  trailingText?: string;
  /** 비공개 표시 — 이름 뒤 눈 감은 아이콘 */
  hiddenMark?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** 하단 구분선 */
  showDivider?: boolean;
}

export interface MenuSection {
  title?: string;
  items?: MenuItemData[];
  selectedId?: string;
  /** items 대신 임의 요소를 섹션 본문으로 렌더 (예: 아이콘 탭) */
  content?: React.ReactNode;
}

export interface MenuProps {
  title?: string;
  items?: MenuItemData[];
  /** 여러 섹션으로 구성된 메뉴 (title/items 대신 사용) */
  sections?: MenuSection[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onClose?: () => void;
  style?: ViewStyle;
  /** 메뉴 표시 여부 */
  visible?: boolean;
  /** 최대 높이 (초과 시 스크롤) */
  maxHeight?: number;
  /** 검색바 표시 */
  searchable?: boolean;
  /** 메뉴 최상단에 고정으로 렌더할 한 줄 노드(예: 작성자 정보). */
  headerNode?: React.ReactNode;
  /**
   * 하위 목록 — 지정하면 메뉴를 덮고 상단에 뒤로가기가 붙는다(아이폰 설정 방식).
   * 항목 아래에 펼치면 목록이 길어지고 어디에 딸린 것인지도 흐려진다.
   */
  subMenu?: {title: string; items?: MenuItemData[]; selectedId?: string} | null;
  /** 하위 목록에서 뒤로 */
  onSubMenuBack?: () => void;
}

export function Menu({
  title,
  items,
  sections,
  selectedId,
  onSelect,
  onClose,
  style,
  visible = true,
  maxHeight,
  searchable = false,
  headerNode,
  subMenu,
  onSubMenuBack,
}: MenuProps) {
  const styles = useThemedStyles(createStyles);
  // 메뉴 폭은 가장 긴 이름이 한 줄에 들어가게 — 좁은 버튼에 붙은 메뉴는 그 폭에 맞춰 이름이 두 줄로 꺾였다.
  // 글자 폭은 대략(한글 약 17px, 영문 약 9px) + 아이콘·여백. 화면 폭은 넘지 않는다.
  const allLabels = [...(items ?? []), ...(sections ?? []).flatMap(sec => sec.items ?? [])].map(i => i.label);
  // 글자 폭 추정(본문 16px 기준) — 한글 ≈16, 영문 소문자 ≈8, 대문자 ≈10, 공백 ≈4.
  // 남는 폭 = 아이콘 20 + 아이콘·글자 간격 + 항목 좌우 여백 + 메뉴 안쪽 여백 ≈ 64. 넉넉히 잡으면 메뉴가 휑하게 길어졌다
  const charW = (ch: string) => (/[가-힣]/.test(ch) ? 16 : /\s/.test(ch) ? 4 : /[A-Z]/.test(ch) ? 10 : 8);
  const textW = Math.max(0, ...allLabels.map(l => [...l].reduce((w, ch) => w + charW(ch), 0)));
  // 최대 320 — 'Official recipe books' 정도까지는 한 줄, 그보다 긴 이름(레시피 제목 등)만 두 줄로 꺾인다
  const MENU_MAX_WIDTH = 320;
  const menuMinWidth = Math.min(Math.max(200, textW + 64), MENU_MAX_WIDTH, SCREEN_W - 32);
  const colors = useColors();
  const {t} = useTranslation();
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items?.filter(item => item.label.toLowerCase().includes(q));
  }, [searchable, searchQuery, items]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      scale.setValue(0.95);
      opacity.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      setSearchQuery('');
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, scale, opacity]);

  if (!shouldRender) return null;

  return (
    <>
      {/* 바깥 터치 시 닫기 오버레이 */}
      {visible && onClose && (
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />
      )}
      <Animated.View
        style={[
          style,
          {
            opacity,
            transform: [{scale}],
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}>
        {/* 메뉴는 목록 위에 겹쳐 뜨므로 배경이 불투명해야 한다 — blur만으로는
            뒤 텍스트가 그대로 비쳐 읽을 수 없다(안드로이드는 blur가 더 약하다). */}
        <GlassContainer
          borderRadius="lg"
          // 목록 위에 떠 있으므로 한 단계 짙게 — normal은 배경과 잘 분리되지 않는다
          elevation="strong"
          contentStyle={{padding: Spacing.xs, minWidth: menuMinWidth, maxWidth: Math.min(MENU_MAX_WIDTH, SCREEN_W - 32), backgroundColor: colors['surface/normal'], ...(maxHeight ? {maxHeight} : {})}}>
          {/* 하위 목록이 열리면 메뉴를 덮는다 — 뒤로가기로 돌아온다 */}
          {subMenu ? (
            <>
              <Pressable style={styles.subHeader} onPress={onSubMenuBack}>
                <AppIcon icon={IconChevronLeft} size="xs" color={colors['foreground/on-surface']} />
                <Text style={styles.subHeaderTitle} numberOfLines={1}>{subMenu.title}</Text>
              </Pressable>
              <ScrollView bounces={false} showsVerticalScrollIndicator={maxHeight != null}>
                {subMenu.items?.map(item => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    selected={item.id === subMenu.selectedId}
                    onPress={() => onSelect?.(item.id)}
                  />
                ))}
              </ScrollView>
            </>
          ) : (
          <>
          {headerNode}
          {searchable && (
            <View style={styles.searchBar}>
              <TextInput
                placeholder={t('menu.searchPlaceholder')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style="ghost"
                size="small"
                leadingIcon={<AppIcon icon={IconSearch} size="xs" color={colors['foreground/on-surface-muted']} />}
              />
            </View>
          )}
          <ScrollView bounces={false} showsVerticalScrollIndicator={maxHeight != null}>
          {sections ? (
            sections.map((section, idx) => (
              <React.Fragment key={idx}>
                {section.title && <Subheader title={section.title} />}
                {section.content ?? section.items?.map(item => (
                  <MenuItem
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    selected={item.id === (section.selectedId ?? selectedId)}
                    checked={item.checked}
                    hasChildren={item.hasChildren}
                    trailingText={item.trailingText}
                    hiddenMark={item.hiddenMark}
                    destructive={item.destructive}
                    disabled={item.disabled}
                    showDivider={item.showDivider}
                    onPress={() => onSelect?.(item.id)}
                  />
                ))}
              </React.Fragment>
            ))
          ) : (
            <>
              {title && <Subheader title={title} />}
              {filteredItems?.map(item => (
                <MenuItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  selected={item.id === selectedId}
                  checked={item.checked}
                  hasChildren={item.hasChildren}
                  trailingText={item.trailingText}
                  hiddenMark={item.hiddenMark}
                  destructive={item.destructive}
                  disabled={item.disabled}
                  showDivider={item.showDivider}
                  onPress={() => onSelect?.(item.id)}
                />
              ))}
            </>
          )}
          </ScrollView>
          </>
          )}
        </GlassContainer>
    </Animated.View>
    </>
  );
}

// 바깥 탭 영역이 조상의 overflow:hidden에 잘려도 화면을 덮도록, 화면 대각선만큼 넓힌다.
const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const BACKDROP_SPREAD = Math.round(Math.sqrt(SCREEN_W * SCREEN_W + SCREEN_H * SCREEN_H));

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 하위 목록 상단 — 뒤로가기 + 제목
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  subHeaderTitle: {
    ...Typography.caption.large,
    color: colors['foreground/on-surface'],
    flex: 1,
  },
  // 바깥 탭 닫기 영역. absolute + 큰 음수 오프셋은 조상의 overflow:hidden에 잘려
  // 카드 바깥/다른 묶음을 탭해도 안 닫히는 문제가 있었다. 화면 대각선 길이만큼
  // 사방으로 넓혀 어느 조상에 클립되더라도 보이는 영역 전체를 덮게 한다.
  backdrop: {
    position: 'absolute' as const,
    top: -BACKDROP_SPREAD,
    left: -BACKDROP_SPREAD,
    right: -BACKDROP_SPREAD,
    bottom: -BACKDROP_SPREAD,
  },
  searchBar: {
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
  },
});
