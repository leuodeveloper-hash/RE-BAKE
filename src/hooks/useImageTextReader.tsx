import React, {useCallback, useRef, useState} from 'react';
import {Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {OcrCropModal} from '@components/RecipeOcrButton';
import {RecipeImagePickerSheet} from '@components/BottomSheet/RecipeImagePickerSheet';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import {ensureImagePermission} from '@utils/imagePermission';
import {dismissKeyboardAndWait} from '@utils/keyboard';
import {getPersistentUri} from '@utils/imageUpload';
import {recognizeImageText, normalizeOcrWhitespace} from '@utils/recipeOcr';
import {prepareRecipeImageForCrop, type OcrCropTarget} from '@utils/ocrImageSource';
import {photoSourceMenuItems} from '@utils/photoSourceMenu';
import type {Recipe} from '../types/recipe';

export type ImageTextSource = 'camera' | 'gallery' | 'recipe';

export interface UseImageTextReaderOptions {
  /** 읽은 글 — 영역을 고른 뒤 인식한 텍스트 */
  onText: (text: string) => void;
  /** [레시피 사진]에 보여줄 지금 레시피 사진 — 없으면 메뉴에서 뺀다 */
  recipePhotos?: Pick<Recipe, 'title' | 'imageUri' | 'imageUris'>;
  /** 읽는 중(스켈레톤 등) */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * 사진에서 글 읽기 — [촬영 / 갤러리 / 레시피 사진] → 영역 선택 → 글자 인식.
 * 한번에 쓰기 칸처럼 "읽은 글을 그대로 넣을 곳"이면 이 훅 하나로 끝난다:
 *   const reader = useImageTextReader({onText, recipePhotos});
 *   <Menu items={reader.menuItems} onSelect={reader.start} /> + {reader.element}
 * iOS는 창(Modal)이 떠 있는 동안 다른 창을 못 띄워서, 창이 완전히 내려간 뒤 다음 단계로 넘어간다.
 */
export function useImageTextReader({onText, recipePhotos, onBusyChange}: UseImageTextReaderOptions) {
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();
  const [cropTarget, setCropTarget] = useState<OcrCropTarget | null>(null);
  const [photoSheet, setPhotoSheet] = useState(false);
  const pickedRef = useRef<string | null>(null);
  const croppedRef = useRef<string | null>(null);

  const menuItems = [
    ...photoSourceMenuItems(t),
  ];

  const read = useCallback(async (uri: string) => {
    onBusyChange?.(true);
    try {
      const text = normalizeOcrWhitespace(await recognizeImageText(uri));
      if (!text.trim()) showSnackbar(t('recipeEdit.ocrEmpty'), {tone: 'error'});
      else onText(text);
    } catch {
      showSnackbar(t('recipeEdit.ocrEmpty'), {tone: 'error'});
    } finally {
      onBusyChange?.(false);
    }
  }, [onText, onBusyChange, showSnackbar, t]);

  const start = useCallback(async (source: string) => {
    await dismissKeyboardAndWait();
    if (source === 'recipe') { setPhotoSheet(true); return; }
    const isCamera = source === 'camera';
    const ok = Platform.OS === 'web' ? true : await ensureImagePermission(isCamera ? 'camera' : 'mediaLibrary', {
      deniedMessage: t(isCamera ? 'recipeEdit.cameraPermissionNeeded' : 'recipeEdit.photoPermissionNeeded'),
      showSnackbar,
      settingsTitle: t(isCamera ? 'permission.cameraTitle' : 'permission.photoTitle'),
      settingsBody: t(isCamera ? 'permission.cameraBody' : 'permission.photoBody'),
      settingsConfirmLabel: t('permission.openSettings'),
      settingsCancelLabel: t('permission.cancel'),
    });
    if (!ok) return;
    const opts: ImagePicker.ImagePickerOptions = {mediaTypes: ['images'], quality: 0.9, base64: Platform.OS === 'web'};
    const result = isCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = await getPersistentUri(asset.uri, asset.base64);
    if (asset.width && asset.height) setCropTarget({uri, width: asset.width, height: asset.height});
    else read(uri);
  }, [read, showSnackbar, t]);

  const element = (
    <>
      <RecipeImagePickerSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        fixedRecipe={recipePhotos}
        onPick={uri => { pickedRef.current = uri; setPhotoSheet(false); }}
        onDismissed={() => {
          const uri = pickedRef.current;
          pickedRef.current = null;
          if (!uri) return;
          prepareRecipeImageForCrop(uri).then(setCropTarget).catch(() => read(uri));
        }}
      />
      <OcrCropModal
        visible={!!cropTarget}
        imageUri={cropTarget?.uri ?? null}
        imageWidth={cropTarget?.width ?? 0}
        imageHeight={cropTarget?.height ?? 0}
        onCancel={() => setCropTarget(null)}
        onConfirm={cropped => { croppedRef.current = cropped; setCropTarget(null); }}
        onDismissed={() => {
          const cropped = croppedRef.current;
          croppedRef.current = null;
          if (cropped) read(cropped);
        }}
      />
    </>
  );

  return {menuItems, start, element};
}
