import {isLocalUri} from '@utils/imageUpload';
import {useFailedUploads} from '@utils/failedUploads';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {NAV_PILL_PADDING} from '@constants/layout';
import {NAV_PILL_HEIGHT} from '@constants/layout';
import {Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {triggerHaptic} from '@utils/haptics';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FloatingNavBar, navPillStyle, NavPillButton} from '@components/Navigation';
import {ThumbnailSlider} from '@components/ThumbnailSlider';
import {Selector} from '@components/Selector';
import {BottomActionBar} from '@components/BottomActionBar';
import {GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconClose, IconChoose, IconTrash, IconArrowDownToLine, IconAdd, IconSparkle, IconSparkleFilled, IconChevronLeft, IconChevronRight} from '@components/Icon/IconIndex';
import {useAuth} from '@contexts/AuthContext';
import {loadStylePrompt, restylePhoto} from '@utils/photoRestyle';
import {AppIcon} from '@components/Icon/AppIcon';
import {Button} from '@components/Button';
import {BrokenImageMark, ImageLoadingMark, useBrokenImage} from '@components/BrokenImage';
import {BottomSheet} from '@components/BottomSheet/BottomSheet';
import {TextInput as AppTextInput} from '@components/TextInput';
import {ForceDarkTheme, useColors} from '@contexts/ThemeContext';
import {Menu} from '@components/Menu';
import {photoSourceMenuItems, type PhotoSource} from '@utils/photoSourceMenu';
import {useTranslation} from '@contexts/LanguageContext';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';

import {MAX_CONTENT_WIDTH} from '@components/Container/ContentContainer';

export interface PhotoViewerProps {
  /**
   * 표시할 사진 목록. caption이 있으면 사진 아래에 보여준다.
   * section(대표 사진·과정·회고 등)을 주면 위 가운데에 구획 고르기가 생겨 그 구획 첫 장으로 건너뛴다.
   */
  photos: {uri: string; caption?: string; section?: string}[];
  /** 현재 보고 있는 인덱스. null이면 닫힘 */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** 편집 가능하면 우측 상단에 교체·삭제 버튼 (없으면 읽기 전용) */
  onReplace?: () => void | Promise<void>;
  onDelete?: () => void;
  /** 사진 추가 — 뷰어 안에서 바로 한 장 더 올릴 때. [+]를 누르면 촬영/갤러리 메뉴가 뜬다 */
  onAdd?: (source: PhotoSource) => void | Promise<void>;
  /**
   * 우측 상단 다운로드 버튼. 주면 보이고, 없으면 감춘다.
   * 유료 여부 판단·유도는 호출부가 한다 — 공통 뷰어가 구독을 알 필요는 없다.
   */
  onDownload?: () => void;
  /**
   * 사진 설명 편집. 주면 사진 아래에 입력칸이 생긴다(없으면 설명만 보여준다).
   * 썸네일 아래 칸은 좁아 설명은 여기서 넓게 쓴다. 입력을 마치거나 넘기면 저장.
   */
  onCaptionChange?: (index: number, caption: string) => void;
  /**
   * 사진 보정 결과를 그 자리에 넣는다 — 주면(어드민만) 위에 보정 버튼이 생긴다.
   * 보정은 서버가 커버 사진 톤으로 다시 그린다(utils/photoRestyle).
   */
  onRestyled?: (index: number, uri: string) => void;
}

/** 시트 안 글자 — 뷰어는 검정 고정(ForceDarkTheme)이라 그 안의 테마 색을 쓴다 */
function SheetText({children, muted}: {children: React.ReactNode; muted?: boolean}) {
  const c = useColors();
  return <Text style={[Typography.caption.medium, {color: c[muted ? 'foreground/on-surface-muted' : 'foreground/on-surface-var']}]}>{children}</Text>;
}
function SheetChevron() {
  const c = useColors();
  return <AppIcon icon={IconChevronRight} size="xs" color={c['foreground/on-surface-muted'] as string} />;
}

/** 뷰어 사진 한 장 — 깨지면 가운데 느낌표 */
function ViewerImage({uri, width, busy}: {uri: string; width: number; /** 보정 중 — 사진 위에 어둡게 깜빡임 + 로딩 */ busy?: boolean}) {
  const {broken, loading, onError, onLoad} = useBrokenImage(uri);
  // 새 사진(보정 결과 등)은 살짝 페이드인 — 툭 바뀌지 않게
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { fade.setValue(0); }, [uri, fade]);
  const handleLoad = () => {
    onLoad();
    Animated.timing(fade, {toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true}).start();
  };
  // 서버에 안 올라간 사진(기기 안 주소)이 이 기기에서 안 열리면 — 어떤 사진인지 알 수 있게 아래에 알림.
  // 찍은 기기에선 열려서(저장 전 새 사진도) 띄우지 않는다
  const failed = useFailedUploads();
  const notUploaded = (broken && isLocalUri(uri)) || failed.has(uri) ? <NotUploadedNote /> : null;
  if (broken) {
    return (
      <View style={[styles.image, {width}]}>
        <BrokenImageMark size={72} style={{backgroundColor: 'transparent'}} />
        {notUploaded}
      </View>
    );
  }
  return (
    <View style={[styles.image, {width}]}>
      <Animated.Image source={{uri}} style={[StyleSheet.absoluteFill, {opacity: fade}]} resizeMode="contain" onError={onError} onLoad={handleLoad} />
      {/* 검은 바탕 — 흰 로딩만. 보정 중이면 문구까지 */}
      {busy || loading ? <ImageLoadingMark dark /> : null}
      {notUploaded}
    </View>
  );
}

/** 안 올라간 사진 알림 — 사진 아래 가운데 작은 띠 */
function NotUploadedNote() {
  const {t} = useTranslation();
  return (
    <View style={styles.notUploaded} pointerEvents="none">
      <Text style={styles.notUploadedText}>{t('photoViewer.notUploaded')}</Text>
    </View>
  );
}

/** 템플릿 불러오는 중 표시 */
const LOADING = '\u0000loading';

/** 설명 최대 길이 — 요리모드 카드에 2줄로 들어가는 정도 */
const CAPTION_MAX = 60;

/**
 * 사진 전체보기 뷰어. 상세·요리모드 공용.
 *
 * - 배경 탭 = 닫기, 좌우 스와이프 = 이전/다음(여러 장일 때)
 * - 여러 장이면 이미지 탭도 다음 사진, 한 장뿐이면 탭해도 닫힌다
 * - 배경이 늘 검정이라 하위 컴포넌트를 ForceDarkTheme으로 고정한다
 *   (라이트 테마 토큰이 검정 배경에 묻힌다)
 * - 네이티브 Modal은 별도 뷰 계층이라 앱 루트의 SafeAreaProvider가 닿지 않는다.
 *   없으면 FloatingNavBar의 SafeAreaView가 inset을 0으로 읽어 상단바가 상태바와 겹친다.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  onReplace,
  onDelete,
  onAdd,
  onDownload,
  onCaptionChange,
  onRestyled,
}: PhotoViewerProps) {
  const {isAdmin} = useAuth();
    const canRestyle = isAdmin && !!onRestyled;
  const [restyling, setRestyling] = useState(false);
  // 보정 중인 사진 — 그 장 위에만 작업 중 표시(넘겨 봐도 어느 장인지 보인다)
  const [restylingIndex, setRestylingIndex] = useState<number | null>(null);
  // 보정 시트 — 프롬프트를 보여주고 고쳐서 쓴다(뷰어 모달 안에 띄운다: 시트를 또 띄우면 iOS에서 모달이 겹쳐 안 뜬다)
  const [restyleSheet, setRestyleSheet] = useState(false);
  // 이번에만 더할 요청 — 기본 템플릿 뒤에 붙는다
  const [extraDraft, setExtraDraft] = useState('');
  // 기본 템플릿은 서버가 쓴다 — 시트에선 이번에 더할 요청만 받는다
  const openRestyle = () => { setTemplateView(null); setRestyleSheet(true); };
  // 기본 템플릿 보기(서버 것) — null이면 입력 화면
  const [templateView, setTemplateView] = useState<string | null>(null);
  const showTemplate = async () => {
    setTemplateView(LOADING);
    try {
      const {prompt} = await loadStylePrompt();
      setTemplateView(prompt);
    } catch (e: any) {
      setTemplateView(String(e?.message ?? t('photoViewer.restyleFailed')));
    }
  };
  // 되돌리기 — 보정 전 사진(이 뷰어를 닫기 전까지)
  const [undo, setUndo] = useState<{index: number; uri: string} | null>(null);
  // 보정 결과 안내 — 뷰어는 모달이라 앱 스낵바가 뒤에 깔려 안 보인다. 뷰어 안에 잠깐 띄운다
  const [restyleNote, setRestyleNote] = useState<{text: string; error: boolean} | null>(null);
  useEffect(() => {
    if (!restyleNote) return;
    const id = setTimeout(() => setRestyleNote(null), restyleNote.error ? 6000 : 2500);
    return () => clearTimeout(id);
  }, [restyleNote]);
  const {width: containerWidth, height: windowHeight} = useWindowDimensions();
  // 사진 영역 높이 — 화면의 74%(예전 imageFrame과 같은 비율). 스크롤 안이라 퍼센트 대신 숫자로 준다
  const pageHeight = Math.round(windowHeight * 0.74);
  const {t} = useTranslation();
  // 가로 스크롤 — 밖에서 index가 바뀌면(추가·삭제·교체) 그 쪽으로 옮긴다
  const pagerRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (index === null) return;
    pagerRef.current?.scrollTo({x: index * containerWidth, animated: false});
  }, [index, containerWidth]);

  // 설명 입력 임시값 — 사진이 바뀌면 그 사진 값으로 다시 채운다
  const currentCaption = index !== null ? photos[index]?.caption ?? '' : '';
  const [draft, setDraft] = useState(currentCaption);
  const [showAddMenu, setShowAddMenu] = useState(false);
  // iOS는 전체화면 창(Modal)이 떠 있으면 사진 고르기 화면을 띄우는 요청을 조용히 무시한다.
  // 그래서 고르기 전에 뷰어 창을 잠깐 내리고(onDismiss를 기다려), 고른 뒤 다시 올린다.
  const [suspended, setSuspended] = useState(false);
  const pendingPickRef = useRef<(() => void | Promise<void>) | null>(null);
  const runPick = useCallback((fn: () => void | Promise<void>) => {
    if (Platform.OS !== 'ios') { fn(); return; }
    pendingPickRef.current = fn;
    setSuspended(true);
  }, []);
  const handleDismiss = useCallback(async () => {
    const fn = pendingPickRef.current;
    pendingPickRef.current = null;
    if (!fn) return;
    try { await fn(); } finally { setSuspended(false); }
  }, []);
  useEffect(() => { setDraft(currentCaption); }, [index, currentCaption]);
  const commitCaption = useCallback(() => {
    if (index === null || !onCaptionChange) return;
    const next = draft.trim();
    if (next !== currentCaption.trim()) onCaptionChange(index, next);
  }, [index, draft, currentCaption, onCaptionChange]);

  const total = photos.length;
  // 구획 — 사진 순서대로 처음 나온 이름들(대표 사진 → 과정 → 조언 → 회고)
  const sections = photos.reduce<string[]>((acc, p) => (p.section && !acc.includes(p.section) ? [...acc, p.section] : acc), []);
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const jumpTo = (i: number) => { commitCaption(); onIndexChange(i); };
  const canEdit = !!onReplace || !!onDelete || !!onAdd;
  const hasRightActions = canEdit || !!onDownload || canRestyle;
  // 보정 — 몇십 초 걸린다. 그동안 버튼이 로딩, 끝나면 그 자리 사진이 바뀐다
  const runRestyle = async () => {
    if (index === null || restyling || !onRestyled) return;
    const at = index;
    const src = photos[at]?.uri;
    if (!src) return;
    setRestyleSheet(false);
    setRestyling(true);
    setRestylingIndex(at);
    try {
      const url = await restylePhoto(src, extraDraft);
      setExtraDraft('');
      onRestyled(at, url);
      setUndo({index: at, uri: src});
      setRestyleNote({text: t('photoViewer.restyled'), error: false});
      triggerHaptic('success');
    } catch (e: any) {
      console.warn('[PhotoViewer] 보정 실패:', e);
      const msg = String(e?.message ?? '');
      // 자주 나는 이유는 알아듣게 — 크레딧 없음(429)·권한
      const reason = /OPENAI_429|credits|quota/i.test(msg) ? t('photoViewer.restyleNoCredit')
        : /ADMIN_ONLY|permission/i.test(msg) ? t('photoViewer.restyleAdminOnly')
        : msg.slice(0, 80);
      setRestyleNote({text: `${t('photoViewer.restyleFailed')}${reason ? `\n${reason}` : ''}`, error: true});
      triggerHaptic('error');
    } finally {
      setRestyling(false);
      setRestylingIndex(null);
    }
  };


  const close = useCallback(() => {
    commitCaption();
    onClose();
  }, [commitCaption, onClose]);

  if (index === null) return null;
  const uri = photos[index]?.uri;
  if (!uri) return null;

  return (
    <Modal visible={!suspended} transparent animationType="fade" onRequestClose={close} onDismiss={handleDismiss} statusBarTranslucent>
      <SafeAreaProvider>
        <ForceDarkTheme>
          <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* 배경 탭 = 닫기 */}
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
            {/* 손가락을 따라 넘어가는 가로 스크롤(한 장씩 딱 멈춤) — 놓은 뒤에야 바뀌던 방식은 뚝뚝 끊겼다.
                쪽마다 화면 폭, 사진은 그 안 가운데. 쪽 빈 곳을 탭하면 닫힌다. */}
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.pager}
              contentOffset={{x: index * containerWidth, y: 0}}
              onMomentumScrollEnd={e => {
                const next = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
                if (next !== index && next >= 0 && next < total) { commitCaption(); onIndexChange(next); }
              }}>
              {photos.map((p, i) => (
                <Pressable key={`${p.uri}-${i}`} style={[styles.page, {width: containerWidth, height: pageHeight}]} onPress={close}>
                  {/* 두 손가락으로 벌려 확대(아이폰 스크롤 뷰 기본 확대 — 최대 4배, 두 번 톡 없이 손가락만).
                      안드로이드·웹 스크롤 뷰엔 확대가 없어 그대로 */}
                  <ScrollView
                    // 확대 칸도 콘텐츠 최대 폭까지만 — 쪽(page)이 가운데로 놓는다
                    style={{width: Math.min(containerWidth, MAX_CONTENT_WIDTH), height: pageHeight}}
                    // 확대 칸이 화면 폭을 꽉 채우니 사진은 가운데로(예전엔 칸이 사진 폭만 해서 바깥 쪽이 가운데 정렬했다)
                    contentContainerStyle={[styles.imageFrame, styles.zoomContent, {width: Math.min(containerWidth, MAX_CONTENT_WIDTH), height: pageHeight}]}
                    maximumZoomScale={Platform.OS === 'ios' ? 4 : 1}
                    minimumZoomScale={1}
                    bouncesZoom
                    centerContent
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    // 다른 장으로 넘기면 확대가 풀리게 — 지금 장만 확대를 받는다
                    scrollEnabled={i === index}>
                    <ViewerImage
                      uri={p.uri}
                      width={Math.min(Math.max(containerWidth * 0.92, 280), MAX_CONTENT_WIDTH)}
                      busy={restyling && restylingIndex === i}
                    />
                  </ScrollView>
                </Pressable>
              ))}
            </ScrollView>
            {/* 설명 — 편집 가능하면 입력칸, 아니면 있을 때만 글자 */}
            {onCaptionChange ? (
              // 공통 입력칸 고스트 — 바탕 없이 글자만(뷰어는 다크 고정이라 다크 색)
              <View style={styles.captionInput}>
                <AppTextInput
                  style="ghost"
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t('cookingMode.captionPlaceholder')}
                  multiline
                  maxLength={CAPTION_MAX}
                  onBlur={commitCaption}
                  inputStyle={styles.captionInputText}
                />
              </View>
            ) : currentCaption.trim() ? (
              <Text style={styles.captionText}>{currentCaption}</Text>
            ) : null}
            {restyleNote ? (
              <View pointerEvents="none" style={styles.noteWrap}>
                <Text style={[styles.note, restyleNote.error && styles.noteError]}>{restyleNote.text}</Text>
              </View>
            ) : null}
            {/* 보정 되돌리기 — 보정한 그 장을 보고 있을 때 */}
            {undo && undo.index === index && !restyleSheet ? (
              <View style={styles.undoWrap}>
                <Button
                  label={t('photoViewer.restyleUndo')}
                  variant="soft"
                  size="small"
                  onPress={() => { onRestyled?.(undo.index, undo.uri); setUndo(null); setRestyleNote({text: t('photoViewer.restyleUndone'), error: false}); }}
                />
              </View>
            ) : null}
            {/* 보정 시트 — 프롬프트 확인·수정 후 보정 */}
            {/* 아래 작은 썸네일 줄 — 숫자·눈금 대신 사진으로. 눌러서 건너뛴다 */}
            {total > 1 && (
              <View style={styles.bottomNav}>
                <BottomActionBar background="#000000" showTopMask={false}>
                  <View style={styles.sliderCol}>
                    <ThumbnailSlider uris={photos.map(p => p.uri)} index={index} onSelect={jumpTo} />
                    {/* 몇 번째 장인지 — 썸네일 아래 */}
                    <Text style={styles.counter}>{`${index + 1}/${total}`}</Text>
                  </View>
                </BottomActionBar>
              </View>
            )}
            <FloatingNavBar
              tintColor="#000000"
              // 왼쪽 — 닫기, 구획이 둘 이상이면 그 옆에 구획 고르기(요리모드와 같은 2뎁스, 사이 4)
              left={
                <View style={styles.topLeft}>
                  <NavPillButton icon={IconClose} onPress={close} />
                  {sections.length > 1 && (
                    <GlassContainer contentStyle={styles.sectionPill}>
                      <Selector
                        label={photos[index]?.section ?? sections[0]}
                        variant="ghost"
                        showDropdown
                        onPress={() => setShowSectionMenu(v => !v)}
                      />
                    </GlassContainer>
                  )}
                </View>
              }
              leftMenu={sections.length > 1 ? (
                <Menu
                  items={sections.map(sec => ({id: sec, label: sec}))}
                  selectedId={photos[index]?.section}
                  visible={showSectionMenu}
                  onSelect={sec => { setShowSectionMenu(false); jumpTo(photos.findIndex(p => p.section === sec)); }}
                  onClose={() => setShowSectionMenu(false)}
                />
              ) : undefined}
              right={hasRightActions ? (
                <GlassContainer contentStyle={navPillStyle}>
                  {canRestyle && (
                    <IconButton icon={restyleSheet ? IconSparkleFilled : IconSparkle} onPress={() => openRestyle()} variant="ghost-primary" size="medium" loading={restyling} disabled={restyling} forcePressed={restyleSheet} />
                  )}
                  {onAdd && (
                    <IconButton icon={IconAdd} onPress={() => setShowAddMenu(v => !v)} variant="ghost-primary" size="medium" forcePressed={showAddMenu} />
                  )}
                  {onReplace && (
                    <IconButton icon={IconChoose} onPress={() => runPick(onReplace)} variant="ghost-primary" size="medium" />
                  )}
                  {onDelete && (
                    <IconButton icon={IconTrash} onPress={onDelete} variant="ghost-primary" size="medium" />
                  )}
                  {onDownload && (
                    <IconButton icon={IconArrowDownToLine} onPress={onDownload} variant="ghost-primary" size="medium" />
                  )}
                </GlassContainer>
              ) : undefined}
              rightMenu={onAdd ? (
                <Menu
                  items={photoSourceMenuItems(t)}
                  visible={showAddMenu}
                  onSelect={id => { setShowAddMenu(false); runPick(() => onAdd(id as PhotoSource)); }}
                  onClose={() => setShowAddMenu(false)}
                />
              ) : undefined}
            />
            {/* 보정 시트 — 공통 바텀시트(키보드 따라 올라옴·헤더·바텀 액션 가이드). 뷰어 모달 안이라 모달 없이 띄운다 */}
            <BottomSheet
              visible={restyleSheet}
              onClose={() => setRestyleSheet(false)}
              hostAsView
              title={templateView ? t('photoViewer.restyleTemplate') : t('photoViewer.restyleTitle')}
              headerType="center"
              onBack={templateView ? () => setTemplateView(null) : undefined}
              bottomAction={templateView ? undefined : (
                <>
                  <Button label={t('photoViewer.restyleCancel')} variant="soft" onPress={() => setRestyleSheet(false)} style={{flex: 1}} />
                  <Button label={t('photoViewer.restyleRun')} variant="filled" onPress={runRestyle} disabled={restyling} style={{flex: 1}} icon={IconSparkleFilled} />
                </>
              )}>
              <View style={styles.sheetBody}>
                {templateView ? (
                  // 기본 템플릿 보기 — 헤더 ‹로 입력으로 돌아간다
                  <SheetText muted={false}>{templateView === LOADING ? t('photoViewer.restyleLoading') : templateView}</SheetText>
                ) : (
                  <>
                    {/* 이번에만 더할 요청 */}
                    <AppTextInput
                      style="tonal"
                      label={t('photoViewer.restyleExtraLabel')}
                      value={extraDraft}
                      onChangeText={setExtraDraft}
                      placeholder={t('photoViewer.restyleExtraPlaceholder')}
                      multiline
                      maxLength={500}
                    />
                    {/* 기본 템플릿은 눌러서 볼 때만 */}
                    <Pressable style={styles.templateLink} onPress={showTemplate} hitSlop={6}>
                      <SheetText muted>{t('photoViewer.restyleTemplate')}</SheetText>
                      <SheetChevron />
                    </Pressable>
                  </>
                )}
              </View>
            </BottomSheet>
          </KeyboardAvoidingView>
        </ForceDarkTheme>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 안 올라간 사진 알림 띠 — 검은 뷰어 위 아래쪽
  notUploaded: {position: 'absolute', bottom: 96, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6},
  notUploadedText: {color: '#fff', fontSize: 13, lineHeight: 18},
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionPill: {
    height: NAV_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    padding: NAV_PILL_PADDING,
  },
  undoWrap: {
    position: 'absolute',
    bottom: 196,
    alignSelf: 'center',
  },
  sheet: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    bottom: Spacing.sm,
    zIndex: 30,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius['radius-xl'],
    backgroundColor: '#1f1f1f',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  sheetTitle: {
    ...Typography.title.small,
    color: '#FFFFFF',
  },
  sheetHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  templateBox: {
    maxHeight: 220,
    padding: Spacing.smd,
    borderRadius: Radius['radius-md'],
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sheetBody: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  templateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    // 입력칸 라벨('추가 요청')과 같은 왼쪽 선 — 공통 TextInput 라벨 들여쓰기와 같은 값
    paddingHorizontal: Spacing.sm,
  },
  extraInput: {
    ...Typography.body.medium,
    color: '#FFFFFF',
    minHeight: 48,
    maxHeight: 120,
    padding: Spacing.smd,
    borderRadius: Radius['radius-md'],
    backgroundColor: 'rgba(255,255,255,0.12)',
    textAlignVertical: 'top',
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noteWrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 140,
    alignItems: 'center',
  },
  note: {
    ...Typography.body.medium,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius['radius-md'],
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  noteError: {
    backgroundColor: 'rgba(220,60,60,0.85)',
  },
  sliderCol: {
    flex: 1,
    alignItems: 'center',
  },
  counter: {
    ...Typography.caption.medium,
    color: 'rgba(255,255,255,0.72)',
    fontVariant: ['tabular-nums'],
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pager: {
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFrame: {
    height: '74%',
    justifyContent: 'center',
  },
  zoomContent: {
    alignItems: 'center',
  },
  image: {
    height: '100%',
  },
  // 검정 배경 고정 뷰어라 밝은 글자를 쓴다(ForceDarkTheme와 같은 이유)
  captionText: {
    ...Typography.body.medium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    maxWidth: MAX_CONTENT_WIDTH,
  },
  captionInput: {
    marginTop: Spacing.md,
    width: '92%',
    maxWidth: MAX_CONTENT_WIDTH,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  captionInputText: {textAlign: 'center'},
});
