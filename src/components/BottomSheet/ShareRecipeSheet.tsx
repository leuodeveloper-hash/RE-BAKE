import React, {useRef} from 'react';
import {Platform, Pressable, Share, StyleSheet, Text, View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {Dialog} from '@components/Dialog/Dialog';
import {Avatar} from '@components/Avatar';
import {AppIcon} from '@components/Icon/AppIcon';
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
  const url = getRecipeShareUrl(recipe.id);

  // 카드를 이미지로 — 앱은 react-native-view-shot, 웹은 같은 라이브러리의 웹 경로
  const capture = async (): Promise<string | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {captureRef} = require('react-native-view-shot');
      return await captureRef(cardRef, {format: 'png', quality: 1, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile'});
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

  const actions = [
    ...(linkable ? [{key: 'link', icon: IconLink, label: t('shareCard.copyLink'), onPress: copyLink}] : []),
    {key: 'save', icon: IconArrowDownToLine, label: t('shareCard.saveImage'), onPress: saveImage},
    // 인스타 스토리 — 카드 이미지를 기기 공유 창으로(인스타그램 → 스토리). 바로 스토리로 여는 건 인스타 전용 연동이 필요하다
    {key: 'share', icon: IconShare, label: t('shareCard.share'), onPress: shareCard},
  ];

  return (
    <Dialog visible={visible} onClose={onClose} showCloseButton={false}>
      <View style={styles.wrap}>
        {/* 공유 카드 — 이 모양 그대로 이미지가 된다 */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
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
            <Pressable key={a.key} style={styles.action} onPress={a.onPress}>
              <View style={[styles.actionCircle, {borderColor: colors['border/normal']}]}>
                <AppIcon icon={a.icon} size="sm" color={colors['foreground/on-surface']} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
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
    backgroundColor: '#1f1f1f',
    borderRadius: Radius['radius-xl'],
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
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {...Typography.caption.medium, color: colors['foreground/on-surface-muted']},
});
