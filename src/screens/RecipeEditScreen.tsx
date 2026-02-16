import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ContentContainer, IconButton, Card, GlassContainer, FloatingNavBar, navPillStyle, MAX_CONTENT_WIDTH, APPBAR_CONTENT_BOTTOM} from '@components/Layout';
import {ListItem} from '@components/ListItem';
import {Menu} from '@components/Menu';
import {BottomSheet} from '@components/BottomSheet';
import {EditableChip} from '@components/EditableChip';
import {OptionTile} from '@components/OptionTile';
import {Dialog, FieldManageDialog, TimeDialog, ServingsDialog} from '@components/Dialog';
import type {ReviewData} from '@components/Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {Radius} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useDragReorder, ROW_HEIGHT, dragStyles} from '@hooks/useDragReorder';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {
  IconClose,
  IconTick,
  IconEllipsisVertical,
  IconPhoto,
  IconClockFilled,
  IconUserFilled,
  IconHash,
  IconMinus,
  IconAdd,
  IconDragger,
  IconChevronRight,
  IconBookFilled,
  IconSettingsFilled,
  IconOpenbookFilled,
  IconWind,
  IconAstriks,
  IconCircleAlertFilled,
  IconCameraFilled,
  IconLeafFilled,
  IconToolCaseFilled,
  IconProcess,
  IconChartNoAxesGantt,
  IconCornerDownRight,
} from '@components/Icon/IconIndex';

// ---- Types ----

interface EditableIngredient {
  id: string;
  name: string;
  amount: string;
}

interface EditableStep {
  id: string;
  description: string;
  tip?: string;
  caution?: string;
}

interface IngredientGroup {
  id: string;
  title: string;
  ingredients: EditableIngredient[];
}

interface EditableTool {
  id: string;
  name: string;
}

interface StepGroup {
  id: string;
  title: string;
  steps: EditableStep[];
}

export interface RecipeEditScreenProps {
  onClose?: () => void;
  onSave?: (data: {
    title: string;
    category?: string;
    method?: string;
    ratio?: string;
    time?: string;
    servings?: string;
    session?: string;
    ingredientGroups: {title: string; ingredients: {name: string; amount: string}[]}[];
    tools: {name: string}[];
    stepGroups: {title: string; steps: {step: number; description: string; tip?: string; caution?: string}[]}[];
    activeFieldIds: string[];
    reviews?: ReviewData[];
  }) => void;
  /** 편집 시 전달되는 레시피 데이터 (없으면 빈 생성 화면) */
  recipe?: {
    title: string;
    category?: string;
    method?: string;
    ratio?: string;
    ingredientGroups?: {title: string; ingredients: {name: string; amount: string}[]}[];
    tools?: {name: string}[];
    steps?: {step: number; description: string; tip?: string; caution?: string}[];
    stepGroups?: {title: string; steps: {step: number; description: string; tip?: string; caution?: string}[]}[];
    activeFieldIds?: string[];
    imageSource?: ImageSourcePropType;
    reviews?: ReviewData[];
    time?: string;
    servings?: string;
    session?: string;
  };
  /** 선택 가능한 요리책 목록 */
  cookbooks?: string[];
  /** 열릴 때 스크롤할 섹션 ID (ingredients, tools, steps, review) */
  initialSection?: string;
}

// 메뉴 아이템
const EDIT_MENU_ITEMS = [
  {id: 'field-manage', label: '필드관리', icon: IconSettingsFilled},
];

// 사진 메뉴 아이템
const PHOTO_MENU_ITEMS = [
  {id: 'camera', label: '카메라로 촬영', icon: IconCameraFilled},
  {id: 'gallery', label: '갤러리에서 선택', icon: IconPhoto},
];

// 슬래시 메뉴 아이템
const SLASH_MENU_ITEMS = [
  {id: 'tip', label: '팁', icon: IconAstriks},
  {id: 'caution', label: '주의사항', icon: IconCircleAlertFilled},
];

// Web: textarea 포커스 아웃라인 제거
const noOutline: any = {outlineStyle: 'none'};


// ---- Component ----

export function RecipeEditScreen({onClose, onSave, recipe, cookbooks, initialSection}: RecipeEditScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nextIdRef = useRef(100);
  const genId = () => String(nextIdRef.current++);

  // State — recipe prop이 있으면 편집 모드, 없으면 빈 생성 모드
  const [title, setTitle] = useState(() => recipe?.title ?? '');
  const [category, setCategory] = useState(() => recipe?.category ?? '');
  const [method, setMethod] = useState(() => recipe?.method ?? '');
  const [ratio, setRatio] = useState(() => recipe?.ratio ?? '');
  const [time, setTime] = useState(() => recipe?.time ?? '');
  const [servings, setServings] = useState(() => recipe?.servings ?? '');
  const [session, setSession] = useState(() => recipe?.session ?? '');
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showServingsDialog, setShowServingsDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroup[]>(() => {
    if (recipe?.ingredientGroups) {
      return recipe.ingredientGroups.map(g => ({
        id: genId(),
        title: g.title,
        ingredients: g.ingredients.map(i => ({
          id: genId(),
          name: i.name,
          amount: i.amount.replace(/[a-zA-Zㄱ-ㅎ가-힣]+$/, ''),
        })),
      }));
    }
    return [{id: genId(), title: '재료', ingredients: [{id: genId(), name: '', amount: ''}]}];
  });
  const [tools, setTools] = useState<EditableTool[]>(() => {
    if (recipe?.tools) {
      return recipe.tools.map(t => ({id: genId(), name: t.name}));
    }
    return [{id: genId(), name: ''}];
  });
  const [stepGroups, setStepGroups] = useState<StepGroup[]>(() => {
    if (recipe?.stepGroups) {
      return recipe.stepGroups.map(g => ({
        id: genId(),
        title: g.title,
        steps: g.steps.map(s => ({
          id: genId(),
          description: s.description,
          tip: s.tip,
          caution: s.caution,
        })),
      }));
    }
    if (recipe?.steps) {
      return [{
        id: genId(),
        title: '과정',
        steps: recipe.steps.map(s => ({
          id: genId(),
          description: s.description,
          tip: s.tip,
          caution: s.caution,
        })),
      }];
    }
    return [{id: genId(), title: '과정', steps: [{id: genId(), description: ''}]}];
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showCookbookMenu, setShowCookbookMenu] = useState(false);
  const [showAddCookbookDialog, setShowAddCookbookDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [localCookbooks, setLocalCookbooks] = useState<string[]>([]);
  const [fieldManageVisible, setFieldManageVisible] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>(recipe?.reviews ?? []);
  const [slashMenu, setSlashMenu] = useState<{groupId: string; stepId: string} | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSource] = useState<ImageSourcePropType | undefined>(recipe?.imageSource);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [activeFieldIds, setActiveFieldIds] = useState<string[]>(
    recipe?.activeFieldIds ?? [
      'info', 'photo', 'time', 'ingredients', 'steps', 'servings',
      'method', 'ratio', 'cookbook', 'review',
    ],
  );
  const isFieldActive = (id: string) => activeFieldIds.includes(id);

  const pickImage = async (source: 'camera' | 'gallery') => {
    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePhotoMenuSelect = (id: string) => {
    setShowPhotoMenu(false);
    if (id === 'camera' || id === 'gallery') {
      pickImage(id);
    }
  };

  const handleMenuPress = () => {
    setShowMenu(prev => !prev);
  };

  const handleMenuSelect = (id: string) => {
    setShowMenu(false);
    if (id === 'field-manage') {
      setFieldManageVisible(true);
    }
  };

  const handleCookbookPress = () => {
    setShowCookbookMenu(true);
  };

  const allCookbooks = [...(cookbooks || []), ...localCookbooks];

  const handleCookbookSelect = (id: string) => {
    setCategory(id);
    setShowCookbookMenu(false);
  };

  const handleAddCookbookPress = () => {
    setShowCookbookMenu(false);
    setNewCookbookName('');
    setShowAddCookbookDialog(true);
  };

  const handleAddCookbookConfirm = () => {
    const name = newCookbookName.trim();
    if (!name) return;
    setLocalCookbooks(prev => [...prev, name]);
    setCategory(name);
    setShowAddCookbookDialog(false);
  };

  const handleOverlayPress = () => {
    setShowMenu(false);
    setShowPhotoMenu(false);
  };
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const sectionInputRefs = useRef<Record<string, RNTextInput | null>>({});

  useEffect(() => {
    if (!initialSection) return;
    const timer = setTimeout(() => {
      const y = sectionPositions.current[initialSection];
      if (y != null) {
        scrollViewRef.current?.scrollTo({y: y - 80, animated: true});
      }
      // 해당 섹션의 첫 번째 인풋에 포커스
      setTimeout(() => {
        sectionInputRefs.current[initialSection]?.focus();
      }, 200);
    }, 400);
    return () => clearTimeout(timer);
  }, [initialSection]);

  const drag = useDragReorder();

  // Multiline auto-grow heights
  const [inputHeights, setInputHeights] = useState<Record<string, number>>({});
  const onInputContentSizeChange = useCallback((key: string, e: any) => {
    const h = Math.ceil(e.nativeEvent.contentSize.height);
    setInputHeights(prev => {
      if (prev[key] === h) return prev;
      return {...prev, [key]: h};
    });
  }, []);

  // Drop target listener — Animated.Value만 업데이트, setState 없음 (리렌더 방지)
  React.useEffect(() => {
    const id = drag.dragY.addListener(({value}) => {
      if (drag.dragFromRef.current === null) return;
      const fromIdx = drag.dragFromRef.current;
      const moveBy = Math.round(value / ROW_HEIGHT);
      const maxIdx = drag.dragItemsLengthRef.current - 1;
      const newIdx = Math.max(0, Math.min(maxIdx, fromIdx + moveBy));
      if (newIdx !== drag.dropTargetRef.current) {
        drag.dropTargetRef.current = newIdx;
        if (newIdx !== fromIdx) {
          const gapIdx = newIdx < fromIdx ? newIdx : newIdx + 1;
          drag.indicatorTop.setValue(gapIdx * ROW_HEIGHT);
          drag.indicatorOpacity.setValue(1);
        } else {
          drag.indicatorOpacity.setValue(0);
        }
      }
    });
    return () => drag.dragY.removeListener(id);
  }, [drag.dragY, drag.indicatorTop, drag.indicatorOpacity]);

  // ---- Ingredient Group Handlers ----

  const addIngredientGroup = () => {
    setIngredientGroups(prev => [
      ...prev,
      {id: genId(), title: '재료', ingredients: [{id: genId(), name: '', amount: ''}]},
    ]);
  };

  const updateIngredientGroupTitle = (groupId: string, newTitle: string) => {
    setIngredientGroups(prev =>
      prev.map(g => (g.id === groupId ? {...g, title: newTitle} : g)),
    );
  };

  const addIngredient = (groupId: string, position: 'top' | 'bottom' = 'top') => {
    setIngredientGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {
              ...g,
              ingredients:
                position === 'top'
                  ? [{id: genId(), name: '', amount: ''}, ...g.ingredients]
                  : [...g.ingredients, {id: genId(), name: '', amount: ''}],
            }
          : g,
      ),
    );
  };

  const removeIngredient = (groupId: string, ingredientId: string) => {
    setIngredientGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, ingredients: g.ingredients.filter(i => i.id !== ingredientId)}
          : g,
      ),
    );
  };

  const updateIngredient = (groupId: string, ingredientId: string, field: 'name' | 'amount', value: string) => {
    setIngredientGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, ingredients: g.ingredients.map(i => (i.id === ingredientId ? {...i, [field]: value} : i))}
          : g,
      ),
    );
  };

  const removeIngredientGroup = (groupId: string) => {
    setIngredientGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const reorderIngredients = useCallback((groupId: string, from: number, to: number) => {
    setIngredientGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const next = [...g.ingredients];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return {...g, ingredients: next};
      }),
    );
  }, []);

  // ---- Tool Handlers ----

  const addTool = (position: 'top' | 'bottom' = 'top') => {
    setTools(prev =>
      position === 'top'
        ? [{id: genId(), name: ''}, ...prev]
        : [...prev, {id: genId(), name: ''}],
    );
  };

  const removeTool = (toolId: string) => {
    setTools(prev => {
      if (prev.length <= 1) return [{id: genId(), name: ''}];
      return prev.filter(t => t.id !== toolId);
    });
  };

  const updateTool = (toolId: string, value: string) => {
    setTools(prev => prev.map(t => (t.id === toolId ? {...t, name: value} : t)));
  };

  const reorderTools = useCallback((from: number, to: number) => {
    setTools(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  // ---- Step Group Handlers ----

  const addStepGroup = () => {
    setStepGroups(prev => [
      ...prev,
      {id: genId(), title: '과정', steps: [{id: genId(), description: ''}]},
    ]);
  };

  const updateStepGroupTitle = (groupId: string, newTitle: string) => {
    setStepGroups(prev =>
      prev.map(g => (g.id === groupId ? {...g, title: newTitle} : g)),
    );
  };

  const addStep = (groupId: string, position: 'top' | 'bottom' = 'top') => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {
              ...g,
              steps:
                position === 'top'
                  ? [{id: genId(), description: ''}, ...g.steps]
                  : [...g.steps, {id: genId(), description: ''}],
            }
          : g,
      ),
    );
  };

  const removeStep = (groupId: string, stepId: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.filter(s => s.id !== stepId)}
          : g,
      ),
    );
  };

  const updateStep = (groupId: string, stepId: string, value: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, description: value} : s))}
          : g,
      ),
    );
  };

  const updateStepTip = (groupId: string, stepId: string, value: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, tip: value} : s))}
          : g,
      ),
    );
  };

  const removeStepTip = (groupId: string, stepId: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, tip: undefined} : s))}
          : g,
      ),
    );
  };

  const updateStepCaution = (groupId: string, stepId: string, value: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, caution: value} : s))}
          : g,
      ),
    );
  };

  const removeStepCaution = (groupId: string, stepId: string) => {
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => (s.id === stepId ? {...s, caution: undefined} : s))}
          : g,
      ),
    );
  };

  // 슬래시 메뉴 선택 핸들러
  const handleSlashMenuSelect = (menuId: string) => {
    if (!slashMenu) return;
    const {groupId, stepId} = slashMenu;
    // "/" 제거
    setStepGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? {...g, steps: g.steps.map(s => {
              if (s.id !== stepId) return s;
              const desc = s.description.endsWith('/') ? s.description.slice(0, -1) : s.description;
              if (menuId === 'tip') return {...s, description: desc, tip: s.tip ?? ''};
              if (menuId === 'caution') return {...s, description: desc, caution: s.caution ?? ''};
              return {...s, description: desc};
            })}
          : g,
      ),
    );
    setSlashMenu(null);
  };

  const removeStepGroup = (groupId: string) => {
    setStepGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const reorderSteps = useCallback((groupId: string, from: number, to: number) => {
    setStepGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const next = [...g.steps];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return {...g, steps: next};
      }),
    );
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={drag.scrollEnabled}>
        {/* Spacer for nav bar */}
        <View style={{height: 72 + insets.top}} />

        {/* Title & Description */}
        <ContentContainer>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.titleInputWrap}>
                <RNTextInput
                  style={[styles.titleInput, noOutline, inputHeights['title'] != null && {height: inputHeights['title']}]}
                  placeholder="레시피 제목"
                  placeholderTextColor={colors['foreground-onsurfacemuted']}
                  selectionColor={colors['foreground-primary']}
                  value={title}
                  onChangeText={setTitle}
                  multiline
                  numberOfLines={1}
                  blurOnSubmit={false}
                  onContentSizeChange={e => onInputContentSizeChange('title', e)}
                />
              </View>
              {(isFieldActive('method') || isFieldActive('ratio')) && (
                <View style={styles.titleChips}>
                  {isFieldActive('method') && (
                    <EditableChip label={method} placeholder="공법" variant="yellow" icon={IconOpenbookFilled} onChangeText={setMethod} />
                  )}
                  {isFieldActive('ratio') && (
                    <EditableChip label={ratio} placeholder="비중" variant="yellow" icon={IconWind} onChangeText={setRatio} />
                  )}
                </View>
              )}
            </View>
            <View style={styles.dividerFull} />
            <View style={styles.descriptionContainer}>
              <RNTextInput
                style={[styles.descriptionInput, noOutline, inputHeights['desc'] != null && {height: inputHeights['desc']}]}
                placeholder="설명"
                placeholderTextColor={colors['foreground-onsurfacemuted']}
                selectionColor={colors['foreground-primary']}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={1}
                blurOnSubmit={false}
                onContentSizeChange={e => onInputContentSizeChange('desc', e)}
              />
            </View>
          </Card>
        </ContentContainer>

        {/* Option Tiles */}
        <ContentContainer style={styles.optionTilesSection}>
          <View style={styles.optionTilesRow}>
            <View style={styles.photoTileWrap}>
              <Pressable style={{flex: 1}} onPress={() => setShowPhotoMenu(true)}>
                {imageUri || imageSource ? (
                  <Card style={styles.photoTileFilled}>
                    <Image
                      source={imageUri ? {uri: imageUri} : imageSource!}
                      style={styles.photoTileImage}
                    />
                  </Card>
                ) : (
                  <OptionTile icon={IconPhoto} label="사진" />
                )}
              </Pressable>
              <View style={styles.photoMenuWrap}>
                <Menu
                  items={PHOTO_MENU_ITEMS}
                  onSelect={handlePhotoMenuSelect}
                  visible={showPhotoMenu}
                />
              </View>
            </View>
            <OptionTile icon={IconClockFilled} label={time || '시간'} onPress={() => setShowTimeDialog(true)} />
            <OptionTile icon={IconUserFilled} label={servings || '분량'} onPress={() => setShowServingsDialog(true)} />
            <OptionTile icon={IconHash} label={session || '회차'} />
          </View>
          {/* 공법/비중 칩은 제목 영역으로 이동됨 */}
        </ContentContainer>

        {/* 재료 Groups */}
        <View onLayout={e => { sectionPositions.current['ingredients'] = e.nativeEvent.layout.y; }}>
        {ingredientGroups.map((group, groupIndex) => (
          <ContentContainer key={group.id} style={groupIndex === 0 ? styles.section : styles.addGroupSection}>
            <Card>
              {/* Group Header — editable when 2+ groups, non-first gets minus button */}
              {ingredientGroups.length >= 2 ? (
                <ListItem
                  leading={groupIndex > 0
                    ? {type: 'iconButton', icon: IconMinus, onPress: () => removeIngredientGroup(group.id)}
                    : {type: 'icon', icon: IconLeafFilled}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addIngredient(group.id)}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>재료</Text>
                    <IconChevronRight width={8} height={8} color={colors['foreground-onsurfacevar']} />
                    <RNTextInput
                      style={[styles.editableRowInput, noOutline, inputHeights[`igt-${group.id}`] != null && {height: inputHeights[`igt-${group.id}`]}]}
                      value={group.title}
                      onChangeText={v => updateIngredientGroupTitle(group.id, v)}
                      placeholder="그룹 이름"
                      placeholderTextColor={colors['foreground-onsurfacemuted']}
                      selectionColor={colors['foreground-primary']}
                      multiline
                      numberOfLines={1}
                      blurOnSubmit={false}
                      onContentSizeChange={e => onInputContentSizeChange(`igt-${group.id}`, e)}
                    />
                  </View>
                </ListItem>
              ) : (
                <ListItem
                  title="재료"
                  leading={{type: 'icon', icon: IconLeafFilled}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addIngredient(group.id)}}
                />
              )}

              {/* Ingredients */}
              <View style={styles.dragArea}>
                {group.ingredients.map((ingredient, index) => {
                  const canDrag = group.ingredients.length > 1;
                  const responder = canDrag
                    ? drag.createDragHandlers(
                        ingredient.id,
                        index,
                        group.ingredients,
                        (from, to) => reorderIngredients(group.id, from, to),
                      )
                    : null;
                  const isDragging = drag.draggingId === ingredient.id;
                  return (
                    <Animated.View
                      key={ingredient.id}
                      style={isDragging ? {transform: [{translateY: drag.dragY}], zIndex: 10, opacity: 0.85} : undefined}>
                      <ListItem
                        leading={{
                          type: 'iconButton',
                          icon: IconMinus,
                          onPress: () => removeIngredient(group.id, ingredient.id),
                        }}
                        trailing={{
                          type: 'custom',
                          element: (
                            <View {...(responder ? responder.panHandlers : {})} style={dragStyles.handle}>
                              <IconDragger
                                width={16}
                                height={16}
                                color={colors['foreground-onsurfacemuted']}
                                opacity={canDrag ? 1 : 0.3}
                              />
                            </View>
                          ),
                        }}
                        showDivider={index < group.ingredients.length - 1}>
                        <View style={styles.editableRowContent}>
                          <RNTextInput
                            ref={groupIndex === 0 && index === 0 ? (node) => { sectionInputRefs.current['ingredients'] = node; } : undefined}
                            style={[styles.editableRowInput, noOutline, inputHeights[ingredient.id] != null && {height: inputHeights[ingredient.id]}]}
                            placeholder="예: 감자"
                            placeholderTextColor={colors['foreground-onsurfacemuted']}
                            selectionColor={colors['foreground-primary']}
                            value={ingredient.name}
                            onChangeText={v =>
                              updateIngredient(group.id, ingredient.id, 'name', v)
                            }
                            multiline
                            numberOfLines={1}
                            blurOnSubmit={false}
                            onContentSizeChange={e => onInputContentSizeChange(ingredient.id, e)}
                          />
                          <View style={styles.amountInputContainer}>
                            <RNTextInput
                              style={[styles.amountInput, noOutline]}
                              placeholder="0"
                              placeholderTextColor={colors['foreground-onsurfacemuted']}
                              selectionColor={colors['foreground-primary']}
                              keyboardType="numeric"
                              value={ingredient.amount}
                              onChangeText={v =>
                                updateIngredient(group.id, ingredient.id, 'amount', v)
                              }
                            />
                            <Text style={styles.unitText}>g</Text>
                          </View>
                        </View>
                      </ListItem>
                    </Animated.View>
                  );
                })}
                {/* Absolutely positioned drop indicator — driven by Animated values, no re-renders */}
                {drag.draggingId !== null && group.ingredients.some(i => i.id === drag.draggingId) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.dropIndicator, {transform: [{translateY: drag.indicatorTop}], opacity: drag.indicatorOpacity}]}
                  />
                )}
              </View>

              {/* Add ingredient button */}
              <View style={styles.addButtonRow}>
                <View style={styles.addButtonDivider}>
                  <View style={styles.divider} />
                </View>
                <IconButton
                  icon={IconAdd}
                  variant="soft"
                  size="small"
                  onPress={() => addIngredient(group.id, 'bottom')}
                />
              </View>
            </Card>
          </ContentContainer>
        ))}

        {/* + 재료 묶음 추가 */}
        <ContentContainer style={styles.addGroupSection}>
          <Card>
            <Pressable style={styles.addGroupButton} onPress={addIngredientGroup}>
              <IconAdd width={16} height={16} color={colors['foreground-accent']} />
              <Text style={styles.addGroupText}>재료 묶음 추가</Text>
            </Pressable>
          </Card>
        </ContentContainer>
        </View>

        {/* 도구 */}
        <View onLayout={e => { sectionPositions.current['tools'] = e.nativeEvent.layout.y; }}>
        <ContentContainer style={styles.section}>
          <Card>
            <ListItem
              title="도구"
              leading={{type: 'icon', icon: IconToolCaseFilled}}
              trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addTool()}}
            />
            <View style={styles.dragArea}>
              {tools.map((tool, index) => {
                const canDrag = tools.length > 1;
                const responder = canDrag
                  ? drag.createDragHandlers(
                      tool.id,
                      index,
                      tools,
                      (from, to) => reorderTools(from, to),
                    )
                  : null;
                const isDragging = drag.draggingId === tool.id;
                return (
                  <Animated.View
                    key={tool.id}
                    style={isDragging ? {transform: [{translateY: drag.dragY}], zIndex: 10, opacity: 0.85} : undefined}>
                    <ListItem
                      leading={{
                        type: 'iconButton',
                        icon: IconMinus,
                        onPress: () => removeTool(tool.id),
                      }}
                      trailing={{
                        type: 'custom',
                        element: (
                          <View {...(responder ? responder.panHandlers : {})} style={dragStyles.handle}>
                            <IconDragger
                              width={16}
                              height={16}
                              color={colors['foreground-onsurfacemuted']}
                              opacity={canDrag ? 1 : 0.3}
                            />
                          </View>
                        ),
                      }}
                      showDivider={index < tools.length - 1}>
                      <RNTextInput
                        ref={index === 0 ? (node: any) => { sectionInputRefs.current['tools'] = node; } : undefined}
                        style={[styles.editableRowInput, noOutline, inputHeights[tool.id] != null && {height: inputHeights[tool.id]}]}
                        placeholder="예: 믹싱볼"
                        placeholderTextColor={colors['foreground-onsurfacemuted']}
                        selectionColor={colors['foreground-primary']}
                        value={tool.name}
                        onChangeText={v => updateTool(tool.id, v)}
                        multiline
                        numberOfLines={1}
                        blurOnSubmit={false}
                        onContentSizeChange={e => onInputContentSizeChange(tool.id, e)}
                      />
                    </ListItem>
                  </Animated.View>
                );
              })}
              {drag.draggingId !== null && tools.some(t => t.id === drag.draggingId) && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.dropIndicator, {transform: [{translateY: drag.indicatorTop}], opacity: drag.indicatorOpacity}]}
                />
              )}
            </View>
            <View style={styles.addButtonRow}>
              <View style={styles.addButtonDivider}>
                <View style={styles.divider} />
              </View>
              <IconButton
                icon={IconAdd}
                variant="soft"
                size="small"
                onPress={() => addTool('bottom')}
              />
            </View>
          </Card>
        </ContentContainer>
        </View>

        {/* 과정 Groups */}
        <View onLayout={e => { sectionPositions.current['steps'] = e.nativeEvent.layout.y; }}>
        {stepGroups.map((group, groupIndex) => (
          <ContentContainer key={group.id} style={groupIndex === 0 ? styles.section : styles.addGroupSection}>
            <Card>
              {/* Group Header — editable when 2+ groups, non-first gets minus button */}
              {stepGroups.length >= 2 ? (
                <ListItem
                  leading={groupIndex > 0
                    ? {type: 'iconButton', icon: IconMinus, onPress: () => removeStepGroup(group.id)}
                    : {type: 'icon', icon: IconProcess}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addStep(group.id)}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>과정</Text>
                    <IconChevronRight width={8} height={8} color={colors['foreground-onsurfacevar']} />
                    <RNTextInput
                      style={[styles.editableRowInput, noOutline, inputHeights[`sgt-${group.id}`] != null && {height: inputHeights[`sgt-${group.id}`]}]}
                      value={group.title}
                      onChangeText={v => updateStepGroupTitle(group.id, v)}
                      placeholder="그룹 이름"
                      placeholderTextColor={colors['foreground-onsurfacemuted']}
                      selectionColor={colors['foreground-primary']}
                      multiline
                      numberOfLines={1}
                      blurOnSubmit={false}
                      onContentSizeChange={e => onInputContentSizeChange(`sgt-${group.id}`, e)}
                    />
                  </View>
                </ListItem>
              ) : (
                <ListItem
                  title="과정"
                  leading={{type: 'icon', icon: IconProcess}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addStep(group.id)}}
                />
              )}

              {/* Steps */}
              <View style={styles.dragArea}>
                {group.steps.map((step, index) => {
                  const canDrag = group.steps.length > 1;
                  const responder = canDrag
                    ? drag.createDragHandlers(
                        step.id,
                        index,
                        group.steps,
                        (from, to) => reorderSteps(group.id, from, to),
                      )
                    : null;
                  const isDragging = drag.draggingId === step.id;
                  return (
                    <Animated.View
                      key={step.id}
                      style={isDragging ? {transform: [{translateY: drag.dragY}], zIndex: 10, opacity: 0.85} : undefined}>
                      <ListItem
                        leading={{
                          type: 'iconButton',
                          icon: IconMinus,
                          onPress: () => removeStep(group.id, step.id),
                        }}
                        trailing={{
                          type: 'custom',
                          element: (
                            <View {...(responder ? responder.panHandlers : {})} style={dragStyles.handle}>
                              <IconDragger
                                width={16}
                                height={16}
                                color={colors['foreground-onsurfacemuted']}
                                opacity={canDrag ? 1 : 0.3}
                              />
                            </View>
                          ),
                        }}
                        titleNumberOfLines={0}
                        showDivider={index < group.steps.length - 1}>
                        <TextInput
                          ref={groupIndex === 0 && index === 0
                            ? (node: any) => { sectionInputRefs.current['steps'] = node; }
                            : undefined}
                          style="ghost"
                          multiline
                          placeholder="예: 물과 반죽을 넣어 거품기로 친다."
                          value={step.description}
                          onChangeText={v => {
                            updateStep(group.id, step.id, v);
                            // 슬래시 메뉴 감지
                            if (v.endsWith('/')) {
                              setSlashMenu({groupId: group.id, stepId: step.id});
                            } else if (slashMenu?.stepId === step.id) {
                              setSlashMenu(null);
                            }
                          }}
                          numberOfLines={1}
                          blurOnSubmit={false}
                        />
                        {/* 슬래시 메뉴 */}
                        {slashMenu?.groupId === group.id && slashMenu?.stepId === step.id && (
                          <View style={styles.slashMenuInline}>
                            <Menu
                              items={SLASH_MENU_ITEMS.map(item => ({
                                ...item,
                                disabled: (item.id === 'tip' && step.tip != null) || (item.id === 'caution' && step.caution != null),
                              }))}
                              onSelect={handleSlashMenuSelect}
                              visible
                            />
                          </View>
                        )}
                        {step.tip != null && (
                          <View style={styles.tipChipInline}>
                            <EditableChip
                              label={step.tip}
                              variant="tip"
                              onChangeText={v => updateStepTip(group.id, step.id, v)}
                              onRemove={() => removeStepTip(group.id, step.id)}
                            />
                          </View>
                        )}
                        {step.caution != null && (
                          <View style={styles.tipChipInline}>
                            <EditableChip
                              label={step.caution}
                              variant="yellow"
                              placeholder="주의사항을 입력하세요"
                              onChangeText={v => updateStepCaution(group.id, step.id, v)}
                              onRemove={() => removeStepCaution(group.id, step.id)}
                            />
                          </View>
                        )}
                      </ListItem>
                    </Animated.View>
                  );
                })}
                {/* Absolutely positioned drop indicator */}
                {drag.draggingId !== null && group.steps.some(s => s.id === drag.draggingId) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.dropIndicator, {transform: [{translateY: drag.indicatorTop}], opacity: drag.indicatorOpacity}]}
                  />
                )}
              </View>

              {/* Add step button */}
              <View style={styles.addButtonRow}>
                <View style={styles.addButtonDivider}>
                  <View style={styles.divider} />
                </View>
                <IconButton
                  icon={IconAdd}
                  variant="soft"
                  size="small"
                  onPress={() => addStep(group.id, 'bottom')}
                />
              </View>
            </Card>
          </ContentContainer>
        ))}

        {/* + 과정 묶음 추가 */}
        <ContentContainer style={styles.addGroupSection}>
          <Card>
            <Pressable style={styles.addGroupButton} onPress={addStepGroup}>
              <IconAdd width={16} height={16} color={colors['foreground-accent']} />
              <Text style={styles.addGroupText}>과정 묶음 추가</Text>
            </Pressable>
          </Card>
        </ContentContainer>
        </View>

        {/* Navigation Items */}
        {isFieldActive('cookbook') && (
          <ContentContainer style={styles.section}>
            <Card>
              <ListItem
                title="요리책"
                leading={{type: 'icon', icon: IconBookFilled}}
                trailing={{type: 'custom', element: (
                  <View style={styles.cookbookTrailing}>
                    {category ? <Text style={styles.cookbookValue}>{category}</Text> : null}
                    <IconChevronRight width={16} height={16} color={colors['foreground-onsurfacemuted']} />
                  </View>
                )}}
                onPress={handleCookbookPress}
                showDivider={false}
              />
            </Card>
          </ContentContainer>
        )}
        {isFieldActive('review') && (
          <View onLayout={e => { sectionPositions.current['review'] = e.nativeEvent.layout.y; }}>
          <ContentContainer style={isFieldActive('cookbook') ? styles.navItemGap : styles.section}>
            <Card>
              <ListItem
                title="회고"
                leading={{type: 'icon', icon: IconChartNoAxesGantt}}
              />
              <ListItem showDivider>
                <TextInput
                  ref={(node: any) => { sectionInputRefs.current['review'] = node; }}
                  style="ghost"
                  multiline
                  value={reviews.length > 0 ? reviews[reviews.length - 1].evaluation : ''}
                  onChangeText={text => {
                    setReviews(prev => {
                      if (prev.length === 0) return [{evaluation: text, improvement: ''}];
                      const updated = [...prev];
                      updated[updated.length - 1] = {...updated[updated.length - 1], evaluation: text};
                      return updated;
                    });
                  }}
                  placeholder="어떤 점이 부족했나요?"
                />
              </ListItem>
              <ListItem
                leading={{type: 'icon', icon: IconCornerDownRight}}
                showDivider={false}
              >
                <TextInput
                  style="ghost"
                  multiline
                  value={reviews.length > 0 ? reviews[reviews.length - 1].improvement : ''}
                  onChangeText={text => {
                    setReviews(prev => {
                      if (prev.length === 0) return [{evaluation: '', improvement: text}];
                      const updated = [...prev];
                      updated[updated.length - 1] = {...updated[updated.length - 1], improvement: text};
                      return updated;
                    });
                  }}
                  placeholder="다음 개선해야할 점을 적어보세요."
                />
              </ListItem>
            </Card>
          </ContentContainer>
          </View>
        )}
        <ContentContainer style={styles.navItemGap}>
          <Card>
            <ListItem
              title="필드관리"
              leading={{type: 'icon', icon: IconSettingsFilled}}
              trailing={{type: 'icon', icon: IconChevronRight}}
              showDivider={false}
              onPress={() => setFieldManageVisible(true)}
            />
          </Card>
        </ContentContainer>

        {/* Bottom Padding */}
        <View style={{height: Spacing.xxl + insets.bottom}} />
      </ScrollView>

      {/* Overlay for Menu */}
      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={showMenu || showPhotoMenu ? 'auto' : 'none'}
      />

      {/* Context Menu */}
      <View style={[styles.menuLayer, {top: insets.top + APPBAR_CONTENT_BOTTOM + Spacing.xs}]} pointerEvents="box-none">
        <View style={styles.menuAligner} pointerEvents="box-none">
          <Menu
            items={EDIT_MENU_ITEMS}
            onSelect={handleMenuSelect}
            visible={showMenu}
          />
        </View>
      </View>

      {/* 요리책 선택 바텀시트 */}
      <BottomSheet visible={showCookbookMenu} onClose={() => setShowCookbookMenu(false)} title="요리책">
        <View style={styles.cookbookSheetContent}>
          {allCookbooks.map(name => (
            <Pressable
              key={name}
              style={({pressed}) => [
                styles.cookbookSheetItem,
                category === name && styles.cookbookSheetItemSelected,
                pressed && styles.cookbookSheetItemPressed,
              ]}
              onPress={() => handleCookbookSelect(name)}>
              <IconBookFilled
                width={20}
                height={20}
                color={category === name
                  ? colors['foreground-onsurfacevar']
                  : colors['foreground-onsurfacemuted']}
              />
              <Text style={styles.cookbookSheetItemLabel}>{name}</Text>
            </Pressable>
          ))}
          <Pressable
            style={({pressed}) => [
              styles.cookbookSheetItem,
              pressed && styles.cookbookSheetItemPressed,
            ]}
            onPress={handleAddCookbookPress}>
            <IconAdd
              width={20}
              height={20}
              color={colors['foreground-onsurfacemuted']}
            />
            <Text style={styles.cookbookSheetItemLabel}>요리책 추가</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* 요리책 추가 다이얼로그 */}
      <Dialog
        visible={showAddCookbookDialog}
        onClose={() => setShowAddCookbookDialog(false)}
        icon={IconBookFilled}
        avatarColor="brown"
        title="요리책 추가"
        actions={
          <>
            <Button label="취소" variant="soft" onPress={() => setShowAddCookbookDialog(false)} />
            <Button label="추가" variant="filled" onPress={handleAddCookbookConfirm} disabled={!newCookbookName.trim()} />
          </>
        }>
        <TextInput
          placeholder="요리책 이름"
          value={newCookbookName}
          onChangeText={setNewCookbookName}
        />
      </Dialog>


      {/* 필드관리 다이얼로그 */}
      <FieldManageDialog
        visible={fieldManageVisible}
        onClose={() => setFieldManageVisible(false)}
        activeFieldIds={activeFieldIds}
        onConfirm={setActiveFieldIds}
      />

      {/* 시간 다이얼로그 */}
      <TimeDialog
        visible={showTimeDialog}
        onClose={() => setShowTimeDialog(false)}
        value={time}
        onConfirm={setTime}
      />

      {/* 분량 다이얼로그 */}
      <ServingsDialog
        visible={showServingsDialog}
        onClose={() => setShowServingsDialog(false)}
        value={servings}
        onConfirm={setServings}
      />

      {/* Fixed Top Navigation Bar */}
      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconClose}
              onPress={onClose}
              variant="ghost-secondary"
              size="medium"
            />
          </GlassContainer>
        }
        right={
          <>
            <GlassContainer contentStyle={navPillStyle}>
              <IconButton
                icon={IconEllipsisVertical}
                onPress={handleMenuPress}
                variant="ghost-secondary"
                size="medium"
                forcePressed={showMenu}
              />
            </GlassContainer>
            <IconButton
              icon={IconTick}
              onPress={() => {
                onSave?.({
                  title,
                  category: category || undefined,
                  method: method || undefined,
                  ratio: ratio || undefined,
                  time: time || undefined,
                  servings: servings || undefined,
                  session: session || undefined,
                  ingredientGroups: ingredientGroups.map(g => ({
                    title: g.title,
                    ingredients: g.ingredients
                      .filter(i => i.name.trim())
                      .map(i => ({name: i.name, amount: i.amount})),
                  })),
                  tools: tools.filter(t => t.name.trim()).map(t => ({name: t.name})),
                  stepGroups: stepGroups.map(g => ({
                    title: g.title,
                    steps: g.steps
                      .filter(s => s.description.trim())
                      .map((s, idx) => ({step: idx + 1, description: s.description, tip: s.tip, caution: s.caution})),
                  })),
                  activeFieldIds,
                  reviews: reviews.length > 0 ? reviews : undefined,
                });
              }}
              variant="filled"
              size="large"
            />
          </>
        }
      />
    </View>
  );
}

// ---- Styles ----

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

  // Title & Description
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    gap: Spacing.sm,
  },
  titleInputWrap: {
    flex: 1,
  },
  titleChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  titleInput: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: Typography.headline.small.fontSize,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: Typography.headline.small.lineHeight,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: colors['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    maxHeight: 100,
  },
  dividerFull: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border-borderlight'],
  },
  descriptionContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  descriptionInput: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    maxHeight: 100,
  },

  // Option Tiles
  optionTilesSection: {
    paddingTop: Spacing.smd,
    zIndex: 10,
  },
  optionTilesRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoTileWrap: {
    flex: 1,
    zIndex: 10,
  },
  photoTileFilled: {
    flex: 1,
    overflow: 'hidden',
    padding: 0,
  },
  photoMenuWrap: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: Spacing.xs,
    zIndex: 100,
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius['radius-lg'],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.smd,
  },

  // Sections
  section: {
    paddingTop: Spacing.smd,
  },
  navItemGap: {
    paddingTop: Spacing.smd,
  },

  // Editable Row (재료/과정)
  editableRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editableRowInput: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    maxHeight: 100,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 96,
    justifyContent: 'flex-end',
    gap: 2,
  },
  amountInput: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
    padding: 0,
    textAlign: 'right',
    marginTop: FONT_BASELINE_OFFSET,
  },
  unitText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurfacevar'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border-borderlight'],
  },

  // Drag area & indicator
  dragArea: {
    position: 'relative',
  },
  dropIndicator: {
    position: 'absolute',
    top: 0,
    left: Spacing.smd,
    right: Spacing.smd,
    height: 2,
    backgroundColor: '#FFC107',
  },

  tipChipInline: {
    paddingTop: Spacing.sm,
  },
  slashMenuInline: {
    paddingTop: Spacing.sm,
    alignSelf: 'flex-start',
  },

  // Breadcrumb prefix (재료 > , 과정 > )
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  breadcrumbPrefix: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurfacevar'],
    marginTop: FONT_BASELINE_OFFSET,
  },

  // Add button row
  addButtonRow: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  addButtonDivider: {
    width: '100%',
    paddingBottom: Spacing.sm,
  },

  // + 묶음 추가
  addGroupSection: {
    paddingTop: Spacing.smd,
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  addGroupText: {
    fontFamily: Typography.label['large - semibold'].fontFamily,
    fontSize: Typography.label['large - semibold'].fontSize,
    fontWeight: Typography.label['large - semibold'].fontWeight as '600',
    lineHeight: Typography.label['large - semibold'].lineHeight,
    color: colors['foreground-accent'],
    marginTop: FONT_BASELINE_OFFSET,
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
  menuAligner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md + 48 + Spacing.sm, // tick button(48) + gap(8) 만큼 오프셋
    alignItems: 'flex-end',
  },
  cookbookSheetContent: {
    paddingHorizontal: Spacing.md,
  },
  cookbookSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    borderRadius: Radius['radius-md'],
  },
  cookbookSheetItemSelected: {
    backgroundColor: colors['background-statelayers-surfacefocus_press'],
  },
  cookbookSheetItemPressed: {
    backgroundColor: colors['background-statelayers-surfacefocus_press'],
  },
  cookbookSheetItemLabel: {
    flex: 1,
    fontFamily: Typography.body.large.fontFamily,
    fontSize: Typography.body.large.fontSize,
    fontWeight: Typography.body.large.fontWeight as '500',
    lineHeight: Typography.body.large.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  cookbookTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cookbookValue: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurfacemuted'],
    marginTop: FONT_BASELINE_OFFSET,
  },
});
