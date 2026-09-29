import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {Platform} from 'react-native';
import {db} from '@config/firebase';

/** 문의 종류 — 어디서 보냈는지에 따라 먼저 볼 것이 갈린다 */
export type InquiryKind = 'recipeLimit' | 'bug' | 'etc';

export interface AppInquiryInput {
  kind: InquiryKind;
  message: string;
  uid?: string;
  handle?: string;
  /** 답을 받을 주소 — 보낸 사람이 직접 적는다(선택) */
  replyTo?: string;
}

/**
 * 앱 문의를 남긴다.
 *
 * mailto:를 쓰면 받는 주소가 앱 번들에 박혀 그대로 노출된다.
 * 사용자는 Firestore에 남기고, 주소를 아는 서버가 대신 메일로 보낸다.
 */
export async function sendAppInquiry(input: AppInquiryInput): Promise<void> {
  await addDoc(collection(db, 'app_inquiries'), {
    ...input,
    platform: Platform.OS,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}
