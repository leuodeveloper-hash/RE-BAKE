import React, {useEffect, useRef, useState} from 'react';
import {Canvas, RoundedRect, SweepGradient, Blur, vec} from '@shopify/react-native-skia';
import {BaseColors} from '@constants/tokens';

const BLUR_SIGMA = 18;
const SPREAD = BLUR_SIGMA * 2;
const Y_OFFSET = 16; // 그림자 y 오프셋 — .web.tsx 버전도 동일 적용
const ROTATION_DURATION = 2000; // 4초/회전 — .web.tsx 버전도 동일 적용

export interface GradientGlowProps {
  width: number;
  height: number;
  borderRadius: number;
}

export function GradientGlow({width, height, borderRadius}: GradientGlowProps) {
  const [angle, setAngle] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    let raf: number;
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      setAngle((elapsed / ROTATION_DURATION) * 360 % 360);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Canvas
      style={{
        position: 'absolute',
        top: -SPREAD + Y_OFFSET,
        left: -SPREAD,
        width: width + SPREAD * 1.1,
        height: height + SPREAD * 1.1,
      }}
    >
      <RoundedRect
        x={SPREAD}
        y={SPREAD}
        width={width}
        height={height}
        r={borderRadius}
      >
        <SweepGradient
          c={vec(SPREAD + width / 2, SPREAD + height / 2)}
          colors={[
            BaseColors['color-base-yellow-30'],
            BaseColors['color-base-lime-30'],
            BaseColors['color-base-green-30'],
            BaseColors['color-base-lime-30'],
            BaseColors['color-base-yellow-30'],
          ]}
          start={90 + angle}
          end={450 + angle}
        />
        <Blur blur={BLUR_SIGMA} />
      </RoundedRect>
    </Canvas>
  );
}
