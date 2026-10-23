import React, {useRef, createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import {NavPillButton, NavPillGroup} from '@components/Navigation/NavPillButton';
import {IconButton} from '@components/IconButton';
import {IconEdit, IconArrowTopRight} from '@components/Icon/IconIndex';
import {DictionaryTermDialog} from '@components/Dialog/DictionaryTermDialog';
import {saveDictionaryTerm, deleteDictionaryTerm} from '@hooks/useDictionary';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import {IconDic} from '@components/Icon/IconIndex';
import {useRouter} from 'expo-router';
import {Image as ExpoImage} from 'expo-image';
import {BottomSheet} from '@components/BottomSheet';
import {RichText} from '@components/RichText/RichText';
import {withoutSecret} from '@utils/richText';
import {useRecipes} from '@contexts/RecipeContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {Recipe} from '../types/recipe';
import type {BakingMethod, MethodCategory} from '@constants/bakingMethods';

/** 앱 안 레시피 링크 — recipe/{id}, /recipe/{id}, bakle://recipe/{id} */
export function internalRecipeId(url: string): string | null {
  // https://recipe/id — 예전에 https가 잘못 붙어 저장된 링크도 앱 안 링크로 읽는다
  const m = url.match(/^(?:bakle:\/\/|https?:\/\/)?\/?recipe\/([^/?#]+)/);
  return m ? m[1] : null;
}

/**
 * 링크 종류 — 그리는 모양과 여는 방법이 갈린다.
 *  - external: 바깥 주소(밑줄 + 화살표, 브라우저)
 *  - tip: 팁(밑줄만, 바텀시트)
 *  - recipe: 앱 안 레시피(밑줄만, 상세 위에 상세)
 *  - dead: 가리키는 레시피가 없거나 공개되지 않음 → 링크가 없는 것처럼 글자만
 */
export type RecipeLinkKind = 'external' | 'tip' | 'recipe' | 'dead';

interface RecipeLinkValue {
  /** 본문 링크 열기 — 팁은 바텀시트, 레시피는 앱 안 상세(위에 상세), 그 밖은 브라우저 */
  openLink: (url: string) => void;
  linkKind: (url: string) => RecipeLinkKind;
  /** 공법 이름 열기 — 사전 시트. withViewAll이면 헤더에 '사전 전체 보기'. Provider 밖이면 없다 */
  openMethod?: (method: BakingMethod, opts?: {withViewAll?: boolean}) => void;
  /** 사전 항목 만들기·고치기(어드민) — term 없으면 새 항목 */
  openTermEditor?: (term?: BakingMethod | null, category?: MethodCategory) => void;
}

const RecipeLinkContext = createContext<RecipeLinkValue | null>(null);

/**
 * 본문 링크를 종류별로 연다.
 * 팁은 짧아서 그 자리에서 바텀시트로 보고 닫는다. 시트는 이 Provider가 놓인 곳에 그려지므로,
 * 요리모드처럼 이미 전체화면 창(Modal) 안이면 그 안에도 Provider를 둬야 시트가 그 위에 뜬다(iOS).
 */
export function RecipeLinkProvider({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const {recipes} = useRecipes();
  const {recipes: exploreRecipes} = useExploreRecipeContext();
  const [tip, setTip] = useState<Recipe | null>(null);

  // 앱 안 링크가 가리키는 레시피 — 내 것 또는 둘러보기. 숨김(비공개)이면 없는 것으로 본다(어드민도 사용자와 같게)
  const findTarget = useCallback((id: string): Recipe | undefined => {
    const target = recipes.find(r => r.id === id) ?? exploreRecipes.find(r => r.id === id);
    return target && !target.hidden ? target : undefined;
  }, [recipes, exploreRecipes]);

  const linkKind = useCallback((url: string): RecipeLinkKind => {
    const id = internalRecipeId(url);
    if (!id) return 'external';
    const target = findTarget(id);
    if (!target) return 'dead';
    return target.kind === 'tip' ? 'tip' : 'recipe';
  }, [findTarget]);

  const openLink = useCallback((url: string) => {
    const id = internalRecipeId(url);
    if (id) {
      const target = findTarget(id);
      if (!target) return; // 비공개·없는 레시피 — 열지 않는다(글자만 보인다)
      if (target.kind === 'tip') { setTip(target); return; }
      router.push(`/recipe/${id}` as any);
      return;
    }
    Linking.openURL(withoutSecret(url)).catch(() => { /* 열 수 없는 주소는 무시 */ });
  }, [findTarget, router]);

  // 공법 설명 — 그 자리에서 사전 시트로 보고 닫는다. 헤더 버튼으로 사전 전체(그 공법 위치)로
  const [method, setMethod] = useState<{m: BakingMethod; viewAll: boolean} | null>(null);
  const openMethod = useCallback((m: BakingMethod, opts?: {withViewAll?: boolean}) => {
    setMethod({m, viewAll: opts?.withViewAll ?? true});
  }, []);
  // 사전 항목 편집 창(어드민) — 시트·사전 페이지 어디서 열어도 같은 창
  const {isAdmin} = useAuth();
  const {showSnackbar} = useSnackbar();
  const {t} = useTranslation();
  const [termEditor, setTermEditor] = useState<{term: BakingMethod | null; category?: MethodCategory} | null>(null);
  // 시트를 닫고 바로 다른 창을 열면 아이폰이 새 창을 무시한다 — 시트가 다 내려간 뒤(onDismissed) 연다
  const afterMethodSheet = useRef<(() => void) | null>(null);
  const openTermEditor = useCallback((term?: BakingMethod | null, category?: MethodCategory) => {
    const next = {term: term ?? null, category};
    if (method) {
      afterMethodSheet.current = () => setTermEditor(next);
      setMethod(null);
    } else {
      setTermEditor(next);
    }
  }, [method]);
  const openDictionary = useCallback(() => {
    if (!method) return;
    const name = method.m.name;
    setMethod(null);
    router.push(`/method-guide?name=${encodeURIComponent(name)}` as any);
  }, [method, router]);

  const value = useMemo(
    () => ({openLink, linkKind, openMethod, openTermEditor: isAdmin ? openTermEditor : undefined}),
    [openLink, linkKind, openMethod, openTermEditor, isAdmin],
  );
  return (
    <RecipeLinkContext.Provider value={value}>
      {children}
      <TipSheet tip={tip} onClose={() => setTip(null)} onOpenRecipe={id => { setTip(null); router.push(`/recipe/${id}` as any); }} />
      <MethodSheet
        method={method?.m ?? null}
        onClose={() => setMethod(null)}
        onViewAll={method?.viewAll ? openDictionary : undefined}
        onEdit={isAdmin && method ? () => openTermEditor(method.m) : undefined}
        onDismissed={() => { const next = afterMethodSheet.current; afterMethodSheet.current = null; next?.(); }}
      />
      <DictionaryTermDialog
        visible={!!termEditor}
        onClose={() => setTermEditor(null)}
        term={termEditor?.term}
        initialCategory={termEditor?.category}
        onSave={v => saveDictionaryTerm(v)
          .then(() => showSnackbar(t('dictionary.saved'), {tone: 'positive'}))
          .catch(e => { console.warn('[dictionary] 저장 실패:', e); showSnackbar(t('dictionary.saveFailed')); })}
        onDelete={id => deleteDictionaryTerm(id)
          .then(() => showSnackbar(t('dictionary.deleted')))
          .catch(e => { console.warn('[dictionary] 삭제 실패:', e); showSnackbar(t('dictionary.saveFailed')); })}
      />
    </RecipeLinkContext.Provider>
  );
}

/** Provider 밖이면 예전처럼 — 레시피는 상세로, 그 밖은 브라우저 */
export function useRecipeLink(): RecipeLinkValue {
  const ctx = useContext(RecipeLinkContext);
  const router = useRouter();
  return ctx ?? {
    linkKind: (url: string) => (internalRecipeId(url) ? 'recipe' : 'external'),
    openLink: (url: string) => {
      const id = internalRecipeId(url);
      if (id) router.push(`/recipe/${id}` as any);
      else Linking.openURL(url).catch(() => {});
    },
  };
}

/** 팁 바텀시트 — 사진, 준비물(재료·도구), 내용(과정 설명 + 팁·주의), 조언. 있는 것만 */
function TipSheet({tip, onClose, onOpenRecipe}: {tip: Recipe | null; onClose: () => void; onOpenRecipe: (id: string) => void}) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const content = useMemo(() => {
    if (!tip) return null;
    // 과정 묶음 — 묶음 이름과 함께. 묶음이 없으면 한 덩어리
    // 필드 관리에서 끈 칸은 값이 남아 있어도 안 보인다(상세와 같은 규칙)
    const on = (f: string) => !tip.activeFieldIds || tip.activeFieldIds.includes(f);
    const stepGroups = (!on('steps') ? [] : tip.stepGroups?.length ? tip.stepGroups : [{title: '', steps: tip.steps ?? []}])
      .map(g => ({title: g.title?.trim() ?? '', steps: g.steps.filter(s => s.description?.trim())}))
      .filter(g => g.steps.length > 0);
    const ingredients = !on('ingredients') ? [] : (tip.ingredientGroups?.length ? tip.ingredientGroups.flatMap(g => g.ingredients) : [])
      .filter(i => i.name?.trim());
    const tools = !on('tools') ? [] : (tip.toolGroups?.length ? tip.toolGroups.flatMap(g => g.tools) : (tip.tools ?? []))
      .filter(x => x.name?.trim());
    return {stepGroups, ingredients, tools};
  }, [tip]);
  return (
    <BottomSheet
      visible={!!tip}
      onClose={onClose}
      title={tip?.title ?? ''}
      headerType="center"
      // 앱바 우측 — 실제 레시피(상세)로 가기
      headerRight={tip?.id ? <NavPillButton icon={IconArrowTopRight} onPress={() => onOpenRecipe(tip.id)} /> : undefined}>
      {tip && content && (
        <View style={styles.body}>
          {!!tip.imageUri && (
            <ExpoImage source={{uri: tip.imageUri}} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
          )}
          {content.ingredients.length > 0 && (
            <View style={styles.item}>
              {content.ingredients.map((ing, i) => (
                <RichText key={i} style={styles.text}>{`• ${ing.name}${ing.amount ? ` ${ing.amount}` : ''}`}</RichText>
              ))}
            </View>
          )}
          {content.tools.length > 0 && (
            <RichText style={styles.note}>{content.tools.map(x => x.name).join(', ')}</RichText>
          )}
          {content.stepGroups.map((g, gi) => (
            <View key={gi} style={styles.item}>
              {/* 묶음 제목 — 하위 묶음 이름만('과정 ›'은 반복이라 뺀다) */}
              {g.title ? <Text style={styles.groupTitle}>{g.title}</Text> : null}
              {g.steps.map((s, i) => (
                <View key={i} style={styles.item}>
                  <RichText style={styles.text}>{s.description}</RichText>
                  {!!s.tip?.trim() && <RichText style={styles.note}>{s.tip}</RichText>}
                  {!!s.caution?.trim() && <RichText style={[styles.note, styles.caution]}>{s.caution}</RichText>}
                </View>
              ))}
            </View>
          ))}
          {!!tip.advice?.trim() && <RichText style={styles.text}>{tip.advice}</RichText>}
        </View>
      )}
    </BottomSheet>
  );
}

/** 사전 시트 — 공법 이름과 정리된 설명. 본문은 Text(설명 속 공법 이름이 또 링크되지 않게) */
function MethodSheet({method, onClose, onViewAll, onEdit, onDismissed}: {method: BakingMethod | null; onClose: () => void; onViewAll?: () => void; onEdit?: () => void; onDismissed?: () => void}) {
  const styles = useThemedStyles(createStyles);
  // 헤더 오른쪽 — 시트 헤더 버튼 룰(떠 있는 알약). 여럿이면 한 알약에 묶는다: 고치기(어드민) · 사전 전체
  const right = onEdit && onViewAll ? (
    <NavPillGroup>
      <IconButton icon={IconEdit} variant="ghost-primary" size="medium" onPress={onEdit} />
      <IconButton icon={IconDic} variant="ghost-primary" size="medium" onPress={onViewAll} />
    </NavPillGroup>
  ) : onEdit ? <NavPillButton icon={IconEdit} onPress={onEdit} />
    : onViewAll ? <NavPillButton icon={IconDic} onPress={onViewAll} /> : undefined;
  return (
    <BottomSheet
      visible={!!method}
      onClose={onClose}
      onDismissed={onDismissed}
      title={method?.name ?? ''}
      headerType="center"
      headerRight={right}>
      {method && (
        <View style={styles.methodBody}>
          <Text style={styles.text}>{method.description}</Text>
        </View>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // 사전 시트 — 콘텐츠 상하 8
  methodBody: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, // 시트 내용 위아래 8
    gap: Spacing.md,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius['radius-lg'],
  },
  item: {
    gap: Spacing.xs,
  },
  // 팁 시트 과정 묶음 제목 — 상세 섹션 머리줄 글자와 같은 톤
  groupTitle: {
    ...Typography.caption.large,
    color: colors['foreground/on-surface-muted'],
  },
  text: {
    ...Typography.body.large,
    color: colors['foreground/on-surface'],
  },
  note: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
  },
  caution: {
    color: colors['custom/yellow-var'],
  },
});
