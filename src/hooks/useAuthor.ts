import {useCallback, useEffect, useState} from 'react';
import {doc, getDoc, collection, query, where, getDocs, limit} from 'firebase/firestore';
import {db} from '@config/firebase';
import type {Author} from '../types/author';

function toAuthor(id: string, data: any): Author {
  return {
    id,
    ownerUids: Array.isArray(data.ownerUids) ? data.ownerUids : [],
    handle: data.handle ?? '',
    avatarSeed: data.avatarSeed ?? id,
    bio: data.bio,
  };
}

/** authorId로 작성자 프로필 1건 조회 (작성자 홈 헤더용) */
export function useAuthor(authorId: string | undefined) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(!!authorId);

  useEffect(() => {
    let alive = true;
    if (!authorId) { setAuthor(null); setIsLoading(false); return; }
    setIsLoading(true);
    getDoc(doc(db, 'authors', authorId))
      .then(snap => { if (alive) setAuthor(snap.exists() ? toAuthor(snap.id, snap.data()) : null); })
      .catch(() => { if (alive) setAuthor(null); })
      .finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [authorId]);

  return {author, isLoading};
}

/**
 * 현재 uid가 소유(owner)한 작성자를 찾는다 — 레시피 공유/공식 업로드 시 authorId 결정용.
 * ownerUids array-contains 쿼리. 없으면 null(유저는 최초 공유 시 생성 필요).
 */
export function useMyAuthor(uid: string | undefined) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(!!uid);

  const reload = useCallback(async () => {
    if (!uid) { setAuthor(null); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const q = query(collection(db, 'authors'), where('ownerUids', 'array-contains', uid), limit(1));
      const snap = await getDocs(q);
      const d = snap.docs[0];
      setAuthor(d ? toAuthor(d.id, d.data()) : null);
    } catch {
      setAuthor(null);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);

  return {author, isLoading, reload};
}
