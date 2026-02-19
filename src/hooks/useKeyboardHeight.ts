import {useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';

/** 키보드 높이를 추적하는 공통 훅 (web에서는 항상 0) */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  return height;
}
