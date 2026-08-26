/**
 * RevenueCat offerings → 화면에서 쓰기 쉬운 형태로 정리.
 *
 * 가격 문자열(priceString)은 스토어가 지역 통화로 내려주므로 앱에서 포맷하지 않는다.
 * (하드코딩하면 통화·세금·가격 변경 때마다 앱을 다시 배포해야 한다)
 */

export interface PlanPackage {
  /** RevenueCat 패키지 원본 — 구매 시 그대로 넘긴다 */
  raw: any;
  /** 'ANNUAL' | 'THREE_MONTH' 등 */
  type: string;
  /** 스토어가 내려준 표시 가격 (예: "₩39,000", "$30.00") */
  priceString: string;
  /** 숫자 가격 — 할인율 계산용 */
  price: number;
  /** 기간 라벨 키 (i18n) */
  periodKey: 'plan.perYear' | 'plan.perThreeMonths' | 'plan.perMonth';
  /** 연간처럼 장기 상품인지 — 기본 선택/강조에 쓴다 */
  isAnnual: boolean;
}

/** 패키지 타입 → 1개월 환산 계수 (할인율 비교용) */
const MONTHS: Record<string, number> = {
  MONTHLY: 1,
  TWO_MONTH: 2,
  THREE_MONTH: 3,
  SIX_MONTH: 6,
  ANNUAL: 12,
};

function periodKeyFor(type: string): PlanPackage['periodKey'] {
  if (type === 'ANNUAL') return 'plan.perYear';
  if (type === 'THREE_MONTH') return 'plan.perThreeMonths';
  return 'plan.perMonth';
}

/**
 * offerings에서 구매 가능한 패키지 목록을 뽑는다.
 * 기간이 긴 것부터(연간 → 3개월) 정렬해 할인 폭이 큰 상품을 위에 보여준다.
 */
export function toPlanPackages(offerings: any): PlanPackage[] {
  const pkgs: any[] = offerings?.current?.availablePackages ?? [];
  return pkgs
    .map(p => {
      const type = String(p?.packageType ?? '');
      return {
        raw: p,
        type,
        priceString: p?.product?.priceString ?? '',
        price: Number(p?.product?.price ?? 0),
        periodKey: periodKeyFor(type),
        isAnnual: type === 'ANNUAL',
      };
    })
    .sort((a, b) => (MONTHS[b.type] ?? 0) - (MONTHS[a.type] ?? 0));
}

/**
 * 기준 상품(가장 짧은 기간) 대비 절약률(%). 계산 불가면 null.
 * 예: 3개월 $10(월 $3.33) vs 연간 $30(월 $2.50) → 25%
 */
export function savingsPercent(target: PlanPackage, all: PlanPackage[]): number | null {
  const base = all
    .filter(p => p !== target && MONTHS[p.type])
    .sort((a, b) => (MONTHS[a.type] ?? 0) - (MONTHS[b.type] ?? 0))[0];
  if (!base || !MONTHS[target.type] || !base.price || !target.price) return null;
  const basePerMonth = base.price / MONTHS[base.type];
  const targetPerMonth = target.price / MONTHS[target.type];
  if (basePerMonth <= 0) return null;
  const pct = Math.round((1 - targetPerMonth / basePerMonth) * 100);
  return pct > 0 ? pct : null;
}
