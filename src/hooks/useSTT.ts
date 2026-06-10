import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface STTHook {
  supported: boolean;
  recording: boolean;
  start: (onResult: (text: string) => void) => void;
  stop: () => void;
}

/** 네이티브 STT — expo-speech-recognition 기반 (iOS/Android). */
export function useSTT(): STTHook {
  const [recording, setRecording] = useState(false);
  const onResultRef = useRef<((text: string) => void) | null>(null);

  useSpeechRecognitionEvent('result', e => {
    const text = e.results?.[0]?.transcript ?? '';
    if (text && onResultRef.current) onResultRef.current(text);
  });
  useSpeechRecognitionEvent('end', () => setRecording(false));
  useSpeechRecognitionEvent('error', () => setRecording(false));

  const start = useCallback(async (onResult: (text: string) => void) => {
    onResultRef.current = onResult;
    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) return;
      ExpoSpeechRecognitionModule.start({
        lang: 'ko-KR',
        interimResults: false,
        maxAlternatives: 1,
        continuous: false,
      });
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    setRecording(false);
  }, []);

  useEffect(
    () => () => {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {}
    },
    [],
  );

  return {supported: true, recording, start, stop};
}
