import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ConfettiEffect({ trigger }) {
  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#c9a86c', '#8B6F47', '#D4AF37', '#F5CC7F'];
    const timer = window.setTimeout(() => {
      const sharedOptions = {
        particleCount: 22,
        spread: 46,
        startVelocity: 28,
        gravity: 0.9,
        ticks: 82,
        scalar: 0.68,
        colors,
        zIndex: 1100,
        disableForReducedMotion: true,
      };

      confetti({
        ...sharedOptions,
        angle: 55,
        origin: { x: 0.04, y: 0.28 },
      });
      confetti({
        ...sharedOptions,
        angle: 125,
        origin: { x: 0.96, y: 0.28 },
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [trigger]);

  return null;
}
