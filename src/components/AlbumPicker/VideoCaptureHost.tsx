import React, {useEffect, useState} from 'react';
import {Modal, Platform} from 'react-native';
import {VideoFrameCapture} from '@components/VideoFrameCapture';
import {registerVideoCapture, type PickedAsset} from './albumPicker';

/**
 * 웹 — 브라우저 파일 선택에서 영상을 고르면 장면 고르기를 띄운다(앱은 사진첩 화면 안에서 띄운다).
 * 앱 루트에 하나만 붙인다
 */
export function VideoCaptureHost() {
  const [req, setReq] = useState<{uri: string; durationMs: number; resolve: (v: PickedAsset | null) => void} | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    registerVideoCapture((uri, durationMs) => new Promise(resolve => setReq({uri, durationMs, resolve})));
    return () => registerVideoCapture(null);
  }, []);
  if (!req) return null;
  const done = (v: PickedAsset | null) => { req.resolve(v); setReq(null); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => done(null)}>
      <VideoFrameCapture
        uri={req.uri}
        durationMs={req.durationMs}
        onCancel={() => done(null)}
        onCapture={f => done({uri: f.uri, width: f.width, height: f.height, base64: f.base64 ?? null, type: 'image'})}
      />
    </Modal>
  );
}
