import React, {useEffect, useRef, useState} from 'react';
import {Animated, Dimensions, Easing, StyleSheet, View} from 'react-native';
import {FloatingNavBar, NAV_PILL_HEIGHT, navPillStyle} from '@components/Navigation';
import {Breadcrumb} from '@components/Navigation/Breadcrumb';
import {GlassContainer, MAX_CONTENT_WIDTH} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconAdd, IconEllipsisVertical} from '@components/Icon/IconIndex';
import {Menu} from '@components/Menu';
import {EmptyState} from '@components/EmptyState';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {parseSession} from '@utils/session';
import {buildPaperPreview} from '@utils/recipePaperPreview';
import type {Recipe} from '../../types/recipe';
import {type PackBoardItem} from './PackBoard';
import {PackCanvas} from './PackCanvas';
import type {PackOriginRect} from './RecipePack';
import {SessionFlow, type SessionFlowItem} from './SessionFlow';
import {triggerHaptic} from '@utils/haptics';

// 이미지 미등록 레시피는 랜덤 샘플을 매핑하지 않고 종이(paperPreview)로 폴백한다.
// (커버 recipeCoverCards와 동일 규칙 — 엉뚱한 이미지 매핑 방지)

export interface GroupExpandOverlayProps {
  /** 펼쳐서 보여줄 그룹 라벨 (레시피 북 이름 / 공법명 등) */
  activeLabel: string;
  /** 브레드크럼 1뎁스 축 라벨 (예: '레시피 북' / '공법'). 리스트뷰 앱바와 공통 */
  axisLabel: string;
  /** 전체 그룹 목록 (오버레이 안에서 셀렉트로 전환). 1개면 셀렉트 숨김 */
  groups: {label: string; items: Recipe[]}[];
  /** 전체 레시피 (같은 시리즈 회차 복원용 — 회차 체인 펼침에 사용) */
  allRecipes: Recipe[];
  origin: PackOriginRect;
  onClose: () => void;
  onRecipePress?: (recipeId: string) => void;
  /** 어드민 여부 — 둘러보기(공식) 레시피 북 편집/삭제 노출 게이트 */
  isAdmin?: boolean;
  /** 해당 그룹명이 둘러보기(공식) 레시피 북인지 판별 (편집/삭제 라우팅용) */
  isExploreName?: (name: string) => boolean;
  /** 현재 레시피 북에 레시피 추가 (없으면 + 버튼 숨김) — 리스트뷰 앱바와 공통 */
  onAddRecipe?: (cookbookName: string) => void;
  /** 레시피 북 편집 (없으면 메뉴 항목 숨김) */
  onEditCookbook?: (name: string, isExplore: boolean) => void;
  /** 레시피 북 삭제 */
  onDeleteCookbook?: (name: string, isExplore: boolean) => void;
  /** PDF 다운로드 */
  onDownloadPdf?: () => void;
}

export function GroupExpandOverlay({activeLabel, axisLabel, groups, allRecipes, origin, onClose, onRecipePress, isAdmin, isExploreName, onAddRecipe, onEditCookbook, onDeleteCookbook, onDownloadPdf}: GroupExpandOverlayProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const progress = useRef(new Animated.Value(0)).current;
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(activeLabel);
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // 회차 플로우 펼침 상태 (멀티 회차 팩을 탭하면 보드 안에서 회차 카드들로 펼침)
  const [flow, setFlow] = useState<{
    packId: string;
    sessions: SessionFlowItem[];
    origin: PackOriginRect;
    root: {imageUrl?: string | number; title: string; count: number};
  } | null>(null);

  const recipes = groups.find(g => g.label === active)?.items ?? [];
  const methodMenuItems = groups.map(g => ({id: g.label, label: g.label}));
  const showSelector = groups.length > 1;

  // 리스트뷰 앱바와 동일한 더보기 액션: 레시피 북 편집/삭제(+공식은 어드민 전용) · PDF 다운로드
  const activeIsExplore = isExploreName?.(active) ?? false;
  const canEditDelete = !activeIsExplore || !!isAdmin; // 일반 북은 모두, 공식 북은 어드민만
  const moreItems = [
    ...(canEditDelete && onEditCookbook ? [{id: 'edit', label: t('groupExpandOverlay.editCookbook')}] : []),
    ...(canEditDelete && onDeleteCookbook ? [{id: 'delete', label: t('groupExpandOverlay.deleteCookbook')}] : []),
    ...(onDownloadPdf ? [{id: 'pdf', label: t('groupExpandOverlay.downloadPdf')}] : []),
  ];
  const hasRight = !!onAddRecipe || moreItems.length > 0;

  const {width: W, height: H} = Dimensions.get('window');
  const originCx = origin.x + origin.width / 2;
  const originCy = origin.y + origin.height / 2;
  const startScale = origin.width > 0 ? Math.max(0.12, origin.width / W) : 0.2;

  // 도착 화면: 해당 공법 레시피들을 흩뿌림 (시리즈는 최신 회차 1팩으로 묶임)
  // 멀티 회차면 회차 수 뱃지 + 탭 시 세로 체인 펼침, 단일이면 바로 상세로
  const items: PackBoardItem[] = recipes.map(r => {
    const total = parseSession(r.session).total;
    const multi = total > 1;
    const subtitle = [r.cookbook || '', multi ? t('groupExpandOverlay.sessionCount', {count: total}) : ''].filter(Boolean).join(' · ');
    const key = r.remakeGroupId ?? r.id;
    const lineage = multi
      ? allRecipes
          .filter(x => (x.remakeGroupId ?? x.id) === key)
          .sort((a, b) => parseSession(a.session).current - parseSession(b.session).current)
      : [r];
    // #번호·라벨 모두 session 문자열이 아니라 정렬된 lineage 위치(1-based) 기준.
    // 그룹이 1개(단일)면 displayNumber 0 → # 표시 안 함.
    const sessions: SessionFlowItem[] = lineage.map((x, i) => ({
      id: x.id,
      title: x.title,
      imageUrl: x.imageUri,
      paperPreview: buildPaperPreview(x),
      displayNumber: multi ? i + 1 : 0,
      sessionLabel: t('groupExpandOverlay.sessionLabel', {current: i + 1}),
    }));
    // 원본 팩: 멀티면 회차 종이들(뒤) + 썸네일(앞), 단일이면 이미지 카드.
    // 이미지 없으면 undefined → paperPreview로 종이 렌더 (랜덤 샘플 매핑 안 함)
    const thumb = r.imageUri;
    // 썸네일이 항상 맨 앞(배열 마지막=앞), 그 뒤로 회차순(1회차→뒤). 종이는 2장까지만.
    const cards = multi
      ? [
          ...sessions
            .slice(0, 2)
            .reverse()
            .map(s => ({title: s.displayNumber > 0 ? `${s.title} #${s.displayNumber}` : s.title, paperPreview: s.paperPreview})),
          {imageUrl: thumb, title: r.title, paperPreview: buildPaperPreview(r)},
        ]
      : [{imageUrl: thumb, title: r.title, paperPreview: buildPaperPreview(r)}];
    return {
      id: r.id,
      title: r.title,
      subtitle,
      cards,
      count: total,
      onPress: (rect: PackOriginRect) => {
        if (multi && sessions.length > 1) {
          triggerHaptic('light');
          setFlow({packId: r.id, sessions, origin: rect, root: {imageUrl: thumb, title: r.title, count: total}});
          return;
        }
        onRecipePress?.(r.id);
      },
    };
  });

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    Animated.timing(progress, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  // 뒤로 가기 버튼은 페이지(라우트) 이동 전용 — 오버레이/회차 펼침은 가로채지 않는다.
  // 공법 펼침·회차 펼침·앱바 변화는 모두 오버레이라, 자체 컨트롤(‹ 버튼·바깥 탭)로만 닫는다.


  // 배경(다른 팩)이 빠르게 사라지는 페이드
  const panelOpacity = progress.interpolate({inputRange: [0, 0.35, 1], outputRange: [0, 1, 1]});

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View style={[styles.panel, {opacity: panelOpacity}]}>
        <FloatingNavBar
          left={
            <View style={styles.navLeftRow}>
              {/* 리스트뷰 앱바와 공통: [축] › [항목] 브레드크럼. 축 탭=닫기(상위로), 항목 탭=그룹 전환 */}
              <View>
                <Breadcrumb
                  axisLabel={axisLabel}
                  itemLabel={active}
                  onBack={close}
                  onItemPress={showSelector ? () => setShowMethodMenu(prev => !prev) : undefined}
                />
                {showSelector && (
                  <Menu
                    items={methodMenuItems}
                    selectedId={active}
                    onSelect={id => { setShowMethodMenu(false); setActive(id); }}
                    visible={showMethodMenu}
                    style={styles.methodMenu}
                  />
                )}
              </View>
            </View>
          }
          right={hasRight ? (
            <GlassContainer contentStyle={navPillStyle}>
              {onAddRecipe && (
                <IconButton
                  icon={IconAdd}
                  onPress={() => onAddRecipe(active)}
                  variant="ghost-primary"
                  size="medium"
                />
              )}
              {moreItems.length > 0 && (
                <IconButton
                  icon={IconEllipsisVertical}
                  onPress={() => setShowMoreMenu(prev => !prev)}
                  variant="ghost-primary"
                  size="medium"
                  forcePressed={showMoreMenu}
                />
              )}
            </GlassContainer>
          ) : undefined}
          rightMenu={moreItems.length > 0 ? (
            <Menu
              items={moreItems}
              visible={showMoreMenu}
              onSelect={id => {
                setShowMoreMenu(false);
                if (id === 'edit') onEditCookbook?.(active, activeIsExplore);
                else if (id === 'delete') onDeleteCookbook?.(active, activeIsExplore);
                else if (id === 'pdf') onDownloadPdf?.();
              }}
              style={styles.moreMenu}
            />
          ) : undefined}
        />
        {/* 보드: 팬/핀치로 로밍. 플로우가 떠 있는 동안엔 다른 팩들 흐리게 */}
        {recipes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              category="no-recipe"
              title={t('groupExpandOverlay.emptyTitle')}
              subtitle={t('groupExpandOverlay.emptySubtitle')}
            />
          </View>
        ) : (
          <PackCanvas items={items} entrance={!closing} dimExceptId={flow?.packId} />
        )}
      </Animated.View>

      {/* 회차 플로우: 탭한 팩(origin) 그 자리에서 회차들이 슥 나옴 (화면 전환 X, 보드 위 투명 오버레이) */}
      {flow && (
        <SessionFlow
          sessions={flow.sessions}
          origin={flow.origin}
          root={flow.root}
          onSelect={id => { setFlow(null); onRecipePress?.(id); }}
          onClose={() => setFlow(null)}
        />
      )}
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  root: {
    zIndex: 100,
    elevation: 100,
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors['surface/dim'],
  },
  navLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  methodMenu: {
    position: 'absolute',
    top: NAV_PILL_HEIGHT + Spacing.xs,
    left: 0,
    zIndex: 20,
  },
  moreMenu: {
    position: 'absolute',
    top: NAV_PILL_HEIGHT + Spacing.xs,
    right: 0,
    zIndex: 20,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: 80,
    paddingBottom: 120,
    // 콘텐츠가 짧으면 상하 중앙으로 (위로 쏠림 방지), 길면 정상 스크롤
    flexGrow: 1,
    justifyContent: 'center',
  },
  boardWrap: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
