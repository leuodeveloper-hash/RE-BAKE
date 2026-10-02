import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FloatingNavBar, navPillStyle, NavPillButton} from '@components/Navigation';
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
  /** 표시할 사진 목록. caption이 있으면 사진 아래에 보여준다 */
  photos: {uri: string; caption?: string}[];
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
  const {width: containerWidth} = useWindowDimensions();
  const {t} = useTranslation();
  const swipeXRef = useRef(0);

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
  const canEdit = !!onReplace || !!onDelete || !!onAdd;
  const hasRightActions = canEdit || !!onDownload;

  const goNext = useCallback(() => {
    if (index === null || total <= 1) return;
    commitCaption();
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange, commitCaption]);

  const goPrev = useCallback(() => {
    if (index === null || total <= 1) return;
    commitCaption();
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange, commitCaption]);

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
            {/* Pressable에 높이를 줘야 안쪽 Image의 height:'100%'가 기준을 갖는다
                (auto 높이면 퍼센트가 0으로 계산돼 이미지가 안 보인다) */}
            {/* Pressable이 아니라 View — Pressable은 자기 터치 처리기가 우리 응답자(onResponder*)를
                덮어써서 앱에서 좌우 스와이프가 먹지 않았다(웹만 됐다). */}
            <View
              style={styles.imageFrame}
              onStartShouldSetResponder={() => true}
              onResponderGrant={e => { swipeXRef.current = e.nativeEvent.pageX; }}
              onResponderRelease={e => {
                const dx = e.nativeEvent.pageX - swipeXRef.current;
                // 한 장뿐이면 "다음"이 없다 → 배경과 같이 탭하면 닫힌다
                if (total <= 1) { if (Math.abs(dx) < 40) close(); return; }
                if (Math.abs(dx) < 40) { goNext(); return; } // 탭
                if (dx < 0) goNext(); else goPrev();
              }}>
              <Image
                source={{uri}}
                style={[styles.image, {width: Math.min(Math.max(containerWidth * 0.92, 280), MAX_CONTENT_WIDTH)}]}
                resizeMode="contain"
              />
            </View>
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
            <FloatingNavBar
              tintColor="#000000"
              left={<NavPillButton icon={IconClose} onPress={close} />}
              // 한 장이어도 표시한다 — 몇 번째를 보고 있는지 늘 같은 자리에 있어야
              // 여러 장일 때와 상단바 구성이 흔들리지 않는다.
              // 직접 Text를 꽂지 않고 title을 쓴다 — 다른 화면 상단바와 같은 크기여야 한다.
              // (ForceDarkTheme 안이라 색도 알아서 밝게 잡힌다)
              title={`${index + 1} / ${total}`}
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
