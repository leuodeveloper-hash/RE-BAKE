import {useCallback, useEffect, useRef, useState} from 'react';

export interface STTHook {
  supported: boolean;
  recording: boolean;
  start: (onResult: (text: string) => void) => void;
  stop: () => void;
}

/** Web Speech API 기반 STT. Chrome/Safari 등 지원 브라우저에서 동작. */
export function useSTT(): STTHook {
  const supported =
    typeof window !== 'undefined' &&
    (typeof (window as any).SpeechRecognition === 'function' ||
      typeof (window as any).webkitSpeechRecognition === 'function');

  const recognitionRef = useRef<any>(null);
  const [recording, setRecording] = useState(false);

  const start = useCallback(
    (onResult: (text: string) => void) => {
      if (!supported) return;
      const Ctor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new Ctor();
      rec.lang = 'ko-KR';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event: any) => {
        const text: string = event.results?.[0]?.[0]?.transcript ?? '';
        if (text) onResult(text);
      };
      rec.onend = () => setRecording(false);
      rec.onerror = () => setRecording(false);
      recognitionRef.current = rec;
      setRecording(true);
      try {
        rec.start();
      } catch {
        setRecording(false);
      }
    },
    [supported],
  );

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setRecording(false);
  }, []);

  useEffect(
    () => () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {}
      }
    },
    [],
  );

  return {supported, recording, start, stop};
}
