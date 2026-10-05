import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FloatingNavBar, navPillStyle, NavPillButton, RulerSlider} from '@components/Navigation';
import {Selector} from '@components/Selector';
import {BottomActionBar} from '@components/BottomActionBar';
import {GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconClose, IconPhoto, IconTrash, IconArrowDownToLine, IconAdd} from '@components/Icon/IconIndex';
import {ForceDarkTheme} from '@contexts/ThemeContext';
import {Menu} from '@components/Menu';
import {photoSourceMenuItems, type PhotoSource} from '@utils/photoSourceMenu';
import {useTranslation} from '@contexts/LanguageContext';
import {Typography} from '@constants/typography';
import {Spacing} from '@constants/spacing';
import {Radius} from '@constants/tokens';

const MAX_CONTENT_WIDTH = 800;

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
}

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
}: PhotoViewerProps) {
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
  const hasRightActions = canEdit || !!onDownload;


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
                  <View style={[styles.imageFrame, {height: pageHeight}]}>
                    <Image
                      source={{uri: p.uri}}
                      style={[styles.image, {width: Math.min(Math.max(containerWidth * 0.92, 280), MAX_CONTENT_WIDTH)}]}
                      resizeMode="contain"
                    />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            {/* 설명 — 편집 가능하면 입력칸, 아니면 있을 때만 글자 */}
            {onCaptionChange ? (
              <TextInput
                style={styles.captionInput}
                value={draft}
                onChangeText={setDraft}
                placeholder={t('cookingMode.captionPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                maxLength={CAPTION_MAX}
                onBlur={commitCaption}
                onSubmitEditing={commitCaption}
                returnKeyType="done"
                blurOnSubmit
              />
            ) : currentCaption.trim() ? (
              <Text style={styles.captionText}>{currentCaption}</Text>
            ) : null}
            {/* 아래 눈금 — 전체 장수, 지금 장 강조. 탭·끌기로 이동(요리모드와 같은 눈금) */}
            {total > 1 && (
              <View style={styles.bottomNav}>
                <BottomActionBar background="#000000" showTopMask={false}>
                  <RulerSlider
                    items={photos.map((_, i) => ({id: String(i), label: `${i + 1} / ${total}`}))}
                    selectedId={String(index)}
                    onSelect={id => jumpTo(Number(id))}
                  />
                </BottomActionBar>
              </View>
            )}
            <FloatingNavBar
              tintColor="#000000"
              left={<NavPillButton icon={IconClose} onPress={close} />}
              // 가운데 — 구획이 둘 이상이면 요리모드처럼 구획 고르기(지금 사진의 구획). 몇 번째인지는 아래 눈금이 보여준다
              center={sections.length > 1 ? (
                <GlassContainer contentStyle={styles.sectionPill}>
                  <Selector
                    label={photos[index]?.section ?? sections[0]}
                    variant="ghost"
                    showDropdown
                    onPress={() => setShowSectionMenu(v => !v)}
                  />
                </GlassContainer>
              ) : undefined}
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
                  {onAdd && (
                    <IconButton icon={IconAdd} onPress={() => setShowAddMenu(v => !v)} variant="ghost-primary" size="medium" forcePressed={showAddMenu} />
                  )}
                  {onReplace && (
                    <IconButton icon={IconPhoto} onPress={() => runPick(onReplace)} variant="ghost-primary" size="medium" />
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
          </KeyboardAvoidingView>
        </ForceDarkTheme>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionPill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
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
    ...Typography.body.medium,
    color: '#FFFFFF',
    marginTop: Spacing.md,
    width: '92%',
    maxWidth: MAX_CONTENT_WIDTH,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    borderRadius: Radius['radius-md'],
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
