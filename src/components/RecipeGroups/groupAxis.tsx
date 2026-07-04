import {useMemo} from 'react';
import {useColorsV2} from '@contexts/ThemeContext';
import {IconBookFilled, IconChartNoAxesGantt, IconProcess} from '@components/Icon/IconIndex';

/**
 * 레시피 그룹화 축 — 홈/둘러보기 공통 기준.
 * 한 곳(여기)만 바꾸면 축 옵션·라벨·아이콘이 홈/둘러보기/GroupScreen 모두에 반영된다.
 */
export type GroupAxis = 'all' | 'cookbook' | 'method' | 'retrospective';

export const AXIS_LABELS: Record<GroupAxis, string> = {
  all: '전체',
  cookbook: '레시피 북',
  method: '공법',
  retrospective: '회고 노트',
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
export function axisLabel(axis: GroupAxis, overrides?: AxisOverrides): string {
  return overrides?.[axis]?.label ?? AXIS_LABELS[axis];
}

/**
 * 축 선택 드롭다운 메뉴 항목 (전체/레시피북/공법/회고). availableAxes로 노출 축을 제한,
 * overrides로 특정 축의 라벨/아이콘 교체.
 */
export function useAxisMenuItems(availableAxes: GroupAxis[] = DEFAULT_AXES, overrides?: AxisOverrides): AxisMenuItem[] {
  const colors = useColorsV2();
  return useMemo(() => {
    const byAxis: Record<GroupAxis, AxisMenuItem> = {
      all: {id: 'all', label: AXIS_LABELS.all},
      cookbook: {id: 'cookbook', label: AXIS_LABELS.cookbook, icon: IconBookFilled, iconColor: colors['custom/brown-var']},
      method: {id: 'method', label: AXIS_LABELS.method, icon: IconProcess, iconColor: colors['custom/lime-var']},
      retrospective: {id: 'retrospective', label: AXIS_LABELS.retrospective, icon: IconChartNoAxesGantt, iconColor: colors['custom/light-blue-var']},
    };
    return availableAxes.map(a => {
      const o = overrides?.[a];
      return o ? {...byAxis[a], ...(o.label != null && {label: o.label}), ...(o.icon && {icon: o.icon}), ...(o.iconColor && {iconColor: o.iconColor})} : byAxis[a];
    });
  }, [colors, availableAxes, overrides]);
}
