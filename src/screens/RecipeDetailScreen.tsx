import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {LockedBottomBar} from '@components/LockedBottomBar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {FloatingNavBar, navPillStyle, NAV_PILL_HEIGHT} from '@components/Navigation';
import {GlassContainer, ContentContainer, Card} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {SectionHeader} from '@components/SectionHeader';
import {Selector} from '@components/Selector';
import {ListItem} from '@components/ListItem';
import {Menu} from '@components/Menu';
import {Tabs} from '@components/Tabs';
import {EditableChip} from '@components/EditableChip';
import {OptionTile} from '@components/OptionTile';
import {PdfPreviewDialog, TimeDialog, ServingsDialog, UnlockDialog} from '@components/Dialog';
import type {ReviewData} from '@components/Dialog';
import {CookingMode} from '@components/CookingMode';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {getRecipeMenuItems, getCookbookSubmenuItems} from '@utils/recipeMenuItems';
import {
  IconClose,
  IconPlayFilled,
  IconEllipsisVertical,
  IconClockFilled,
  IconUsersRoundFilled,
  IconHash,
  IconArrowDownToLine,
  IconChevronRight,
  IconCornerDownRight,
} from '@components/Icon/IconIndex';

// 메타 정보 타입
interface MetaInfo {
  icon: React.FC<any>;
  label: string;
  onPress?: () => void;
}

// 재료 타입 (props 입력용 - percentage 없음)
interface IngredientInput {
  name: string;
  amount: string;
}

interface IngredientGroupInput {
  title: string;
  ingredients: IngredientInput[];
}

// 도구 타입
interface Tool {
  name: string;
}

// 과정 타입
interface ProcessStep {
  step: number;
  description: string;
  tip?: string;
  caution?: string;
  photos?: string[];
  ingredients?: {name: string; amount: string}[];
}

interface ProcessStepGroup {
  title: string;
  steps: ProcessStep[];
}

export interface RecipeDetailScreenProps {
  /** 레시피 ID (shared element transition tag 용) */
  id?: string;
  title?: string;
  cookbook?: string;
  method?: string;
  reviewCount?: number;
  ratio?: string;
  reviews?: ReviewData[];
  imageUri?: string;
  time?: string;
  servings?: string;
  session?: string;
  ingredientGroups?: IngredientGroupInput[];
  tools?: Tool[];
  steps?: ProcessStep[];
  stepGroups?: ProcessStepGroup[];
  activeFieldIds?: string[];
  onBack?: () => void;
  onAddPress?: () => void;
  onMenuPress?: () => void;
  onComingSoon?: () => void;
  onEdit?: (section?: string) => void;
  onDelete?: () => void;
  onRemake?: () => void;
  /** 둘러보기에서 진입 시: 내 레시피로 복사 */
  onImport?: () => void;
  /** 인라인 편집 시: 변경 데이터 전달 */
  onUpdate?: (data: Record<string, any>) => void;
  /** 쿠킹모드 표시 상태 변경 콜백 */
  onCookingModeChange?: (visible: boolean) => void;
  /** 회차 목록 (2개 이상일 때 Selector 표시) */
  sessionItems?: {id: string; label: string}[];
  /** 회차 선택 시 이동 */
  onSessionSelect?: (recipeId: string) => void;
  /** 요리책 변경 콜백 (있을 때만 요리책 메뉴 표시) */
  onCookbookChange?: (cookbook: string) => void;
  /** 요리책 목록 (요리책 서브메뉴용) */
  availableCookbooks?: string[];
  /** 요리책 색상 매핑 (요리책 서브메뉴용) */
  cookbookColors?: Record<string, import('@components/Avatar/Avatar').AvatarColor>;
  /** 잠금 상태 (paywall): 스크롤 비활성 + 하단 잠금해제 버튼 */
  locked?: boolean;
  /** 잠금 해제 요청 (광고 시청) */
  onUnlock?: () => void;
  /** 광고 로딩 중 여부 */
  adLoading?: boolean;
}

// 베이커스 퍼센티지 자동계산
function parseAmountGrams(amount: string): number {
  const match = amount.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function formatPercentage(value: number): string {
  if (value === 0) return '-';
  const rounded = Math.round(value * 10) / 10;
  return rounded === Math.floor(rounded) ? `${rounded}%` : `${rounded}%`;
}

function computeBakersPercentages(
  groups: IngredientGroupInput[],
): {title: string; ingredients: {percentage: string; name: string; amount: string}[]}[] {
  const baseAmount = parseAmountGrams(groups[0]?.ingredients[0]?.amount ?? '0');

  return groups.map(group => ({
    title: group.title,
    ingredients: group.ingredients.map(ing => {
      const amount = parseAmountGrams(ing.amount);
      const pct = baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
      return {
        percentage: formatPercentage(pct),
        name: ing.name,
        amount: ing.amount,
      };
    }),
  }));
}

const DEFAULT_INGREDIENT_GROUPS: IngredientGroupInput[] = [
  {title: '가루류', ingredients: [
    {name: '박력분', amount: '500g'},
    {name: '베이킹소다', amount: '2g'},
    {name: '베이킹파우더', amount: '8g'},
    {name: '코코아파우더', amount: '60g'},
    {name: '탈지분유', amount: '30g'},
  ]},
  {title: '반죽재료', ingredients: [
    {name: '설탕', amount: '30g'},
    {name: '버터', amount: '300g'},
    {name: '달걀', amount: '300g'},
    {name: '소금', amount: '5g'},
    {name: '물', amount: '175g'},
  ]},
  {title: '토핑', ingredients: [
    {name: '초코칩', amount: '180g'},
  ]},
];

const DEFAULT_TOOLS: Tool[] = [
  {name: '계량기'},
  {name: '계량스푼'},
  {name: '믹싱볼'},
  {name: '가스레인지'},
  {name: '거품기'},
  {name: '채망'},
  {name: '짤주머니'},
  {name: '고무주걱'},
  {name: '나무주걱'},
  {name: '나무꼬치'},
  {name: '머핀 팬'},
  {name: '머핀 유산지'},
  {name: '오븐'},
];

const DEFAULT_STEPS: ProcessStep[] = [
  {step: 1, description: '가루 재료를 섞어서 체 쳐요.', tip: '박력분·베이킹소다·베이킹파우더·코코아파우더·탈지분유'},
  {step: 2, description: '버터를 중탕으로 10% 정도 녹여요.', tip: '버터를 중탕한 물에 재료인 물을 따뜻해지게 담아놔요.'},
  {step: 3, description: '버터를 믹싱볼에 넣고 부드럽게 풀어주고 설탕과 소금을 넣고 섞어요.', tip: '설탕이 60% 정도 용해되고 아이보리색 될 때까지, 스크래핑해주며 충분히 믹싱해요!'},
  {step: 4, description: '달걀 3회 나눠서 넣어요.', tip: '1,2회는 노른자 위주, 3회에 흰자를 넣어요. 저속~중속~고속으로 섞어서 부드러워질 때까지!'},
  {step: 5, description: '체 친 가루를 넣고 11자로 섞어요.', tip: '밑면, 옆면을 긁고 주걱으로 11자를 그리며 날가루 안 보일 때까지 섞어요.'},
  {step: 6, description: '중탕했던 물을 넣고 섞어요.', tip: '물이 없어질 때까지 섞어요. 섞을 때는 나무주걱, 옆면을 긁을 때는 고무주걱이 편해요!'},
  {step: 7, description: '3분의 1정도 남기고 초코칩을 넣어서 섞어요.', tip: '다 넣어도 괜찮지만 3분의 1정도는 반죽 위에 토핑처럼 올려줘도 좋아요!'},
  {step: 8, description: '짤주머니에 반죽을 넣고 깍지 안 끼고 짜요.', tip: '천 짤주머니 추천! 1cm 띄고 직각으로 가운데서 쭉 눌러서 50~60%로 24개 채운 후 나머지 반죽을 모자란 부분에 더 채워요.'},
  {step: 9, description: '남겨둔 초코칩을 위에 토핑으로 올려요.', tip: '반죽이 골고루 되도록 오븐에 넣기 전 팬을 한번 탕하고 쳐요.'},
  {step: 10, description: '180/160도에서 15분 굽고 부풀어 오르면 170/150도로 15분 정도 더 구워요.'},
  {step: 11, description: '다 구워진 후 팬에서 빼서 평철판 위에서 냉각시켜요.', tip: '나무꼬치로 꽂아서 반죽이 안 묻어 나오면 다 익은 것!'},
];

const SECTION_TABS = [
  {id: 'ingredients', label: '재료'},
  {id: 'tools', label: '과정'},
  {id: 'review', label: '회고'},
];


export function RecipeDetailScreen({
  id,
  title = '레시피 이름',
  cookbook,
  method,
  reviewCount = 0,
  ratio,
  reviews,
  imageUri,
  time = '1시간 30분',
  servings = '1개',
  session = '1/3 회차',
  ingredientGroups = DEFAULT_INGREDIENT_GROUPS,
  tools = DEFAULT_TOOLS,
  steps = DEFAULT_STEPS,
  stepGroups,
  activeFieldIds,
  onBack,
  onAddPress,
  onComingSoon,
  onEdit,
  onDelete,
  onRemake,
  onImport,
  onUpdate,
  onCookingModeChange,
  sessionItems,
  onSessionSelect,
  onCookbookChange,
  availableCookbooks,
  cookbookColors,
  locked = false,
  onUnlock,
  adLoading = false,
}: RecipeDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const canEdit = !!onUpdate;

  // 필드 활성 여부 헬퍼
  const isFieldActive = (id: string) => !activeFieldIds || activeFieldIds.includes(id);

  // 서브타이틀 (활성 필드에 따라 동적 구성)
  const subtitle = (() => {
    const parts: string[] = [cookbook];
    if (method && isFieldActive('method')) parts.push(method);
    if (ratio && isFieldActive('ratio')) parts.push(`비중 ${ratio}`);
    if (!onImport) {
      parts.push(`${reviews?.length ?? 0}개의 회고`);
    }
    return parts.join(' · ');
  })();
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [showCookbookSubmenu, setShowCookbookSubmenu] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showServingsDialog, setShowServingsDialog] = useState(false);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [cookingModeInitialIndex, setCookingModeInitialIndex] = useState(0);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const hasMultipleSessions = sessionItems && sessionItems.length > 1;
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  // ---- 스크롤 기반 탭 추적 ----
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({ingredients: 0, tools: 0, review: 0});
  const [activeTab, setActiveTab] = useState('ingredients');
  const activeTabRef = useRef('ingredients');

  const handleDetailScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;

    const positions = sectionPositions.current;
    const navOffset = 100;
    let newTab = 'ingredients';
    if (positions.review > 0 && y + navOffset >= positions.review) newTab = 'review';
    else if (positions.tools > 0 && y + navOffset >= positions.tools) newTab = 'tools';
    if (newTab !== activeTabRef.current) {
      activeTabRef.current = newTab;
      setActiveTab(newTab);
    }
  }, []);

  const handleTabPress = useCallback((tabId: string) => {
    const y = sectionPositions.current[tabId];
    if (y !== undefined && scrollViewRef.current) {
      (scrollViewRef.current as any).scrollTo({y: Math.max(0, y - 80), animated: true});
    }
  }, []);

  useEffect(() => {
    onCookingModeChange?.(showCookingMode);
  }, [showCookingMode, onCookingModeChange]);

  // ---- 기존 로직 ----
  const computedGroups = useMemo(() => computeBakersPercentages(ingredientGroups), [ingredientGroups]);

  const menuItems = useMemo(() =>
    getRecipeMenuItems({
      session,
      showImport: !!onImport,
      showRemake: !!onRemake,
      showEdit: !!onEdit,
      showDelete: !!onDelete,
      showCookbook: !!onCookbookChange,
    }),
  [onImport, onRemake, onEdit, onDelete, onCookbookChange, session]);

  const cookbookSubmenu = useMemo(() => {
    if (!onCookbookChange || !availableCookbooks) return null;
    return getCookbookSubmenuItems({
      availableCookbooks,
      cookbookColors: cookbookColors ?? {},
      currentCookbook: cookbook ?? '',
      colors,
    });
  }, [onCookbookChange, availableCookbooks, cookbookColors, cookbook, colors]);

  const handleMenuPress = () => {
    setShowMenu(prev => !prev);
    setShowCookbookSubmenu(false);
  };

  const handleMenuSelect = (id: string) => {
    if (id === 'cookbook') {
      setShowCookbookSubmenu(true);
      return;
    }
    if (id.startsWith('cookbook:')) {
      const cookbookName = id.slice('cookbook:'.length);
      onCookbookChange?.(cookbookName === '__none__' ? '' : cookbookName);
      setShowMenu(false);
      setShowCookbookSubmenu(false);
      return;
    }
    setShowMenu(false);
    setShowCookbookSubmenu(false);
    if (id === 'save') {
      onImport?.();
    } else if (id === 'remake') {
      onRemake?.();
    } else if (id === 'edit') {
      onEdit?.();
    } else if (id === 'delete') {
      onDelete?.();
    } else if (id === 'download') {
      setShowPdfPreview(true);
    } else {
      onComingSoon?.();
    }
  };

  const handleOverlayPress = () => {
    if (showCookbookSubmenu) {
      setShowCookbookSubmenu(false);
      return;
    }
    setShowMenu(false);
    setShowSessionMenu(false);
  };

  // 페이지 페이드인
  const pageOpacity = useRef(new Animated.Value(0)).current;

  // 스태거드 콘텐츠 애니메이션
  const SECTION_COUNT = 5;
  const sectionAnims = useRef(
    Array.from({length: SECTION_COUNT}, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(24),
    })),
  ).current;

  useEffect(() => {
    Animated.timing(pageOpacity, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const animations = sectionAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 350,
          delay: 150 + i * 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 400,
          delay: 150 + i * 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(animations).start();
  }, []);

  // 메타 정보
  const metaInfo: MetaInfo[] = [
    {icon: IconClockFilled, label: time, onPress: canEdit ? () => setShowTimeDialog(true) : undefined},
    {icon: IconUsersRoundFilled, label: servings, onPress: canEdit ? () => setShowServingsDialog(true) : undefined},
    ...(canEdit ? [{icon: IconHash, label: session}] as MetaInfo[] : []),
  ];

  // ---- 섹션 헤더 렌더 ----
  const renderSectionHeader = (label: string, sectionId: string, breadcrumb?: string) => {
    return (
      <SectionHeader
        title={label}
        breadcrumb={breadcrumb}
        breadcrumbIcon={breadcrumb ? IconChevronRight : undefined}
        actionLabel={onEdit ? '편집' : undefined}
        onAction={onEdit ? () => onEdit(sectionId) : undefined}
      />
    );
  };

  return (
    <Animated.View style={[styles.container, {opacity: pageOpacity}]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleDetailScroll}
        scrollEventThrottle={16}
        scrollEnabled={!locked}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderBg} />
          )}
          <View style={styles.heroTextOverlay} />
          <LinearGradient
            colors={[colors['surface-surfacedim'] + '00', colors['surface-surfacedim']]}
            locations={[0.5, 1]}
            style={styles.heroGradient}
          />
          <View style={styles.heroContentWrapper}>
            <ContentContainer style={styles.heroContent}>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroDescription}>{subtitle}</Text>
            </ContentContainer>
          </View>
        </View>

        {/* Meta Info Cards */}
        <Animated.View style={{opacity: sectionAnims[0].opacity, transform: [{translateY: sectionAnims[0].translateY}]}}>
          <ContentContainer style={styles.metaSection}>
            {metaInfo.map((info, index) => (
              <OptionTile key={index} icon={info.icon} label={info.label} onPress={info.onPress} />
            ))}
          </ContentContainer>
        </Animated.View>

        {/* Ingredients Section */}
        {isFieldActive('ingredients') && (
          <Animated.View
            onLayout={(e) => { sectionPositions.current.ingredients = e.nativeEvent.layout.y; }}
            style={{opacity: sectionAnims[1].opacity, transform: [{translateY: sectionAnims[1].translateY}]}}
          >
            {computedGroups.map((group, groupIndex) => (
              <ContentContainer key={groupIndex} style={groupIndex === 0 ? styles.section : styles.sectionGap}>
                {renderSectionHeader(
                  '재료',
                  'ingredients',
                  computedGroups.length > 1 ? group.title : undefined,
                )}
                <Card>
                  {group.ingredients.map((ingredient, index) => (
                    <View
                      key={index}
                      style={[
                        styles.ingredientRow,
                        index === group.ingredients.length - 1 && styles.ingredientRowLast,
                      ]}>
                      <Text style={styles.ingredientPercentage}>
                        {ingredient.percentage}
                      </Text>
                      <Text style={styles.ingredientName}>
                        {ingredient.name} {ingredient.amount}
                      </Text>
                    </View>
                  ))}
                </Card>
              </ContentContainer>
            ))}
          </Animated.View>
        )}

        {/* Tools Section */}
        <Animated.View
          onLayout={(e) => { sectionPositions.current.tools = e.nativeEvent.layout.y; }}
          style={{opacity: sectionAnims[2].opacity, transform: [{translateY: sectionAnims[2].translateY}]}}
        >
          <ContentContainer style={styles.section}>
            {renderSectionHeader('도구', 'tools')}
            <Card>
              <View style={styles.toolsContainer}>
                <Text style={styles.toolsText}>
                  {tools.map(t => t.name).join(', ')}
                </Text>
              </View>
            </Card>
          </ContentContainer>
        </Animated.View>

        {/* Process Section */}
        {isFieldActive('steps') && (
          <Animated.View style={{opacity: sectionAnims[3].opacity, transform: [{translateY: sectionAnims[3].translateY}]}}>
            {stepGroups ? (
              stepGroups.map((group, groupIndex) => {
                const groupOffset = stepGroups.slice(0, groupIndex).reduce((sum, g) => sum + g.steps.length, 0);
                return (
                <ContentContainer key={groupIndex} style={groupIndex === 0 ? styles.section : styles.sectionGap}>
                  {renderSectionHeader('과정', 'steps', group.title)}
                  <Card>
                    {group.steps.map((step, index) => (
                      <ListItem
                        key={index}
                        leading={{type: 'number', value: step.step}}
                        showDivider={index < group.steps.length - 1}
                        titleNumberOfLines={0}
                        onPress={() => {
                          setCookingModeInitialIndex(groupOffset + index);
                          setShowCookingMode(true);
                        }}
                      >
                        <Text style={styles.stepDescription}>{step.description}</Text>
                        {step.tip && (
                          <View style={styles.tipChipInline}>
                            <EditableChip label={step.tip} variant="tip" />
                          </View>
                        )}
                        {step.caution && (
                          <View style={styles.tipChipInline}>
                            <EditableChip label={step.caution} variant="yellow" />
                          </View>
                        )}
                        {step.photos && step.photos.length > 0 && (
                          <View style={styles.stepThumbnails}>
                            {step.photos.map((uri, i) => (
                              <Image key={`photo-${i}`} source={{uri}} style={styles.stepThumbnail} resizeMode="cover" />
                            ))}
                          </View>
                        )}
                      </ListItem>
                    ))}
                  </Card>
                </ContentContainer>
              );})
            ) : (
              <ContentContainer style={styles.section}>
                {renderSectionHeader('과정', 'steps')}
                <Card>
                  {steps.map((step, index) => (
                    <ListItem
                      key={index}
                      leading={{type: 'number', value: step.step}}
                      showDivider={index < steps.length - 1}
                      titleNumberOfLines={0}
                      onPress={() => {
                        setCookingModeInitialIndex(index);
                        setShowCookingMode(true);
                      }}
                    >
                      <Text style={styles.stepDescription}>{step.description}</Text>
                      {step.tip && (
                        <View style={styles.tipChipInline}>
                          <EditableChip label={step.tip} variant="tip" />
                        </View>
                      )}
                      {step.caution && (
                        <View style={styles.tipChipInline}>
                          <EditableChip label={step.caution} variant="yellow" />
                        </View>
                      )}
                      {step.photos && step.photos.length > 0 && (
                        <View style={styles.stepThumbnails}>
                          {step.photos.map((uri, i) => (
                            <Image key={`photo-${i}`} source={{uri}} style={styles.stepThumbnail} resizeMode="cover" />
                          ))}
                        </View>
                      )}
                    </ListItem>
                  ))}
                </Card>
              </ContentContainer>
            )}
          </Animated.View>
        )}

        {/* Review Section */}
        <Animated.View
          onLayout={(e) => { sectionPositions.current.review = e.nativeEvent.layout.y; }}
          style={{opacity: sectionAnims[4].opacity, transform: [{translateY: sectionAnims[4].translateY}]}}
        >
          <ContentContainer style={styles.section}>
            {renderSectionHeader('회고', 'review')}
            {reviews && reviews.length > 0 ? (
              <Card>
                {reviews[reviews.length - 1].evaluation ? (
                  <ListItem
                    titleNumberOfLines={0}
                    showDivider={!!reviews[reviews.length - 1].improvement}
                  >
                    <Text style={styles.stepDescription}>{reviews[reviews.length - 1].evaluation}</Text>
                  </ListItem>
                ) : null}
                {reviews[reviews.length - 1].improvement ? (
                  <ListItem
                    leading={{type: 'icon', icon: IconCornerDownRight}}
                    titleNumberOfLines={0}
                    showDivider={false}
                  >
                    <Text style={styles.stepDescription}>{reviews[reviews.length - 1].improvement}</Text>
                  </ListItem>
                ) : null}
              </Card>
            ) : (
              <Card>
                <View style={styles.emptyReview}>
                  <Text style={styles.emptyReviewText}>아직 작성된 회고가 없습니다</Text>
                </View>
              </Card>
            )}
          </ContentContainer>
        </Animated.View>

        {/* Bottom Padding for Tab Bar */}
        <View style={{height: 100 + insets.bottom}} />
      </Animated.ScrollView>

      {/* Overlay for Menu */}
      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={showMenu || showSessionMenu ? 'auto' : 'none'}
      />

      {/* Fixed Top Navigation Bar */}
      <FloatingNavBar
        left={
          <View style={styles.navLeftRow}>
            <GlassContainer contentStyle={navPillStyle}>
              <IconButton
                icon={IconClose}
                onPress={onBack}
                variant="ghost-secondary"
                size="medium"
              />
            </GlassContainer>
            {hasMultipleSessions && (
              <View>
                <GlassContainer contentStyle={navPillStyle}>
                  <Selector
                    label={session?.replace(/\/\d+/, '')}
                    showDropdown
                    onPress={() => setShowSessionMenu(prev => !prev)}
                  />
                </GlassContainer>
                <Menu
                  items={sessionItems!}
                  selectedId={sessionItems!.find(s => {
                    const m = session?.match(/(\d+)/);
                    return s.label === `${m?.[1] ?? '1'}회차`;
                  })?.id}
                  onSelect={id => { setShowSessionMenu(false); onSessionSelect?.(id); }}
                  visible={showSessionMenu}
                  style={styles.sessionMenu}
                />
              </View>
            )}
            <GlassContainer contentStyle={styles.tabPillContent}>
              <Tabs
                tabs={SECTION_TABS}
                selectedId={activeTab}
                onSelect={handleTabPress}
                variant="text"
              />
            </GlassContainer>
          </View>
        }
        right={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconPlayFilled}
              onPress={locked ? () => setShowUnlockDialog(true) : () => setShowCookingMode(true)}
              variant="ghost-secondary"
              size="medium"
            />
            <IconButton
              icon={IconArrowDownToLine}
              onPress={locked ? () => setShowUnlockDialog(true) : () => setShowPdfPreview(true)}
              variant="ghost-secondary"
              size="medium"
            />
            <IconButton
              icon={IconEllipsisVertical}
              onPress={locked ? () => setShowUnlockDialog(true) : handleMenuPress}
              variant="ghost-secondary"
              size="medium"
              forcePressed={showMenu}
            />
          </GlassContainer>
        }
        rightMenu={
          showCookbookSubmenu && cookbookSubmenu ? (
            <Menu
              title="요리책"
              items={cookbookSubmenu.items}
              selectedId={cookbookSubmenu.selectedId}
              onSelect={handleMenuSelect}
              visible={showMenu}
            />
          ) : (
            <Menu
              items={menuItems}
              onSelect={handleMenuSelect}
              visible={showMenu}
            />
          )
        }
      />

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        data={{
          title: title ?? '레시피 이름',
          cookbook,
          method,
          reviewCount,
          time,
          servings,
          session,
          ingredientGroups,
          tools,
          steps,
          stepGroups,
        }}
      />

      {/* 시간 다이얼로그 */}
      <TimeDialog
        visible={showTimeDialog}
        onClose={() => setShowTimeDialog(false)}
        value={time}
        onConfirm={v => onUpdate?.({time: v})}
      />

      {/* 분량 다이얼로그 */}
      <ServingsDialog
        visible={showServingsDialog}
        onClose={() => setShowServingsDialog(false)}
        value={servings}
        onConfirm={v => onUpdate?.({servings: v})}
      />

      <CookingMode
        visible={showCookingMode}
        onClose={() => setShowCookingMode(false)}
        title={title ?? ''}
        steps={steps}
        stepGroups={stepGroups}
        ingredientGroups={ingredientGroups}
        canEdit={canEdit}
        onUpdate={onUpdate}
        initialIndex={cookingModeInitialIndex}
      />

      {/* 잠금 해제 하단 바: 블러 배경 + 버튼 세트 */}
      {locked && (
        <LockedBottomBar onUnlock={() => setShowUnlockDialog(true)} />
      )}

      {/* 잠금 해제 다이얼로그 */}
      <UnlockDialog
        visible={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onWatchAd={() => {
          setShowUnlockDialog(false);
          onUnlock?.();
        }}
        adLoading={adLoading}
      />
    </Animated.View>
  );
}

const HERO_HEIGHT = 280;

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface-surfacedim'],
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroSection: {
    height: HERO_HEIGHT,
    position: 'relative',
    width: '100%',
    backgroundColor: colors['surface-surfacedim'],
    overflow: 'hidden',
  },
  navLeftRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  sessionMenu: {
    position: 'absolute' as const,
    top: NAV_PILL_HEIGHT + Spacing.xs,
    left: 0,
    zIndex: 20,
  },
  placeholderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  heroTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
    opacity: 0.12,
  },
  heroContentWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: 28,
    gap: Spacing.xs,
  },
  heroTitle: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: Typography.headline.small.fontSize,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: Typography.headline.small.lineHeight,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground-onsurfaceinverse'],
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  heroDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: Typography.body.medium.letterSpacing,
    color: colors['foreground-onsurfaceinverse'],
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },

  // Meta Section
  metaSection: {
    flexDirection: 'row',
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: -40,
    gap: Spacing.sm,
  },

  // Section
  section: {
    paddingTop: Spacing.sm,
  },
  sectionGap: {
    paddingTop: Spacing.sm,
  },


  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors['border-borderlight'],
  },
  ingredientRowLast: {
    borderBottomWidth: 0,
  },
  ingredientPercentage: {
    width: 60,
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
  ingredientName: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurface'],
  },

  // Tools
  toolsContainer: {
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
  },
  toolsText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurface'],
  },

  // Steps
  stepDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  tipChipInline: {
    paddingTop: Spacing.sm,
  },
  stepThumbnails: {
    flexDirection: 'row' as const,
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  stepThumbnail: {
    width: 48,
    height: 32,
    borderRadius: Radius['radius-sm'],
  },

  // Group title
  groupTitleRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.smd,
    paddingBottom: Spacing.xs,
  },
  groupTitleRowSpaced: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors['border-borderlight'],
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
  },
  groupTitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },

  // Tab pill
  tabPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },

  // Empty review
  emptyReview: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  emptyReviewText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },

  // Overlay & Menu
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
