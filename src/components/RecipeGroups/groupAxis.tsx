import {useCallback, useMemo} from 'react';
import {useAuth} from '@contexts/AuthContext';
import {useRouter} from 'expo-router';
import {requestLanding} from '@utils/landing';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation, type TranslateFn} from '@contexts/LanguageContext';
import {IconBookFilled, IconPenTipFilled, IconNoteFilled, IconProcess, IconLogoSymbol} from '@components/Icon/IconIndex';

/**
 * 레시피 그룹화 축 — 홈/둘러보기 공통 기준.
 * 한 곳(여기)만 바꾸면 축 옵션·라벨·아이콘이 홈/둘러보기/GroupScreen 모두에 반영된다.
 */
export type GroupAxis = 'all' | 'cookbook' | 'method' | 'retrospective';

/** 회고 노트 빈 상태 공통 문구 (노트 카드 / 회고 섹션 / 회고 바텀시트 공용) */
export function emptyRetrospectiveMessage(t: TranslateFn): string {
  return t('groupAxis.emptyRetrospective');
}

const AXIS_LABEL_KEYS: Record<GroupAxis, string> = {
  all: 'groupAxis.axisAll',
  cookbook: 'groupAxis.axisCookbook',
  method: 'groupAxis.axisMethod',
  retrospective: 'groupAxis.axisRetrospective',
};

/** 기본 노출 축 (홈). 둘러보기는 회고를 빼고 ['all','cookbook','method']만 사용. */
export const DEFAULT_AXES: GroupAxis[] = ['all', 'cookbook', 'method', 'retrospective'];

export interface AxisMenuItem {
  id: GroupAxis;
  label: string;
  icon?: React.FC<any>;
  iconColor?: string;
}

/** 축별 라벨/아이콘 오버라이드 (예: 둘러보기에서 cookbook → "공식 레시피북" + 로고 네모 아이콘) */
export type AxisOverrides = Partial<Record<GroupAxis, {label?: string; icon?: React.FC<any>; iconColor?: string}>>;

/** 오버라이드 적용된 축 라벨 (제목/브레드크럼용) */
export function axisLabel(t: TranslateFn, axis: GroupAxis, overrides?: AxisOverrides): string {
  return overrides?.[axis]?.label ?? t(AXIS_LABEL_KEYS[axis]);
}

/**
 * 축 선택 드롭다운 메뉴 항목 (전체/레시피북/공법/회고). availableAxes로 노출 축을 제한,
 * overrides로 특정 축의 라벨/아이콘 교체.
 */
export function useAxisMenuItems(availableAxes: GroupAxis[] = DEFAULT_AXES, overrides?: AxisOverrides): AxisMenuItem[] {
  const colors = useColors();
  const {t} = useTranslation();
  return useMemo(() => {
    const byAxis: Record<GroupAxis, AxisMenuItem> = {
      // 레시피 추가(하단 +)와 같은 아이콘 — 같은 것을 가리키는 자리는 같게 보여야 한다
      all: {id: 'all', label: t(AXIS_LABEL_KEYS.all), icon: IconNoteFilled, iconColor: colors['custom/orange-var']},
      cookbook: {id: 'cookbook', label: t(AXIS_LABEL_KEYS.cookbook), icon: IconBookFilled, iconColor: colors['custom/burgundy-var']},
      method: {id: 'method', label: t(AXIS_LABEL_KEYS.method), icon: IconProcess, iconColor: colors['custom/lime-var']},
      retrospective: {id: 'retrospective', label: t(AXIS_LABEL_KEYS.retrospective), icon: IconPenTipFilled, iconColor: colors['custom/light-blue-var']},
    };
    return availableAxes.map(a => {
      const o = overrides?.[a];
      return o ? {...byAxis[a], ...(o.label != null && {label: o.label}), ...(o.icon && {icon: o.icon}), ...(o.iconColor && {iconColor: o.iconColor})} : byAxis[a];
    });
  }, [colors, t, availableAxes, overrides]);
}

/**
 * 2뎁스 목록 맨 위 '전체' — 아이콘 없이 글자만(홈·둘러보기·표지 화면 공용)
 */
export function allMenuItem(id: string, label: string, kind: 'cookbook' | 'method', colors: ReturnType<typeof useColors>) {
  // '전체'는 어느 목록이든 글자만
  return {id, label};
}

/** 공법 목록 항목 — 앱바 2뎁스 셀렉터 메뉴. 글자만(같은 아이콘을 줄마다 반복하면 시끄럽다) */
export function methodMenuItem(name: string, _colors?: ReturnType<typeof useColors>) {
  return {id: name, label: name};
}

export const LANDING_MENU_ID = '__landing__';

/**
 * 보기(축) 메뉴 맨 아래 "홈"(소개 화면) — 로그인 전에만(로그인 후엔 소개 화면이 없다).
 * 따로 있던 로그인 전 로고 버튼을 이 메뉴로 합쳤다. 축 메뉴가 있는 화면은 모두 이걸 쓴다.
 *   const landing = useLandingMenu(axisMenuItems);
 *   <Menu items={landing.items} onSelect={id => landing.handle(id) || 원래처리(id)} />
 */
export function useLandingMenu<T extends {id: string; showDivider?: boolean}>(items: T[]) {
  const {user} = useAuth();
  const router = useRouter();
  const {t} = useTranslation();
  const out = useMemo(() => {
    if (user || items.length === 0) return items as (T | AxisMenuItem)[];
    const last = {...items[items.length - 1], showDivider: true};
    return [...items.slice(0, -1), last, {id: LANDING_MENU_ID, label: t('appBar.landing'), icon: IconLogoSymbol} as unknown as AxisMenuItem];
  }, [user, items, t]);
  const handle = useCallback((id: string) => {
    if (id !== LANDING_MENU_ID) return false;
    requestLanding();
    router.push('/' as any);
    return true;
  }, [router]);
  return {items: out, handle};
}
