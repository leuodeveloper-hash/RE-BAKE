import {Platform, Share} from 'react-native';
import {doc, setDoc, serverTimestamp} from 'firebase/firestore';
import {db, auth} from '@config/firebase';
import {getCookbookShareUrl} from '@config/share';
import {translate, deviceLanguage} from '../i18n';
import type {Recipe} from '../types/recipe';

const t = (key: string, params?: Record<string, string | number>) =>
  translate(deviceLanguage(), key, params);

/** 공유 URL을 OS 공유 시트/클립보드로 내보낸다 (shareRecipe와 동일 정책). */
async function shareUrl(url: string, subject: string, onCopied?: () => void, onError?: (m: string) => void): Promise<void> {
  const message = `${subject}\n${url}`;
  if (Platform.OS === 'web') {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try { await nav.share({title: subject, text: subject, url}); return; }
      catch (e: any) { if (e?.name === 'AbortError') return; }
    }
    try {
      if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(url); onCopied?.(); return; }
    } catch {/* fall through */}
    onError?.(t('shareRecipe.shareFailed'));
    return;
  }
  try {
    await Share.share({
      title: subject,
      message: Platform.OS === 'ios' ? subject : message,
      url: Platform.OS === 'ios' ? url : undefined,
    });
  } catch {
    onError?.(t('shareRecipe.shareFailed'));
  }
}

/** shareId 생성 — URL-safe 랜덤 10자 */
function makeShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export interface ShareOfficialCookbookArgs {
  name: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
}

/** 공식 북 공유 — 이름 기반 URL을 바로 공유 (Firestore에 이미 있음). */
export async function shareOfficialCookbook({name, onCopied, onError}: ShareOfficialCookbookArgs): Promise<void> {
  const url = getCookbookShareUrl('o', name);
  await shareUrl(url, t('shareRecipe.cookbookWithTitle', {title: name}), onCopied, onError);
}

export interface SharePersonalCookbookArgs {
  name: string;
  recipes: Recipe[];
  authorId?: string;
  authorName?: string;
  /** 재공유 시 기존 shareId 재사용(링크 안정). 없으면 새로 생성 */
  existingShareId?: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
}

/**
 * 개인 북 공유 — 공유 시점의 레시피들을 `shared_cookbooks/{shareId}`에 스냅샷 업로드 후 링크 공유.
 * (이미지는 로그인 사용자 레시피면 이미 원격 URL이므로 그대로 담김.)
 * @returns 사용된 shareId (재공유 시 저장해두면 링크 유지)
 */
export async function sharePersonalCookbook({
  name, recipes, authorId, authorName, existingShareId, onCopied, onError,
}: SharePersonalCookbookArgs): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) { onError?.(t('shareRecipe.shareFailed')); return null; }

  const shareId = existingShareId ?? makeShareId();
  try {
    await setDoc(doc(db, 'shared_cookbooks', shareId), {
      name,
      ownerUid: uid,
      authorId: authorId ?? null,
      authorName: authorName ?? null,
      recipes,
      createdAt: serverTimestamp(),
    });
  } catch {
    onError?.(t('shareRecipe.shareFailed'));
    return null;
  }

  const url = getCookbookShareUrl('s', shareId);
  await shareUrl(url, t('shareRecipe.cookbookWithTitle', {title: name}), onCopied, onError);
  return shareId;
}
