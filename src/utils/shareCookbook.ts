import {Platform, Share} from 'react-native';
import {doc, setDoc, arrayUnion, arrayRemove} from 'firebase/firestore';
import {db, auth} from '@config/firebase';
import {getOfficialCookbookShareUrl, getPersonalCookbookShareUrl} from '@config/share';
import {translate, deviceLanguage} from '../i18n';

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

export interface ShareOfficialCookbookArgs {
  name: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
}

/** 공식 북 공유 — 이름 기반 URL을 바로 공유 (Firestore에 이미 있음). */
export async function shareOfficialCookbook({name, onCopied, onError}: ShareOfficialCookbookArgs): Promise<void> {
  const url = getOfficialCookbookShareUrl(name);
  await shareUrl(url, t('shareRecipe.cookbookWithTitle', {title: name}), onCopied, onError);
}

export interface SharePersonalCookbookArgs {
  name: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
}

/** 개인 북 공유 — 공개해 둔 북의 주소를 공유한다 (공개는 setCookbookPublic으로 먼저) */
export async function sharePersonalCookbook({name, onCopied, onError}: SharePersonalCookbookArgs): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) { onError?.(t('shareRecipe.shareFailed')); return; }
  await shareUrl(getPersonalCookbookShareUrl(uid, name), t('shareRecipe.cookbookWithTitle', {title: name}), onCopied, onError);
}

/**
 * 개인 북 공개/해제 — `public_cookbooks/{uid}.names`에 이름을 넣고 뺀다.
 * 규칙이 이 목록을 보고 해당 북 레시피만 누구나 읽게 열어 준다.
 */
export async function setCookbookPublic(name: string, isPublic: boolean): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not signed in');
  await setDoc(
    doc(db, 'public_cookbooks', uid),
    {names: isPublic ? arrayUnion(name) : arrayRemove(name)},
    {merge: true},
  );
}
