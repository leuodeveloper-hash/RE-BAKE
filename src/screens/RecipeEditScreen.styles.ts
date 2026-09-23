import {StyleSheet} from 'react-native';
import {KEYBOARD_TOOLBAR_HEIGHT} from '@components/KeyboardToolbar';
import {NAV_PILL_HEIGHT} from '@components/Navigation';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {MENU_GAP} from './RecipeEditScreen.constants';

/**
 * 레시피 편집 화면 스타일.
 * 화면 파일이 3,786줄이라 읽기 어려워 스타일(418줄)만 떼어냈다. 내용은 그대로다.
 */
export const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  hiddenInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: NAV_PILL_HEIGHT,
    paddingHorizontal: 8,
  },
  hiddenLabel: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    color: colors['foreground/on-surface'],
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  // 과정 설명 에디터 — 기존 ghost 입력과 같은 본문 폰트
  scrollContent: {
    flexGrow: 1,
    // 포커스된 입력이 키보드+툴바에 가리지 않도록 하단 여백.
    // automaticallyAdjustKeyboardInsets는 키보드만 계산하고 그 위에 뜨는
    // 입력 툴바(KEYBOARD_TOOLBAR_HEIGHT)는 모르기 때문에 직접 더한다.
    paddingBottom: KEYBOARD_TOOLBAR_HEIGHT + Spacing.xxl,
  },

  // Title & Description
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    minHeight: NAV_PILL_HEIGHT,
    gap: Spacing.sm,
  },
  methodRatioContainer: {
    paddingHorizontal: Spacing.md,
    minHeight: NAV_PILL_HEIGHT,
    justifyContent: 'center',
  },
  titleInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  skeletonOverlay: {
    justifyContent: 'center',
  },
  titleChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  methodRatioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodRatioDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border/subtle'],
    marginVertical: Spacing.xs,
  },
  methodRatioVDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors['border/subtle'],
    marginHorizontal: Spacing.sm,
  },
  methodField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  ratioField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  /**
   * 카드 안 모든 입력의 공통 기준 — 제목·설명·별립법·행 입력이 전부 이 하나를 쓴다.
   * 예전엔 네 스타일이 각자 marginTop/textAlignVertical/includeFontPadding을 조금씩
   * 다르게 갖고 있어, 필드마다 글자가 미세하게 어긋났다. 여기서 한 곳으로 관리한다.
   */
  cardFieldInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    // 세로 정렬은 입력이 아니라 컨테이너가 잡는다.
    // 입력에 'center'를 주면 한 줄일 땐 맞지만 여러 줄로 늘어날 때 글이 뭉쳐 보인다.
    textAlignVertical: 'top' as const,
    // includeFontPadding은 끄지 않는다 — 폰트 위쪽 여백이 사라져 글자가 위로 붙는다.
  },
  methodMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    zIndex: 50,
  },
  titleMicButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dividerFull: {
    // 디바이더 라인 대신 1px 간격(surface/dim)으로 구분 — ListItem과 동일
    height: 1,
    backgroundColor: colors['surface/dim'],
  },
  /**
   * 카드 안 한 행의 공통 기준.
   *
   * 세로 여백을 "한 줄일 때의 여백"과 같은 값으로 직접 준다.
   * justifyContent:center에만 기대면 한 줄일 땐 맞지만, 줄이 늘어나
   * minHeight를 넘는 순간 중앙 정렬이 무력해져 위가 좁아 보인다.
   * 패딩으로 잡으면 줄 수와 무관하게 위아래가 같다.
   */
  descriptionContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Math.round((NAV_PILL_HEIGHT - Typography.body.medium.lineHeight) / 2),
  },

  // Option Tiles
  optionTilesSection: {
    paddingTop: Spacing.md,
    zIndex: 10,
  },
  optionTilesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoTileWrap: {
    flex: 1,
    zIndex: 10,
  },
  photoMenu: {
    position: 'absolute' as const,
    top: '100%' as any,
    left: 0,
    marginTop: 4,
    zIndex: 20,
  },
  // 과정 묶음 롱프레스 이동 메뉴 — 헤더 좌측 아래에 뜸
  // 헤더 + 버튼 바로 아래 (버튼이 오른쪽이므로 right 기준)
  // 메뉴는 언제나 "기준 버튼 바로 아래 4px" — 이 규칙을 세 곳이 각자 두면 어긋난다.
  // top:'100%'는 부모(=버튼을 감싼 relative 래퍼) 높이 기준이므로,
  // 래퍼가 버튼 행과 같아야 위치가 맞는다.
  // 왼쪽 아이콘 버튼 기준
  anchoredMenuLeft: {
    position: 'absolute' as const,
    top: '100%' as any,
    left: Spacing.md,
    marginTop: MENU_GAP,
    zIndex: 9999,
    elevation: 24,
  },
  // 오른쪽 + 버튼 기준
  anchoredMenuRight: {
    position: 'absolute' as const,
    top: '100%' as any,
    right: Spacing.md,
    marginTop: MENU_GAP,
    zIndex: 9999,
    elevation: 24,
  },
  photoTileFilled: {
    flex: 1,
    overflow: 'hidden',
    padding: 0,
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius['radius-lg'],
  },
  photoTileSpinner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius['radius-lg'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.smd,
  },

  // Sections
  section: {
    paddingTop: Spacing.md,
  },
  navItemGap: {
    paddingTop: Spacing.md,
  },

  // Editable Row (재료/과정)
  editableRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
    color: colors['foreground/on-surface'],
    padding: 0,
    textAlign: 'right',
    marginTop: FONT_BASELINE_OFFSET,
  },
  amountPlaceholder: {
    color: colors['foreground/on-surface-muted'],
  },
  unitText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface-var'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  divider: {
    // hairlineWidth는 DPR 반올림으로 0px가 돼 가끔 안 보임 → 1px 고정
    height: 1,
    backgroundColor: colors['border/muted'],
  },

  // Drag area & indicator
  dragArea: {
    position: 'relative',
  },

  tipChipInline: {
    paddingTop: Spacing.sm,
  },

  // Breadcrumb prefix (재료 > , 과정 > )
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: FONT_BASELINE_OFFSET,
  },
  breadcrumbPrefix: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface-var'],
  },

  // Add button row
  addButtonRow: {
    paddingBottom: 0,
  },
  addButtonDivider: {
    width: '100%',
    paddingBottom: 0,
  },
  addButtonVDivider: {
    width: 1,
    height: 20,
    alignSelf: 'center',
    backgroundColor: colors['border/muted'],
  },
  addButtonPair: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    gap: 16,
  },

  // + 묶음 추가 (재료 등)
  addGroupSection: {
    paddingTop: Spacing.md,
  },
  addGroupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48, // 다른 행(ListItem)과 동일한 고정 높이 (패딩/텍스트에 안 눌리게)
    gap: Spacing.xs,
  },
  addGroupText: {
    fontFamily: Typography.label['xlarge - semibold'].fontFamily,
    fontSize: Typography.label['xlarge - semibold'].fontSize,
    fontWeight: Typography.label['xlarge - semibold'].fontWeight as '600',
    lineHeight: Typography.label['xlarge - semibold'].lineHeight,
    color: colors['foreground/accent'],
  },

  // Tool bulk mode toggle
  toolHeaderTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  // 단일 그룹 헤더 + 버튼을 하단 행의 - 버튼(ListItem iconButton 슬롯 28)과 동일 슬롯에 배치해 정렬 맞춤
  // 헤더 +/- 버튼: 아이템 행 trailing 버튼과 우측 정렬이 맞도록 고정 28 슬롯 제거.
  // (28 슬롯에 medium 버튼을 가두면 아이템 버튼보다 안쪽으로 들어가 보였음)
  // 행의 +/- 버튼(ListItem iconButtonSlot)과 같은 28 슬롯 기준 — 크기를 안 주면
  // 버튼 실제 크기(40)만큼 벌어져 헤더 +와 행 -의 중심선이 세로로 어긋난다.
  headerAddSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: 2,
  },
  toggleLabel: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors['foreground/on-surface-muted'],
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors['custom/orange-var'],
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  bulkToolInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
  },
  // bulk 멀티라인 입력: editableRowInput의 flex:1(가로 행용)이 AutoGrowInput의 자동
  // 높이를 무력화해 한 줄로 갇힌다. flex를 끄고 가로만 stretch → 세로 자동 확장 복구.
  // bulk 멀티라인 입력 — 과정/재료 행과 같은 AutoGrowInput을 쓴다.
  // 예전엔 flex:0으로 뒀는데, 그러면 자동 높이가 어긋나는 순간 내용이 잘린다
  // (행 입력은 flex:1이라 부모가 높이를 채워줘서 증상이 안 보였을 뿐이다).
  bulkInput: {
    alignSelf: 'stretch',
    width: '100%',
    // 여러 줄이므로 위 정렬 — editableRowInput의 'center'(가로 행용)를 덮는다
    textAlignVertical: 'top',
  },

  // Overlay & Menu
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  cookbookLeadingSlot: {
    width: 28,
    height: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
  },

  // 참고 링크
  referenceLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  // 링크 칩/입력 스타일은 공통 UrlField로 이동
});
