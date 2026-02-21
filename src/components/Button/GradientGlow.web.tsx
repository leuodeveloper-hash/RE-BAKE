import React, {useEffect, useRef} from 'react';
import {BaseColors} from '@constants/tokens';

export interface GradientGlowProps {
  width: number;
  height: number;
  borderRadius: number;
}

const BLUR_PX = 18;
const Y_OFFSET = 16; // 그림자 y 오프셋 — native 버전도 동일 적용
const ROTATION_DURATION = 2000; // 4초/회전 — native 버전도 동일 적용

function makeGradient(angle: number) {
  return `conic-gradient(from ${angle}deg at 50% 50%, ${BaseColors['color-base-yellow-30']} 0deg, ${BaseColors['color-base-lime-30']} 84.8deg, ${BaseColors['color-base-green-30']} 188.6deg, ${BaseColors['color-base-lime-30']} 278.6deg, ${BaseColors['color-base-yellow-30']} 353deg)`;
}

export function GradientGlow({width, height, borderRadius}: GradientGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = Date.now();
    let raf: number;
    const animate = () => {
      const angle = 90 + ((Date.now() - start) / ROTATION_DURATION) * 360 % 360;
      el.style.background = makeGradient(angle);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: -BLUR_PX + Y_OFFSET,
        left: -BLUR_PX,
        width: width + BLUR_PX,
        height: height + BLUR_PX,
        borderRadius,
        background: makeGradient(90),
        filter: `blur(${BLUR_PX}px)`,
      }}
    />
  );
}
