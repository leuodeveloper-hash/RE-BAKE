import {Platform, Share} from 'react-native';
import {getRecipeShareUrl} from '@config/share';

export interface ShareRecipeArgs {
  id: string;
  title?: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
}

export async function shareRecipe({id, title, onCopied, onError}: ShareRecipeArgs): Promise<void> {
  const url = getRecipeShareUrl(id);
  const subject = title ? `'${title}' 레시피` : '레시피';
  const message = `${subject}\n${url}`;

  if (Platform.OS === 'web') {
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({title: subject, text: subject, url});
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        onCopied?.();
        return;
      }
    } catch {/* fall through */}
    onError?.('공유에 실패했습니다');
    return;
  }

  try {
    await Share.share({
      title: subject,
      message: Platform.OS === 'ios' ? subject : message,
      url: Platform.OS === 'ios' ? url : undefined,
    });
  } catch {
    onError?.('공유에 실패했습니다');
  }
}
