import React, {useRef, useState} from 'react';
import {Linking, Platform, Pressable, Share, StyleSheet, Text, View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {Dialog} from '@components/Dialog/Dialog';
import {Avatar} from '@components/Avatar';
import {AppIcon} from '@components/Icon/AppIcon';
import {IconButton} from '@components/IconButton/IconButton';
import {IconArrowDownToLine, IconLink, IconLogoBakle, IconShare} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {triggerHaptic} from '@utils/haptics';
import {getRecipeShareUrl} from '@config/share';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface ShareRecipeSheetProps {
  visible: boolean;
  onClose: () => void;
  recipe: {id: string; title: string; imageUri?: string; authorHandle?: string; authorAvatarSeed?: string | number};
  /** 링크로 열 수 있는 레시피인지(공개) — 아니면 링크 복사 대신 이미지로만 */
  linkable: boolean;
}

const CARD_W = 300;
/** 팝업 가장자리 ~ 카드 간격 */
const CARD_INSET = Spacing.sm;
/** 메타(페이스북) 앱 ID — 인스타 스토리에 이미지를 바로 넘길 때 보낸 앱 확인용(공개 값) */
const META_APP_ID = '981260695017508';
/** 카드 바탕 = 스토리 배경(같은 검정) */
const STORY_BG = '#1f1f1f';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const INSTAGRAM_STORIES = require('../../../assets/images/instagram_stories.png');
/** 이미지 버튼 — 토날 IconButton large와 같은 크기 */
const ACTION_SIZE = 48;
const ACTION_TOUCH = 56;
const PHOTO = 220;

/**
 * 레시피 공유 카드 — 검은 카드 가운데 커버 사진(정사각), 위는 앱 표시, 아래는 레시피명·작성자.
 * 아래 버튼: 링크 복사 · 이미지 저장 · 공유하기(카드 이미지 + 링크).
 */
export function ShareRecipeSheet({visible, onClose, recipe, linkable}: ShareRecipeSheetProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();
  const cardRef = useRef<View>(null);
  // 이미지로 뜰 때만 모서리를 직각으로 — 둥근 모서리 밖이 투명해 붙이면 라운딩 자국이 남았다
  const [squareCorners, setSquareCorners] = useState(false);
  const captureCard = async (result: string) => {
    setSquareCorners(true);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {captureRef} = require('react-native-view-shot');
      return await captureRef(cardRef, {format: 'png', quality: 1, result});
    } finally {
      setSquareCorners(false);
    }
  };
  const url = getRecipeShareUrl(recipe.id);

  // 카드를 이미지로 — 앱은 react-native-view-shot, 웹은 같은 라이브러리의 웹 경로
  const capture = async (): Promise<string | null> => {
    try {
      return await captureCard(Platform.OS === 'web' ? 'data-uri' : 'tmpfile');
    } catch (e) {
      console.warn('[share] 카드 이미지 만들기 실패:', e);
      showSnackbar(t('shareCard.captureFailed'));
      return null;
    }
  };

  const copyLink = async () => {
    triggerHaptic('light');
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(url);
      showSnackbar(t('id.linkCopied'), {tone: 'positive'});
    } catch {
      showSnackbar(t('shareRecipe.shareFailed'));
    }
  };

  const saveImage = async () => {
    triggerHaptic('light');
    const uri = await capture();
    if (!uri) return;
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = uri;
      a.download = `${recipe.title}.png`;
      a.click();
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const MediaLibrary = require('expo-media-library');
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) { showSnackbar(t('shareCard.permissionNeeded')); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      showSnackbar(t('shareCard.saved'), {tone: 'positive'});
    } catch (e) {
      console.warn('[share] 이미지 저장 실패:', e);
      showSnackbar(t('shareCard.saveFailed'));
    }
  };

  const shareCard = async () => {
    triggerHaptic('light');
    const uri = await capture();
    if (!uri) return;
    const text = linkable ? `${recipe.title}\n${url}` : recipe.title;
    try {
      if (Platform.OS === 'web') {
        const nav: any = navigator;
        const blob = await (await fetch(uri)).blob();
        const file = new File([blob], `${recipe.title}.png`, {type: 'image/png'});
        if (nav.canShare?.({files: [file]})) await nav.share({files: [file], text});
        else if (linkable && nav.share) await nav.share({text, url});
        else await saveImage();
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sharing = require('expo-sharing');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, {mimeType: 'image/png', dialogTitle: recipe.title});
      else await Share.share({message: text});
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.warn('[share] 공유 실패:', e);
    }
  };

  // 인스타 스토리 — 카드 이미지를 스토리 편집 화면에 바로 붙여 연다(메타 앱 ID로 보낸 앱을 확인한다).
  // 연동이 안 되는 환경이면 카드를 복사해 두고 스토리 카메라만 연다(거기서 붙여넣기)
  const shareStory = async () => {
    triggerHaptic('light');
    let base64: string;
    try {
      base64 = await captureCard('base64');
    } catch (e) {
      console.warn('[share] 스토리용 카드 만들기 실패:', e);
      showSnackbar(t('shareCard.captureFailed'));
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Share = require('react-native-share').default;
      await Share.shareSingle({
        social: Share.Social.INSTAGRAM_STORIES,
        appId: META_APP_ID,
        backgroundImage: `data:image/png;base64,${base64}`,
        backgroundTopColor: STORY_BG,
        backgroundBottomColor: STORY_BG,
      });
      return;
    } catch (e) {
      console.warn('[share] 인스타 스토리 연동 실패, 붙여넣기 방식으로:', e);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('expo-clipboard');
      await Clipboard.setImageAsync(base64);
      await Linking.openURL('instagram://story-camera');
      showSnackbar(t('shareCard.storyCopied'), {tone: 'positive'});
    } catch {
      showSnackbar(t('shareCard.instagramUnavailable'));
    }
  };

  const actions = [
    ...(linkable ? [{key: 'link', icon: IconLink, label: t('shareCard.copyLink'), onPress: copyLink}] : []),
    {key: 'save', icon: IconArrowDownToLine, label: t('shareCard.saveImage'), onPress: saveImage},
    // 스토리는 앱에서만(인스타그램 앱으로 이동)
    ...(Platform.OS !== 'web' ? [{key: 'story', image: INSTAGRAM_STORIES, label: t('shareCard.story'), onPress: shareStory}] : []),
    // 공유는 맨 끝 — 기기 공유 창
    {key: 'share', icon: IconShare, label: t('shareCard.share'), onPress: shareCard},
  ];

  return (
    // 카드가 팝업 모서리와 사방 같은 간격(8)으로 — 카드 모서리는 팝업 모서리에서 그 간격만큼 뺀 값(자연스러운 겹 라운드)
    <Dialog visible={visible} onClose={onClose} showCloseButton={false} width={CARD_W + CARD_INSET * 2} contentInset={CARD_INSET}>
      <View style={styles.wrap}>
        {/* 공유 카드 — 이 모양 그대로 이미지가 된다 */}
        <View ref={cardRef} collapsable={false} style={[styles.card, squareCorners && {borderRadius: 0}]}>
          <View style={styles.brand}>
            <Text style={styles.brandFrom}>{t('shareCard.foundOn')}</Text>
            <AppIcon icon={IconLogoBakle} size="sm" color="#fff" />
          </View>
          <View style={styles.photo}>
            {recipe.imageUri ? (
              <ExpoImage source={{uri: recipe.imageUri}} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Text style={styles.photoFallback} numberOfLines={3}>{recipe.title}</Text>
            )}
          </View>
          <View style={styles.info}>
            <View style={styles.pill}><Text style={styles.pillText} numberOfLines={1}>{recipe.title}</Text></View>
            {recipe.authorHandle ? (
              <>
                <Text style={styles.by}>by</Text>
                <View style={styles.pill}>
                  <Avatar type="random" size="xsmall" shape="circle" seed={recipe.authorAvatarSeed ?? recipe.authorHandle} />
                  <Text style={styles.pillText} numberOfLines={1}>@{recipe.authorHandle}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
        {/* 동작 — 동그란 버튼 + 아래 글자 */}
        <View style={styles.actions}>
          {actions.map(a => (
            <View key={a.key} style={styles.action}>
              {'image' in a ? (
                // IconButton처럼 자리는 48, 누르는 영역만 56(hitSlop) — 자리를 56으로 잡아 혼자 컸다
                <Pressable onPress={a.onPress} style={styles.actionImageTouch} hitSlop={(ACTION_TOUCH - ACTION_SIZE) / 2}>
                  <ExpoImage source={a.image} style={styles.actionImage} contentFit="cover" />
                </Pressable>
              ) : (
                <IconButton icon={a.icon} variant="tonal" size="large" onPress={a.onPress} />
              )}
              <Text style={styles.actionLabel}>{a.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  wrap: {alignItems: 'center', gap: Spacing.lg},
  card: {
    width: CARD_W,
    backgroundColor: STORY_BG,
    // 팝업(radius-xxl 32) 안쪽 겹 — 바깥 라운딩 - 안쪽 여백(같은 중심)
    borderRadius: Radius['radius-xxl'] - CARD_INSET,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  brand: {flexDirection: 'row', alignItems: 'center', gap: 6},
  brandFrom: {...Typography.body.medium, color: 'rgba(255,255,255,0.72)'},
  photo: {
    width: PHOTO,
    height: PHOTO,
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallback: {...Typography.title.medium, color: '#1f1f1f', textAlign: 'center', paddingHorizontal: Spacing.md},
  info: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, maxWidth: CARD_W - Spacing.lg * 2},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    paddingHorizontal: Spacing.smd,
    height: 36,
    borderRadius: Radius['radius-md'],
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillText: {...Typography.body['medium - semibold'], color: '#fff', flexShrink: 1},
  by: {...Typography.body.medium, color: 'rgba(255,255,255,0.72)'},
  actions: {flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg},
  action: {alignItems: 'center', gap: Spacing.xs},
  actionImageTouch: {width: ACTION_SIZE, height: ACTION_SIZE, alignItems: 'center', justifyContent: 'center'},
  actionImage: {width: ACTION_SIZE, height: ACTION_SIZE, borderRadius: ACTION_SIZE / 2},
  actionLabel: {...Typography.caption.medium, color: colors['foreground/on-surface-muted']},
});
