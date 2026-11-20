// <SignInScene name="vehicle" />: a product's sign-in illustration. The animations stop (frozen at
// their first frame) when the viewer asks for reduced motion, and follow that setting live.
import { useEffect, useMemo, useRef } from 'react';
import { sceneMarkup } from './scenes.js';

const REDUCE = '(prefers-reduced-motion: reduce)';

export function SignInScene({ name, className }: { name?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const markup = useMemo(() => (name ? sceneMarkup(name) : ''), [name]);

  useEffect(() => {
    const svg = ref.current?.querySelector('svg');
    if (!svg || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(REDUCE);
    const apply = () => {
      if (mq.matches) {
        svg.pauseAnimations();
        svg.setCurrentTime(0);
      } else svg.unpauseAnimations();
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [markup]);

  if (!markup) return null;
  return (
    <div
      ref={ref}
      className={['ill-scene', className].filter(Boolean).join(' ')}
      data-scene={name}
      // Our own static markup (no user input), ported from the legacy prototype.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
