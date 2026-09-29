import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {db} from '@config/firebase';

/** 의견 종류 — 분류가 있으면 어드민이 먼저 볼 것을 고를 수 있다 */
export type FeedbackKind = 'amount' | 'step' | 'typo' | 'etc';

export interface RecipeFeedbackInput {
  recipeId: string;
  recipeTitle: string;
  kind: FeedbackKind;
  message: string;
  /** 보낸 사람 — 로그인 상태일 때만. 되묻을 일이 있을 때 쓴다 */
  uid?: string;
  handle?: string;
}

/**
 * 레시피 의견을 Firestore에 남긴다.
 *
 * 메일로 보내면 앱을 벗어나야 하고 받는 쪽 메일함이 의견으로 쌓인다.
 * submissions(둘러보기 공개 신청)와 같은 흐름 — 유저가 남기고 어드민이 본다.
 */
export async function sendRecipeFeedback(input: RecipeFeedbackInput): Promise<void> {
  await addDoc(collection(db, 'recipe_feedback'), {
    ...input,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}
