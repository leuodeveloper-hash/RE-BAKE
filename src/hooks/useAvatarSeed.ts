import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RANDOM_AVATARS} from '@components/Avatar/avatars';

const STORAGE_KEY = '@bakecycle_avatar_seed';

/**
 * 랜덤 아바타 시드를 AsyncStorage에 한 번 저장 후 고정.
 * 앱 재시작해도 같은 아바타를 표시합니다.
 */
export function useAvatarSeed(): number | null {
  const [seed, setSeed] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setSeed(Number(stored));
          return;
        }
        // 처음: 랜덤 인덱스 생성 후 저장
        const newSeed = Math.floor(Math.random() * RANDOM_AVATARS.length);
        await AsyncStorage.setItem(STORAGE_KEY, String(newSeed));
        setSeed(newSeed);
      } catch {
        setSeed(0);
      }
    })();
  }, []);

  return seed;
}
