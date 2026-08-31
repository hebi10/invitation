import React from 'react';
import type { InvitationThemeKey } from '@/lib/invitationThemes';

import styles from './WeddingClosing.module.css';

export interface WeddingClosingProps {
  groomName: string;
  brideName: string;
  theme: InvitationThemeKey;
  className?: string;
}

export function WeddingClosing({
  groomName,
  brideName,
  theme,
  className,
}: WeddingClosingProps) {
  const closingClassName = [styles.closing, className].filter(Boolean).join(' ');

  return (
    <footer
      className={closingClassName}
      data-wedding-closing
      data-theme={theme}
      aria-label={`${groomName}과 ${brideName}의 결혼식 초대 마무리`}
    >
      <p>{groomName} · {brideName}</p>
      <span aria-hidden="true" />
      <p>귀한 걸음과 따뜻한 마음에 감사드립니다</p>
    </footer>
  );
}
