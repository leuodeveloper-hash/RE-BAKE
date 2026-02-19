import {useEffect, useState} from 'react';
import NetInfo from '@react-native-community/netinfo';

/** 네트워크 연결 상태를 반환하는 훅 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
