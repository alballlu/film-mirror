import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ConfettiEffect({ trigger }) {
  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#c9a86c', '#8B6F47', '#D4AF37', '#F5CC7F'];
    const timer = window.setTimeout(() => {
      confetti({
        particleCount: 48,
        spread: 64,
        startVelocity: 25,
        gravity: 0.9,
        ticks: 90,
        scalar: 0.72,
        origin: { y: 0.72 },
        colors,
        zIndex: 0,
        disableForReducedMotion: true,
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [trigger]);

  return null;
}
