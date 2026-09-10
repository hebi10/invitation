'use client';

import { useEffect, type RefObject } from 'react';
import type { InvitationThemeKey } from '@/lib/invitationThemes';

/** Decorative motion never gates rendering, page scrolling, or interactive sections. */
export function useWeddingMotion(root: RefObject<HTMLElement | null>, theme: InvitationThemeKey) {
  useEffect(() => {
    const element = root.current;
    if (!element || !['romantic', 'emotional'].includes(theme)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let generation = 0;
    let observer: IntersectionObserver | undefined;
    let context: { revert: () => void } | undefined;

    const setup = async () => {
      const currentGeneration = ++generation;
      observer?.disconnect();
      context?.revert();
      if (preference.matches) return;
      try {
        const { gsap } = await import('gsap');
        if (disposed || preference.matches || generation !== currentGeneration) return;
        context = gsap.context((scope) => {
          const photos = element.querySelectorAll('[data-wedding-motion="photo"]');
          const copy = element.querySelectorAll('[data-wedding-motion="copy"]');
          if (photos.length) gsap.fromTo(photos, { scale: theme === 'romantic' ? 1.025 : 1.01 }, {
            scale: 1, duration: 1.4, ease: 'power2.out', clearProps: 'transform',
          });
          if (copy.length) gsap.fromTo(copy, { y: 10, opacity: .8 }, {
            y: 0, opacity: 1, duration: .9, stagger: .12, ease: 'power2.out', clearProps: 'transform,opacity',
          });
          // Only text is animated: transforming an ancestor would contain fixed dialogs.
          scope.add('reveal', (target: Element) => {
            gsap.fromTo(target, { y: theme === 'emotional' ? 12 : 8, opacity: .85 }, {
              y: 0, opacity: 1, duration: .8, ease: 'power2.out', clearProps: 'transform,opacity',
            });
          });
          if (typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver((entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                scope.reveal(entry.target);
                observer?.unobserve(entry.target);
              }
            }, { threshold: .2 });
            element.querySelectorAll('[data-wedding-motion="passage"]').forEach((target) => observer?.observe(target));
          }
        }, element);
      } catch {
        // The complete invitation remains visible when an optional motion chunk fails.
      }
    };
    void setup();
    const onPreferenceChange = () => { void setup(); };
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      disposed = true;
      generation++;
      observer?.disconnect();
      context?.revert();
      preference.removeEventListener('change', onPreferenceChange);
    };
  }, [root, theme]);
}
