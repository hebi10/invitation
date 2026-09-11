'use client';

import { useEffect, type RefObject } from 'react';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import styles from './WeddingMotion.module.css';

/** Body motion stays lightweight; GSAP is loaded only by the optional intro. */
export function useWeddingMotion(root: RefObject<HTMLElement | null>, theme: InvitationThemeKey) {
  useEffect(() => {
    const element = root.current;
    if (!element || !['romantic', 'emotional'].includes(theme)) return;
    element.classList.add(styles.motion);
    return () => { element.classList.remove(styles.motion); };
  }, [root, theme]);
}
