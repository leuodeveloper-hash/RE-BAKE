import {useEffect, useState} from 'react';
import {doc, onSnapshot} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';

/** 내가 공개한 개인 북 이름들 (public_cookbooks/{uid}.names) */
export function usePublicCookbooks(): Set<string> {
  const {user} = useAuth();
  const [names, setNames] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) { setNames(new Set()); return; }
    return onSnapshot(
      doc(db, 'public_cookbooks', user.uid),
      snap => setNames(new Set((snap.data()?.names as string[] | undefined) ?? [])),
      () => setNames(new Set()),
    );
  }, [user]);
  return names;
}
