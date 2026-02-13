import React, {useCallback, useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ContentContainer, IconButton, Card, GlassContainer, FloatingNavBar, navPillStyle, MAX_CONTENT_WIDTH} from '@components/Layout';
import {ListItem} from '@components/ListItem';
import {Menu} from '@components/Menu';
import {EditableChip} from '@components/EditableChip';
import {OptionTile} from '@components/OptionTile';
import {FieldManageDialog} from '@components/Dialog';
import {SemanticColorsLight} from '@constants/tokens';
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
  IconDescription,
  IconMinus,
  IconAdd,
  IconDragger,
  IconChevronRight,
  IconBookFilled,
  IconChartNoAxesGantt,
  IconSettingsFilled,
  IconOpenbook,
  IconWind,
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
    method?: string;
    ratio?: string;
    ingredientGroups: {title: string; ingredients: {name: string; amount: string}[]}[];
    tools: {name: string}[];
    stepGroups: {title: string; steps: {step: number; description: string; tip?: string}[]}[];
    activeFieldIds: string[];
  }) => void;
  onComingSoon?: () => void;
  /** 편집 시 전달되는 레시피 데이터 (없으면 빈 생성 화면) */
  recipe?: {
    title: string;
    method?: string;
    ratio?: string;
    ingredientGroups?: {title: string; ingredients: {name: string; amount: string}[]}[];
    tools?: {name: string}[];
    steps?: {step: number; description: string; tip?: string}[];
    stepGroups?: {title: string; steps: {step: number; description: string; tip?: string}[]}[];
    activeFieldIds?: string[];
  };
}

// 메뉴 아이템
const EDIT_MENU_ITEMS = [
  {id: 'field-manage', label: '필드관리', icon: IconSettingsFilled},
];

// Web: textarea 포커스 아웃라인 제거
const noOutline: any = {outlineStyle: 'none'};

// ---- Drag Handle Styles ----

const ROW_HEIGHT = 48;

const dragStyles = StyleSheet.create({
  handle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---- Component ----

export function RecipeEditScreen({onClose, onSave, onComingSoon, recipe}: RecipeEditScreenProps) {
  const insets = useSafeAreaInsets();
  const nextIdRef = useRef(100);
  const genId = () => String(nextIdRef.current++);

  // State — recipe prop이 있으면 편집 모드, 없으면 빈 생성 모드
  const [title, setTitle] = useState(() => recipe?.title ?? '');
  const [method, setMethod] = useState(() => recipe?.method ?? '');
  const [ratio, setRatio] = useState(() => recipe?.ratio ?? '');
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
        })),
      }];
    }
    return [{id: genId(), title: '과정', steps: [{id: genId(), description: ''}]}];
  });
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [fieldManageVisible, setFieldManageVisible] = useState(false);
  const [activeFieldIds, setActiveFieldIds] = useState<string[]>(
    recipe?.activeFieldIds ?? [
      'info', 'photo', 'time', 'ingredients', 'steps', 'servings',
      'method', 'ratio', 'cookbook', 'review',
    ],
  );
  const isFieldActive = (id: string) => activeFieldIds.includes(id);

  const handleMenuPress = () => {
    setShowMenu(prev => !prev);
  };

  const handleMenuSelect = (id: string) => {
    setShowMenu(false);
    if (id === 'field-manage') {
      setFieldManageVisible(true);
    }
  };

  const handleOverlayPress = () => {
    setShowMenu(false);
  };
  const dragY = useRef(new Animated.Value(0)).current;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const dropTargetRef = useRef<number | null>(null);
  const dragItemsLengthRef = useRef(0);
  const indicatorTop = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  // Multiline auto-grow heights
  const [inputHeights, setInputHeights] = useState<Record<string, number>>({});
  const onInputContentSizeChange = useCallback((key: string, e: any) => {
    const h = Math.ceil(e.nativeEvent.contentSize.height);
    setInputHeights(prev => {
      if (prev[key] === h) return prev;
      return {...prev, [key]: h};
    });
  }, []);

  // 웹: step textarea 높이를 DOM scrollHeight로 직접 측정 (grow + shrink 모두 지원)
  const stepNodeRefs = useRef<Record<string, any>>({});
  const resizeStepTextarea = useCallback((key: string) => {
    const node = stepNodeRefs.current[key];
    if (!node) return;
    const el = (node as any)?._node ?? node;
    const textarea = el?.tagName === 'TEXTAREA' ? el : el?.querySelector?.('textarea');
    if (!textarea) return;
    textarea.style.height = '0';
    const h = textarea.scrollHeight;
    textarea.style.height = h + 'px';
    setInputHeights(prev => {
      if (prev[key] === h) return prev;
      return {...prev, [key]: h};
    });
  }, []);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      for (const key of Object.keys(stepNodeRefs.current)) {
        resizeStepTextarea(key);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [resizeStepTextarea]);

  // Drop target listener — Animated.Value만 업데이트, setState 없음 (리렌더 방지)
  React.useEffect(() => {
    const id = dragY.addListener(({value}) => {
      if (dragFromRef.current === null) return;
      const fromIdx = dragFromRef.current;
      const moveBy = Math.round(value / ROW_HEIGHT);
      const maxIdx = dragItemsLengthRef.current - 1;
      const newIdx = Math.max(0, Math.min(maxIdx, fromIdx + moveBy));
      if (newIdx !== dropTargetRef.current) {
        dropTargetRef.current = newIdx;
        if (newIdx !== fromIdx) {
          const gapIdx = newIdx < fromIdx ? newIdx : newIdx + 1;
          indicatorTop.setValue(gapIdx * ROW_HEIGHT);
          indicatorOpacity.setValue(1);
        } else {
          indicatorOpacity.setValue(0);
        }
      }
    });
    return () => dragY.removeListener(id);
  }, [dragY, indicatorTop, indicatorOpacity]);

  // ---- Drag reorder ----

  const createDragHandlers = useCallback(
    (itemId: string, index: number, items: {id: string}[], reorder: (from: number, to: number) => void) => {
      const callbacksRef = {itemId, index, items, reorder};
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
        onPanResponderGrant: () => {
          setScrollEnabled(false);
          setDraggingId(callbacksRef.itemId);
          dragFromRef.current = callbacksRef.index;
          dropTargetRef.current = callbacksRef.index;
          dragItemsLengthRef.current = callbacksRef.items.length;
          indicatorOpacity.setValue(0);
          dragY.setValue(0);
        },
        onPanResponderMove: Animated.event([null, {dy: dragY}], {useNativeDriver: false}),
        onPanResponderRelease: (_, gesture) => {
          const fromIdx = dragFromRef.current ?? 0;
          const moveBy = Math.round(gesture.dy / ROW_HEIGHT);
          const newIdx = Math.max(0, Math.min(callbacksRef.items.length - 1, fromIdx + moveBy));
          if (fromIdx !== newIdx) {
            callbacksRef.reorder(fromIdx, newIdx);
          }
          dragY.setValue(0);
          indicatorOpacity.setValue(0);
          setDraggingId(null);
          dropTargetRef.current = null;
          dragFromRef.current = null;
          setScrollEnabled(true);
        },
        onPanResponderTerminate: () => {
          dragY.setValue(0);
          indicatorOpacity.setValue(0);
          setDraggingId(null);
          dropTargetRef.current = null;
          dragFromRef.current = null;
          setScrollEnabled(true);
        },
      });
    },
    [dragY],
  );

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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}>
        {/* Spacer for nav bar */}
        <View style={{height: 72 + insets.top}} />

        {/* Title & Description */}
        <ContentContainer>
          <Card>
            <View style={styles.titleContainer}>
              <RNTextInput
                style={[styles.titleInput, noOutline, inputHeights['title'] != null && {height: inputHeights['title']}]}
                placeholder="레시피 제목"
                placeholderTextColor={
                  SemanticColorsLight['foreground-onsurfacemuted']
                }
                value={title}
                onChangeText={setTitle}
                multiline
                numberOfLines={1}
                blurOnSubmit={false}
                onContentSizeChange={e => onInputContentSizeChange('title', e)}
              />
            </View>
            <View style={styles.dividerFull} />
            <View style={styles.descriptionContainer}>
              <RNTextInput
                style={[styles.descriptionInput, noOutline, inputHeights['desc'] != null && {height: inputHeights['desc']}]}
                placeholder="설명"
                placeholderTextColor={
                  SemanticColorsLight['foreground-onsurfacemuted']
                }
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
            <OptionTile icon={IconPhoto} label="사진" />
            <OptionTile icon={IconClockFilled} label="1시간 30분" />
            <OptionTile icon={IconUserFilled} label="분량" />
            <OptionTile icon={IconHash} label="회차" />
          </View>
          {(isFieldActive('method') || isFieldActive('ratio')) && (
            <View style={styles.chipRow}>
              {isFieldActive('method') && (
                <EditableChip label={method} placeholder="공법" variant="yellow" icon={IconOpenbook} onChangeText={setMethod} />
              )}
              {isFieldActive('ratio') && (
                <EditableChip label={ratio} placeholder="비중" variant="yellow" icon={IconWind} onChangeText={setRatio} />
              )}
            </View>
          )}
        </ContentContainer>

        {/* 재료 Groups */}
        {ingredientGroups.map((group, groupIndex) => (
          <ContentContainer key={group.id} style={groupIndex === 0 ? styles.section : styles.addGroupSection}>
            <Card>
              {/* Group Header — editable when 2+ groups, non-first gets minus button */}
              {ingredientGroups.length >= 2 ? (
                <ListItem
                  leading={groupIndex > 0
                    ? {type: 'iconButton', icon: IconMinus, onPress: () => removeIngredientGroup(group.id)}
                    : {type: 'icon', icon: IconDescription}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addIngredient(group.id)}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>재료</Text>
                    <IconChevronRight width={8} height={8} color={SemanticColorsLight['foreground-onsurfacevar']} />
                    <RNTextInput
                      style={[styles.editableRowInput, noOutline, inputHeights[`igt-${group.id}`] != null && {height: inputHeights[`igt-${group.id}`]}]}
                      value={group.title}
                      onChangeText={v => updateIngredientGroupTitle(group.id, v)}
                      placeholder="그룹 이름"
                      placeholderTextColor={SemanticColorsLight['foreground-onsurfacemuted']}
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
                  leading={{type: 'icon', icon: IconDescription}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addIngredient(group.id)}}
                />
              )}

              {/* Ingredients */}
              <View style={styles.dragArea}>
                {group.ingredients.map((ingredient, index) => {
                  const canDrag = group.ingredients.length > 1;
                  const responder = canDrag
                    ? createDragHandlers(
                        ingredient.id,
                        index,
                        group.ingredients,
                        (from, to) => reorderIngredients(group.id, from, to),
                      )
                    : null;
                  const isDragging = draggingId === ingredient.id;
                  return (
                    <Animated.View
                      key={ingredient.id}
                      style={isDragging ? {transform: [{translateY: dragY}], zIndex: 10, opacity: 0.85} : undefined}>
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
                                color={SemanticColorsLight['foreground-onsurfacemuted']}
                                opacity={canDrag ? 1 : 0.3}
                              />
                            </View>
                          ),
                        }}
                        showDivider={index < group.ingredients.length - 1}>
                        <View style={styles.editableRowContent}>
                          <RNTextInput
                            style={[styles.editableRowInput, noOutline, inputHeights[ingredient.id] != null && {height: inputHeights[ingredient.id]}]}
                            placeholder="예: 감자"
                            placeholderTextColor={
                              SemanticColorsLight['foreground-onsurfacemuted']
                            }
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
                              placeholderTextColor={
                                SemanticColorsLight['foreground-onsurfacemuted']
                              }
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
                {draggingId !== null && group.ingredients.some(i => i.id === draggingId) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.dropIndicator, {transform: [{translateY: indicatorTop}], opacity: indicatorOpacity}]}
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
              <IconAdd width={16} height={16} color={SemanticColorsLight['foreground-accent']} />
              <Text style={styles.addGroupText}>재료 묶음 추가</Text>
            </Pressable>
          </Card>
        </ContentContainer>

        {/* 도구 */}
        <ContentContainer style={styles.section}>
          <Card>
            <ListItem
              title="도구"
              leading={{type: 'icon', icon: IconDescription}}
              trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addTool()}}
            />
            <View style={styles.dragArea}>
              {tools.map((tool, index) => {
                const canDrag = tools.length > 1;
                const responder = canDrag
                  ? createDragHandlers(
                      tool.id,
                      index,
                      tools,
                      (from, to) => reorderTools(from, to),
                    )
                  : null;
                const isDragging = draggingId === tool.id;
                return (
                  <Animated.View
                    key={tool.id}
                    style={isDragging ? {transform: [{translateY: dragY}], zIndex: 10, opacity: 0.85} : undefined}>
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
                              color={SemanticColorsLight['foreground-onsurfacemuted']}
                              opacity={canDrag ? 1 : 0.3}
                            />
                          </View>
                        ),
                      }}
                      showDivider={index < tools.length - 1}>
                      <RNTextInput
                        style={[styles.editableRowInput, noOutline, inputHeights[tool.id] != null && {height: inputHeights[tool.id]}]}
                        placeholder="예: 믹싱볼"
                        placeholderTextColor={SemanticColorsLight['foreground-onsurfacemuted']}
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
              {draggingId !== null && tools.some(t => t.id === draggingId) && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.dropIndicator, {transform: [{translateY: indicatorTop}], opacity: indicatorOpacity}]}
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

        {/* 과정 Groups */}
        {stepGroups.map((group, groupIndex) => (
          <ContentContainer key={group.id} style={groupIndex === 0 ? styles.section : styles.addGroupSection}>
            <Card>
              {/* Group Header — editable when 2+ groups, non-first gets minus button */}
              {stepGroups.length >= 2 ? (
                <ListItem
                  leading={groupIndex > 0
                    ? {type: 'iconButton', icon: IconMinus, onPress: () => removeStepGroup(group.id)}
                    : {type: 'icon', icon: IconDescription}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addStep(group.id)}}>
                  <View style={styles.breadcrumbRow}>
                    <Text style={styles.breadcrumbPrefix}>과정</Text>
                    <IconChevronRight width={8} height={8} color={SemanticColorsLight['foreground-onsurfacevar']} />
                    <RNTextInput
                      style={[styles.editableRowInput, noOutline, inputHeights[`sgt-${group.id}`] != null && {height: inputHeights[`sgt-${group.id}`]}]}
                      value={group.title}
                      onChangeText={v => updateStepGroupTitle(group.id, v)}
                      placeholder="그룹 이름"
                      placeholderTextColor={SemanticColorsLight['foreground-onsurfacemuted']}
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
                  leading={{type: 'icon', icon: IconDescription}}
                  trailing={{type: 'iconButton', icon: IconAdd, onPress: () => addStep(group.id)}}
                />
              )}

              {/* Steps */}
              <View style={styles.dragArea}>
                {group.steps.map((step, index) => {
                  const canDrag = group.steps.length > 1;
                  const responder = canDrag
                    ? createDragHandlers(
                        step.id,
                        index,
                        group.steps,
                        (from, to) => reorderSteps(group.id, from, to),
                      )
                    : null;
                  const isDragging = draggingId === step.id;
                  return (
                    <Animated.View
                      key={step.id}
                      style={isDragging ? {transform: [{translateY: dragY}], zIndex: 10, opacity: 0.85} : undefined}>
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
                                color={SemanticColorsLight['foreground-onsurfacemuted']}
                                opacity={canDrag ? 1 : 0.3}
                              />
                            </View>
                          ),
                        }}
                        titleNumberOfLines={0}
                        showDivider={index < group.steps.length - 1}>
                        <RNTextInput
                          ref={(node: any) => {
                            if (node) stepNodeRefs.current[`step-${step.id}`] = node;
                            else delete stepNodeRefs.current[`step-${step.id}`];
                          }}
                          style={[styles.stepEditInput, noOutline, inputHeights[`step-${step.id}`] != null && {height: inputHeights[`step-${step.id}`]}]}
                          placeholder="예: 물과 반죽을 넣어 거품기로 친다."
                          placeholderTextColor={
                            SemanticColorsLight['foreground-onsurfacemuted']
                          }
                          value={step.description}
                          onChangeText={v => {
                            updateStep(group.id, step.id, v);
                            resizeStepTextarea(`step-${step.id}`);
                          }}
                          multiline
                          numberOfLines={1}
                          blurOnSubmit={false}
                        />
                        {step.tip && (
                          <View style={styles.tipChipInline}>
                            <EditableChip
                              label={step.tip}
                              variant="tip"
                              onChangeText={v => updateStepTip(group.id, step.id, v)}
                              onRemove={() => removeStepTip(group.id, step.id)}
                            />
                          </View>
                        )}
                      </ListItem>
                    </Animated.View>
                  );
                })}
                {/* Absolutely positioned drop indicator */}
                {draggingId !== null && group.steps.some(s => s.id === draggingId) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.dropIndicator, {transform: [{translateY: indicatorTop}], opacity: indicatorOpacity}]}
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
              <IconAdd width={16} height={16} color={SemanticColorsLight['foreground-accent']} />
              <Text style={styles.addGroupText}>과정 묶음 추가</Text>
            </Pressable>
          </Card>
        </ContentContainer>

        {/* Navigation Items */}
        {isFieldActive('cookbook') && (
          <ContentContainer style={styles.section}>
            <Card>
              <ListItem
                title="요리책"
                leading={{type: 'icon', icon: IconBookFilled}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                onPress={onComingSoon}
              />
            </Card>
          </ContentContainer>
        )}
        {isFieldActive('review') && (
          <ContentContainer style={isFieldActive('cookbook') ? styles.navItemGap : styles.section}>
            <Card>
              <ListItem
                title="회고"
                leading={{type: 'icon', icon: IconChartNoAxesGantt}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={false}
                onPress={onComingSoon}
              />
            </Card>
          </ContentContainer>
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
        pointerEvents={showMenu ? 'auto' : 'none'}
      />

      {/* Context Menu */}
      <View style={[styles.menuLayer, {top: insets.top + 60}]} pointerEvents="box-none">
        <View style={styles.menuAligner} pointerEvents="box-none">
          <Menu
            items={EDIT_MENU_ITEMS}
            onSelect={handleMenuSelect}
            visible={showMenu}
          />
        </View>
      </View>

      {/* 필드관리 다이얼로그 */}
      <FieldManageDialog
        visible={fieldManageVisible}
        onClose={() => setFieldManageVisible(false)}
        activeFieldIds={activeFieldIds}
        onConfirm={setActiveFieldIds}
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
                  method: method || undefined,
                  ratio: ratio || undefined,
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
                      .map((s, idx) => ({step: idx + 1, description: s.description, tip: s.tip})),
                  })),
                  activeFieldIds,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SemanticColorsLight['surface-surfacedim'],
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
  titleContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  titleInput: {
    fontFamily: Typography.headline.small.fontFamily,
    fontSize: Typography.headline.small.fontSize,
    fontWeight: Typography.headline.small.fontWeight as '600',
    lineHeight: Typography.headline.small.lineHeight,
    letterSpacing: Typography.headline.small.letterSpacing,
    color: SemanticColorsLight['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    maxHeight: 100,
  },
  dividerFull: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SemanticColorsLight['border-borderlight'],
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
    color: SemanticColorsLight['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    maxHeight: 100,
  },

  // Option Tiles
  optionTilesSection: {
    paddingTop: Spacing.smd,
  },
  optionTilesRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
    color: SemanticColorsLight['foreground-onsurface'],
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
    color: SemanticColorsLight['foreground-onsurface'],
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
    color: SemanticColorsLight['foreground-onsurfacevar'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SemanticColorsLight['border-borderlight'],
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

  // Step edit (multiline, no height cap)
  stepEditInput: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
  },
  tipChipInline: {
    paddingTop: Spacing.sm,
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
    color: SemanticColorsLight['foreground-onsurfacevar'],
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
    color: SemanticColorsLight['foreground-accent'],
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
});
