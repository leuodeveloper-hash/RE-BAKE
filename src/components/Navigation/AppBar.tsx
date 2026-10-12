import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {
  IconAdd,
  IconCircleInfo,
  IconFilter,
  IconSearch,
  IconEllipsisVertical,
  IconSettings,
  IconLogoSymbol,
} from '@components/Icon/IconIndex';
import {useRouter} from 'expo-router';
import {APPBAR_ITEM_GAP, NAV_PILL_HEIGHT} from '@constants/layout';
import {useAuth} from '@contexts/AuthContext';
import {useColors} from '@contexts/ThemeContext';
import {triggerHaptic} from '@utils/haptics';
import {IconButton} from '@components/IconButton';
import {NavPillButton} from './NavPillButton';
import {Selector} from '@components/Selector';
import {GlassContainer} from '@components/Container';
import {useTranslation} from '@contexts/LanguageContext';
import {FloatingNavBar, navPillStyle} from './FloatingNavBar';

/** 로그인 전 앱바 로고 칸 폭 — 로고 24 + 좌우 4 */
const GUEST_LOGO_WIDTH = 24 + 4 * 2;

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
  /** 오른쪽을 이 요소로 통째로 대신한다(예: 소개 화면의 [로그인]) */
  rightNode?: React.ReactNode;
  /** 설정(톱니) — 주면 오른쪽 알약 뒤에 따로 붙는다(홈=내 화면에서 설정 진입) */
  onSettingsPress?: () => void;
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
  /**
   * 셀렉터 알약 옆에 나란히 붙는 줄(예: 레시피북 탭).
   * 아래 줄로 두면 세로를 한 줄 더 먹는다 — 같은 줄에 두고 넘치면 가로로 민다.
   */
  below?: React.ReactNode;
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
  onSettingsPress,
  rightNode,
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
  below,
}: AppBarProps) {
  const {t} = useTranslation();
  const resolvedTitle = title ?? t('appBar.allRecipeBooks');
  const router = useRouter();
  const {user} = useAuth();
  const colors = useColors();
  // 로그인 전엔 맨 왼쪽에 로고 — 누르면 소개(랜딩) 화면. 뒤로가기가 있는 화면은 그 자리를 비워 둔다
  // 셀렉터 앞에 붙는 것(로고·닫기 버튼)의 폭 — 왼쪽 메뉴를 그만큼 밀어 셀렉터에 맞춘다
  const menuOffset = (!user && !leftIcon ? GUEST_LOGO_WIDTH + APPBAR_ITEM_GAP : 0)
    + (leftIcon ? NAV_PILL_HEIGHT + APPBAR_ITEM_GAP : 0);
  const guestLogo = !user && !leftIcon
    ? (
      // 글래스 알약 없이 로고만 — 버튼이 아니라 브랜드 표시
      <Pressable
        hitSlop={8}
        style={styles.guestLogo}
        onPress={() => { triggerHaptic('light'); router.push('/welcome' as any); }}>
        <IconLogoSymbol width={24} height={24} color={colors['foreground/on-surface']} />
      </Pressable>
    )
    : null;

  if (centered) {
    // 일반 모드와 같은 껍데기(FloatingNavBar)를 쓴다 — 직접 View로 그리면
    // 그라디언트 배경이 빠지고 상하 여백도 달라져 다른 화면과 어긋난다.
    return (
      <FloatingNavBar
        title={resolvedTitle}
        left={leftIcon ? <NavPillButton icon={leftIcon} onPress={onLeftPress} /> : undefined}
        right={rightIcon ? <NavPillButton icon={rightIcon} onPress={onRightPress} /> : undefined}
        rightMenu={rightMenu}
      />
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
        // below(레시피북 탭)는 셀렉터 뒤에 이어 붙인다.
        leftIcon || below || guestLogo ? (
          <View style={styles.leftRow}>
            {guestLogo}
            {leftIcon ? <NavPillButton icon={leftIcon} onPress={onLeftPress} /> : null}
            {leftContent}
            {below ? <View style={styles.leftTabs}>{below}</View> : null}
          </View>
        ) : leftContent
      }
      leftFull={!!below}
      right={
        rightNode ? rightNode : hasRightButtons || onSettingsPress ? (
          <View style={styles.rightRow}>
          {hasRightButtons ? (
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
          ) : null}
          {onSettingsPress ? <NavPillButton icon={IconSettings} onPress={onSettingsPress} /> : null}
          </View>
        ) : undefined
      }
      // 왼쪽 메뉴는 연 셀렉터 기준 좌정렬 — 앞에 로고·닫기 버튼이 있으면 그만큼 민다
      leftMenu={titleMenu && menuOffset > 0 ? <View style={{marginLeft: menuOffset}}>{titleMenu}</View> : titleMenu}
      rightMenu={rightMenu}
    />
  );
}

const styles = StyleSheet.create({
  // 로고 — 알약(44) 높이에 맞춰 가운데
  guestLogo: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: APPBAR_ITEM_GAP,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: APPBAR_ITEM_GAP,
  },
  // 셀렉터 옆 탭 — 남는 폭만 쓰고 넘치면 그 안에서 가로 스크롤.
  // 셀렉터(44)와 탭(40) 높이가 달라 가운데로 맞춘다.
  leftTabs: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
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

