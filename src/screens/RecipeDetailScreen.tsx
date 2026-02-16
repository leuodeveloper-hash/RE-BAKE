import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {GlassContainer, IconButton, ContentContainer, Card, ListItem, FloatingNavBar, Selector, navPillStyle, MAX_CONTENT_WIDTH, APPBAR_CONTENT_BOTTOM} from '@components/Layout';
import {Menu} from '@components/Menu';
import {EditableChip} from '@components/EditableChip';
import {OptionTile} from '@components/OptionTile';
import {PdfPreviewDialog, TimeDialog, ServingsDialog} from '@components/Dialog';
import type {ReviewData} from '@components/Dialog';
import {CookingMode} from '@components/CookingMode';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {
  IconArrowLeft,
  IconPlayFilled,
  IconEllipsisVertical,
  IconClockFilled,
  IconUserFilled,
  IconHash,
  IconEdit,
  IconTrash,
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
}

interface ProcessStepGroup {
  title: string;
  steps: ProcessStep[];
}

export interface RecipeDetailScreenProps {
  title?: string;
  category?: string;
  method?: string;
  reviewCount?: number;
  reviews?: ReviewData[];
  imageSource?: ImageSourcePropType;
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
  /** 둘러보기에서 진입 시: 내 레시피로 저장 */
  onImport?: () => void;
  /** 인라인 편집 시: 변경 데이터 전달 */
  onUpdate?: (data: Record<string, any>) => void;
  /** 쿠킹모드 표시 상태 변경 콜백 */
  onCookingModeChange?: (visible: boolean) => void;
  /** 회차 목록 (2개 이상일 때 Selector 표시) */
  sessionItems?: {id: string; label: string}[];
  /** 회차 선택 시 이동 */
  onSessionSelect?: (recipeId: string) => void;
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
  {step: 1, description: '가루 재료를 섞어서 체 쳐요.', tip: '박력분+베이킹소다+베이킹파우더+코코아파우더+탈지분유'},
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

export function RecipeDetailScreen({
  title = '레시피 이름',
  category = '제과',
  method,
  reviewCount = 0,
  reviews,
  imageSource,
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
}: RecipeDetailScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const canEdit = !!onUpdate;

  // 필드 활성 여부 헬퍼
  const isFieldActive = (id: string) => !activeFieldIds || activeFieldIds.includes(id);

  // 서브타이틀 (활성 필드에 따라 동적 구성)
  const subtitle = (() => {
    const parts: string[] = [category];
    if (method && isFieldActive('method')) parts.push(method);
    parts.push(`${reviews?.length ?? 0}개의 회고`);
    return parts.join(' · ');
  })();
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showServingsDialog, setShowServingsDialog] = useState(false);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [cookingModeInitialIndex, setCookingModeInitialIndex] = useState(0);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const hasMultipleSessions = sessionItems && sessionItems.length > 1;

  useEffect(() => {
    onCookingModeChange?.(showCookingMode);
  }, [showCookingMode, onCookingModeChange]);

  // ---- 기존 로직 ----
  const computedGroups = useMemo(() => computeBakersPercentages(ingredientGroups), [ingredientGroups]);

  const menuItems = useMemo(() => {
    const items: {id: string; label: string; icon: React.FC<any>; destructive?: boolean}[] = [];
    if (onImport) items.push({id: 'save', label: '내 레시피로 저장', icon: IconArrowDownToLine});
    if (onRemake) items.push({id: 'remake', label: '다시 만들기', icon: IconHash});
    if (onEdit) items.push({id: 'edit', label: '편집', icon: IconEdit});
    items.push({id: 'download', label: 'PDF 다운로드', icon: IconArrowDownToLine});
    if (onDelete) items.push({id: 'delete', label: '삭제', icon: IconTrash, destructive: true});
    return items;
  }, [onImport, onRemake, onEdit, onDelete]);

  const handleMenuPress = () => {
    setShowMenu(prev => !prev);
  };

  const handleMenuSelect = (id: string) => {
    setShowMenu(false);
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
    setShowMenu(false);
    setShowSessionMenu(false);
  };

  // 페이지 페이드인
  const pageOpacity = useRef(new Animated.Value(0)).current;

  // 스태거드 콘텐츠 애니메이션
  const SECTION_COUNT = 4;
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
    {icon: IconUserFilled, label: servings, onPress: canEdit ? () => setShowServingsDialog(true) : undefined},
    ...(canEdit ? [{icon: IconHash, label: session}] as MetaInfo[] : []),
  ];

  // ---- 섹션 헤더 렌더 ----
  const renderSectionHeader = (label: string, sectionId: string, breadcrumb?: string) => {
    return (
      <View style={styles.sectionHeaderRow}>
        {breadcrumb ? (
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitleText}>{label}</Text>
            <IconChevronRight width={8} height={8} color={colors['foreground-onsurfacevar']} />
            <Text style={styles.sectionTitleText}>{breadcrumb}</Text>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>{label}</Text>
        )}
        {onEdit && (
          <Pressable
            onPress={() => onEdit(sectionId)}
            hitSlop={8}
          >
            <Text style={styles.editButton}>편집</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, {opacity: pageOpacity}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderBg} />
          )}
          <View style={styles.heroTextOverlay} />
          <LinearGradient
            colors={['transparent', colors['surface-surfacedim']]}
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
          <Animated.View style={{opacity: sectionAnims[1].opacity, transform: [{translateY: sectionAnims[1].translateY}]}}>
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
        <Animated.View style={{opacity: sectionAnims[2].opacity, transform: [{translateY: sectionAnims[2].translateY}]}}>
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
                    </ListItem>
                  ))}
                </Card>
              </ContentContainer>
            )}
          </Animated.View>
        )}

        {/* Review Section - 내용 있을 때만 표시 */}
        {reviews && reviews.length > 0 && (
          <ContentContainer style={styles.section}>
            {renderSectionHeader('회고', 'review')}
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
          </ContentContainer>
        )}

        {/* Bottom Padding for Tab Bar */}
        <View style={{height: 100 + insets.bottom}} />
      </ScrollView>

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
                icon={IconArrowLeft}
                onPress={onBack}
                variant="ghost-secondary"
                size="medium"
              />
            </GlassContainer>
            {hasMultipleSessions && (
              <GlassContainer contentStyle={navPillStyle}>
                <Selector
                  label={session}
                  showDropdown
                  onPress={() => setShowSessionMenu(prev => !prev)}
                />
              </GlassContainer>
            )}
          </View>
        }
        right={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconPlayFilled}
              onPress={() => setShowCookingMode(true)}
              variant="ghost-secondary"
              size="medium"
            />
            <IconButton
              icon={IconArrowDownToLine}
              onPress={() => setShowPdfPreview(true)}
              variant="ghost-secondary"
              size="medium"
            />
            <IconButton
              icon={IconEllipsisVertical}
              onPress={handleMenuPress}
              variant="ghost-secondary"
              size="medium"
              forcePressed={showMenu}
            />
          </GlassContainer>
        }
      />

      {/* Session Menu */}
      {hasMultipleSessions && (
        <View style={[styles.menuLayer, {top: insets.top + APPBAR_CONTENT_BOTTOM + Spacing.xs}]} pointerEvents="box-none">
          <View style={styles.sessionMenuAligner} pointerEvents="box-none">
            <Menu
              items={sessionItems!}
              selectedId={sessionItems!.find(s => {
                const m = session?.match(/(\d+)/);
                return s.label === `${m?.[1] ?? '1'}회차`;
              })?.id}
              onSelect={id => { setShowSessionMenu(false); onSessionSelect?.(id); }}
              visible={showSessionMenu}
            />
          </View>
        </View>
      )}

      {/* Context Menu */}
      <View style={[styles.menuLayer, {top: insets.top + APPBAR_CONTENT_BOTTOM + Spacing.xs}]} pointerEvents="box-none">
        <View style={styles.menuAligner} pointerEvents="box-none">
          <Menu
            items={menuItems}
            onSelect={handleMenuSelect}
            visible={showMenu}
          />
        </View>
      </View>

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        data={{
          title: title ?? '레시피 이름',
          category,
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
  },
  navLeftRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.smd,
  },
  placeholderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_HEIGHT,
    backgroundColor: colors['surface-surfacecontainer'],
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
    gap: Spacing.smd,
  },
  heroTitle: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: Typography.headline.small.fontSize,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: Typography.headline.small.lineHeight,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground-onsurfaceinverse'],
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 14,
  },
  heroDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: Typography.body.medium.letterSpacing,
    color: colors['foreground-onsurfaceinverse'],
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 14,
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
    paddingTop: 24,
  },
  sectionGap: {
    paddingTop: 24,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.smd,
    paddingRight: Spacing.smd,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionTitleText: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
  editButton: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground-onsurfacemuted'],
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

  // Overlay & Menu
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menuLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sessionMenuAligner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-start',
  },
  menuAligner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
});
