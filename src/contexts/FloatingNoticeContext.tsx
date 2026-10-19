import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {FloatingNotice, type FloatingNoticeItem} from '@components/FloatingNotice';

/**
 * 화면 아래 떠 있는 알림(새 버전·레시피 업데이트됨 등)을 한 자리에서 띄운다.
 * 화면마다 따로 그리면 겹친다 — 여기에 등록하면 가운데에 나란히 놓인다. 누를 때까지 남는다.
 */
interface Ctx {
  set: (id: string, item: FloatingNoticeItem | null) => void;
}
const FloatingNoticeContext = createContext<Ctx | null>(null);

export function FloatingNoticeProvider({children}: {children: React.ReactNode}) {
  const [items, setItems] = useState<Record<string, FloatingNoticeItem>>({});
  const value = useMemo<Ctx>(() => ({
    set: (id, item) => setItems(prev => {
      if (!item) { if (!(id in prev)) return prev; const {[id]: _, ...rest} = prev; return rest; }
      return {...prev, [id]: item};
    }),
  }), []);
  return (
    <FloatingNoticeContext.Provider value={value}>
      {children}
      <FloatingNotice items={Object.values(items)} />
    </FloatingNoticeContext.Provider>
  );
}

/** 이 화면의 떠 있는 알림 — null이면 내린다. 화면이 닫히면 저절로 내린다 */
export function useFloatingNotice(id: string, item: FloatingNoticeItem | null) {
  const ctx = useContext(FloatingNoticeContext);
  const set = ctx?.set;
  // onPress는 늘 최신 것을 부른다 — 내용(라벨·처리 중)이 바뀔 때만 다시 등록
  const latest = useRef(item);
  latest.current = item;
  const key = item ? `${item.label}|${item.loading ? 1 : 0}` : '';
  useEffect(() => {
    set?.(id, item ? {...item, onPress: () => latest.current?.onPress()} : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, id, key]);
  useEffect(() => () => set?.(id, null), [set, id]);
}
