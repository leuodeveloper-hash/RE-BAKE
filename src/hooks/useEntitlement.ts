import {useMemo} from 'react';
import {useAuth} from '@contexts/AuthContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {useRecipes} from '@contexts/RecipeContext';
import {
  ENTITLEMENTS,
  nextActionFor,
  type Entitlement,
  type FeatureFlags,
  type GateAction,
  type Tier,
} from '@constants/entitlements';

export interface EntitlementResult {
  tier: Tier;
  limits: Entitlement;
  /** on/off 기능 사용 가능 여부 */
  can: (feature: keyof FeatureFlags) => boolean;
  /** 레시피를 하나 더 만들 수 있는지 (게스트 3개 제한, 로그인 시 무제한) */
  canCreateRecipe: boolean;
  /** 남은 레시피 개수 (무제한이면 Infinity) */
  remainingRecipes: number;
  /** 막혔을 때 유도할 행동 — 'signIn' | 'upgrade' | 'none' */
  nextAction: GateAction;
}

/**
 * 등급별 권한 조회 — 화면은 이 훅으로만 권한을 판단한다.
 *
 * 화면에서 `!user`/`isPro`를 직접 검사하면 정책이 코드 전체에 흩어져
 * 나중에 기준을 바꿀 때 누락이 생긴다. 정책은 @constants/entitlements 에만 둔다.
 */
export function useEntitlement(): EntitlementResult {
  const {user} = useAuth();
  const {isPro} = useSubscription();
  const {recipes} = useRecipes();

  return useMemo(() => {
    const tier: Tier = !user ? 'guest' : isPro ? 'pro' : 'free';
    const limits = ENTITLEMENTS[tier];
    const used = recipes.length;
    const remainingRecipes = Math.max(0, limits.quota.recipes - used);

    return {
      tier,
      limits,
      can: (feature: keyof FeatureFlags) => limits[feature],
      canCreateRecipe: used < limits.quota.recipes,
      remainingRecipes,
      nextAction: nextActionFor(tier),
    };
  }, [user, isPro, recipes.length]);
}
