import {Platform} from 'react-native';

/** 현재 기기의 사람이 읽을 수 있는 이름을 반환 */
export function getDeviceName(): string {
  if (Platform.OS === 'web') {
    return '웹';
  }
  try {
    const Device = require('expo-device');
    return Device.modelName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Android');
  } catch {
    return Platform.OS === 'ios' ? 'iPhone' : 'Android';
  }
}
