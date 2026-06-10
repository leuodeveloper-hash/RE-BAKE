import {Platform} from 'react-native';

type Style = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function triggerHaptic(style: Style = 'light'): void {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    switch (style) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
    }
  } catch {
    // expo-haptics 미설치 또는 미지원 — 무시
  }
}
