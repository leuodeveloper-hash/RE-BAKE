/**
 * 등급별 권한(엔타이틀먼트) 정의 — 앱의 무료/유료 정책은 여기 한 곳에서 관리한다.
 *
 * 화면에서 `!user`나 `isPro`를 직접 검사하지 말 것.
 * useEntitlement() 훅으로 "이 기능을 쓸 수 있나"를 물어야 정책 변경이 한 곳으로 모인다.
 */

/** 사용자 등급 */
export type Tier = 'guest' | 'free' | 'pro';

/** 수치 제한이 있는 기능 — 값은 최대 허용 개수 */
export interface QuotaLimits {
  /** 내 레시피 최대 개수 */
  recipes: number;
  /** 레시피당 과정 사진 최대 장수 */
  stepPhotos: number;
  /** PDF 내보내기 최대 횟수 (누적) */
  pdfExports: number;
  /** 둘러보기(공식) 레시피를 잠금 없이 볼 수 있는 개수. 이후는 광고 시청으로 해제 */
  exploreFree: number;
}

/** on/off 기능 */
export interface FeatureFlags {
  /** 클라우드 동기화(기기 간) */
  cloudSync: boolean;
  /** 사진 클라우드 백업 */
  photoBackup: boolean;
  /** URL에서 레시피 가져오기 */
  importFromUrl: boolean;
  /** 시험 알림 */
  examNotifications: boolean;
}

export interface Entitlement extends FeatureFlags {
  quota: QuotaLimits;
}

const UNLIMITED = Number.POSITIVE_INFINITY;

/**
 * 등급이 올라갈수록 제한이 풀린다 — 게스트 3개 → 무료 30개 → Pro 무제한.
 *
 * 게스트 3개는 "가치를 보여주되 계속 쓰려면 계정을 만들게" 하는 선이고,
 * 무료 30개는 일상적인 사용엔 충분하되 헤비 유저에게 업그레이드 이유를 준다.
 *
 * 서버/스토리지가 필요한 기능은 계정이 있어야 하고,
 * 지속 비용이 큰 것(동기화·사진 백업)은 유료로 둔다.
 */
export const ENTITLEMENTS: Record<Tier, Entitlement> = {
  guest: {
    quota: {recipes: 3, stepPhotos: 3, pdfExports: 3, exploreFree: 3},
    cloudSync: false,
    photoBackup: false,
    importFromUrl: false, // 서버 요청 — 계정 필요
    examNotifications: false, // 서버 일정 fetch + 개인 설정 — 계정 필요
  },
  free: {
    quota: {recipes: 30, stepPhotos: 3, pdfExports: 5, exploreFree: 3},
    cloudSync: false, // 지속 비용 — 유료
    photoBackup: false, // 스토리지 비용 — 유료
    importFromUrl: true,
    examNotifications: true,
  },
  pro: {
    quota: {recipes: 100, stepPhotos: 3, pdfExports: UNLIMITED, exploreFree: UNLIMITED},
    cloudSync: true,
    photoBackup: true,
    importFromUrl: true,
    examNotifications: true,
  },
};

/** 제한에 걸렸을 때 어떤 행동을 유도할지 — UI가 안내 문구/버튼을 고르는 데 쓴다 */
export type GateAction = 'signIn' | 'upgrade' | 'contact';

/**
 * 이 등급에서 막혔다면 다음 단계는 무엇인가.
 * Pro는 더 올릴 등급이 없으므로 문의로 안내한다(개별 상향 등).
 */
export function nextActionFor(tier: Tier): GateAction {
  if (tier === 'guest') return 'signIn';
  if (tier === 'free') return 'upgrade';
  return 'contact';
}
