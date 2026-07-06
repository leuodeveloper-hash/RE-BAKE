import {useMemo} from 'react';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation, type TranslateFn} from '@contexts/LanguageContext';
import {IconBookFilled, IconChartNoAxesGantt, IconProcess} from '@components/Icon/IconIndex';

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
      all: {id: 'all', label: t(AXIS_LABEL_KEYS.all)},
      cookbook: {id: 'cookbook', label: t(AXIS_LABEL_KEYS.cookbook), icon: IconBookFilled, iconColor: colors['custom/burgundy-var']},
      method: {id: 'method', label: t(AXIS_LABEL_KEYS.method), icon: IconProcess, iconColor: colors['custom/lime-var']},
      retrospective: {id: 'retrospective', label: t(AXIS_LABEL_KEYS.retrospective), icon: IconChartNoAxesGantt, iconColor: colors['custom/light-blue-var']},
    };
    return availableAxes.map(a => {
      const o = overrides?.[a];
      return o ? {...byAxis[a], ...(o.label != null && {label: o.label}), ...(o.icon && {icon: o.icon}), ...(o.iconColor && {iconColor: o.iconColor})} : byAxis[a];
    });
  }, [colors, t, availableAxes, overrides]);
}
